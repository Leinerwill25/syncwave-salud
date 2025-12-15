// src/app/api/patient/advice/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import createSupabaseServerClient from '@/app/adapters/server';

if (!process.env.API_GEMINI) throw new Error('Falta la variable de entorno API_GEMINI');

const genAI = new GoogleGenerativeAI(process.env.API_GEMINI);
const MODEL_NAME = 'gemini-2.0-flash-exp';

/* ----------------- Helpers ----------------- */

function isThenable<T = string>(v: unknown): v is Promise<T> {
	return v !== null && (typeof v === 'object' || typeof v === 'function') && typeof (v as any).then === 'function';
}

function extractText(result: any): string | Promise<string> {
	try {
		if (result == null) return '';
		if (result?.response && typeof result.response.text === 'function') {
			return result.response.text();
		}
		const out = result?.output ?? result?.outputs ?? result?.candidates ?? null;
		if (Array.isArray(out) && out.length > 0) {
			const first = out[0];
			if (first?.content && Array.isArray(first.content) && first.content[0]?.text) return first.content[0].text;
			if (first?.text) return first.text;
			if (first?.output_text) return first.output_text;
			if (typeof first === 'string') return first;
		}
		if (typeof result?.text === 'string') return result.text;
		if (typeof result?.reply === 'string') return result.reply;
		if (typeof result?.data === 'string') return result.data;
		if (Array.isArray(result) && typeof result[0] === 'string') return result[0];
		return JSON.stringify(result);
	} catch (err) {
		return JSON.stringify({ error: 'failed to extract text', raw: result });
	}
}

/** Extrae segundos de retry de mensajes tipo "Please retry in 37.511104361s." */
function extractRetrySeconds(err: any): number | null {
	try {
		const msg = String(err?.message ?? err ?? '');
		// busca "Please retry in 37.511104361s" o "retryDelay":"37s"
		let m = msg.match(/Please retry in\s*([0-9]+(?:\.[0-9]+)?)s/i);
		if (m) return Number(m[1]);
		m = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
		if (m) return Number(m[1]);
		// google rpc RetryInfo sometimes appears as "retryDelay":"37s" in details; as fallback busca "(\d+)s" con "retry" cercano
		m = msg.match(/retry.*?([0-9]+)s/i);
		if (m) return Number(m[1]);
		return null;
	} catch {
		return null;
	}
}

/* ----------------- Generación robusta (intenta múltiples firmas) ----------------- */

async function generateContentSafe(modelInstance: any, prompt: string) {
	if (!modelInstance) throw new Error('generateContentSafe: modelInstance es falsy');

	const attempts: Array<{ name: string; call: () => Promise<any> }> = [
		{
			name: 'generateContent({ input: prompt })',
			call: async () => (typeof modelInstance.generateContent === 'function' ? await modelInstance.generateContent({ input: prompt }) : Promise.reject(new Error('no method'))),
		},
		{
			name: 'generateContent({ input: { text } })',
			call: async () => (typeof modelInstance.generateContent === 'function' ? await modelInstance.generateContent({ input: { text: prompt } }) : Promise.reject(new Error('no method'))),
		},
		{
			name: 'generateContent(prompt)',
			call: async () => (typeof modelInstance.generateContent === 'function' ? await modelInstance.generateContent(prompt) : Promise.reject(new Error('no method'))),
		},
		{
			name: 'generate({ input: prompt })',
			call: async () => (typeof modelInstance.generate === 'function' ? await modelInstance.generate({ input: prompt }) : Promise.reject(new Error('no method'))),
		},
		{
			name: 'chat({ messages: [...] })',
			call: async () => (typeof modelInstance.chat === 'function' ? await modelInstance.chat({ messages: [{ role: 'user', content: prompt }] }) : Promise.reject(new Error('no method'))),
		},
		{
			name: 'predict(prompt)',
			call: async () => (typeof modelInstance.predict === 'function' ? await modelInstance.predict(prompt) : Promise.reject(new Error('no method'))),
		},
		{
			name: 'generateText(prompt) / create({ text })',
			call: async () => {
				if (typeof modelInstance.generateText === 'function') return await modelInstance.generateText(prompt);
				if (typeof modelInstance.create === 'function') return await modelInstance.create({ text: prompt });
				return Promise.reject(new Error('no method'));
			},
		},
	];

	const errors: Array<{ name: string; error: any }> = [];

	for (const attempt of attempts) {
		try {
			const res = await attempt.call();
			console.log(`[ADVICE_API] generateContentSafe success with ${attempt.name}`);
			return res;
		} catch (err) {
			// Si es un 429/Quota -> rethrow para manejarlo arriba con retry info
			const retrySec = extractRetrySeconds(err);
			if (retrySec !== null) {
				const enriched = new Error(`Quota/Rate limit detected. retryAfter=${retrySec}s — original: ${(err && (err as any).message) || err}`);
				(enriched as any).retryAfter = retrySec;
				throw enriched;
			}
			errors.push({ name: attempt.name, error: (err && (err as any).message) || err });
		}
	}

	const availableKeys = modelInstance && typeof modelInstance === 'object' ? Object.keys(modelInstance) : [];
	const msg = ['No hay método de generación compatible en la instancia del modelo.', 'Intentados métodos:', errors.map((e) => `- ${e.name}: ${(e.error ?? '').toString()}`).join('\n'), `Model instance type: ${typeof modelInstance}`, `Model instance keys: ${availableKeys.join(', ') || '(ninguno)'}`].join('\n');

	console.error('[ADVICE_API] generateContentSafe failure:', msg);
	throw new Error(msg);
}

/* ----------------- Supabase DB helpers (ajustados al schema) ----------------- */

/**
 * Guardar mensaje en la tabla public.ai_conversation.messages (jsonb array).
 * Si la conversación no existe, la crea con id = conversationId.
 * Cada mensaje es un objeto { id, role, content, ai_response, created_at }.
 */
async function saveMessageRow(params: { conversationId: string; patientId: string; role: 'user' | 'assistant' | 'system'; content: string; ai_response?: any }, supabase: any) {
	const id = crypto.randomUUID();
	const { conversationId, patientId, role, content, ai_response } = params;
	const timestamp = new Date().toISOString();
	const messageObj: any = {
		id,
		role,
		content,
		ai_response: ai_response ?? null,
		created_at: timestamp,
	};

	try {
		// intenta leer la conversación existente
		const sel = await supabase.from('ai_conversation').select('messages').eq('id', conversationId).maybeSingle();
		if (!sel?.error && sel?.data) {
			const existing = Array.isArray(sel.data.messages) ? sel.data.messages : [];
			const updated = [...existing, messageObj];
			const upd = await supabase.from('ai_conversation').update({ messages: updated, updated_at: timestamp }).eq('id', conversationId);
			if (upd?.error) {
				console.warn('[ADVICE_API] saveMessageRow update error', upd.error);
			}
		} else {
			// crear nueva conversación (id = conversationId)
			const ins = await supabase.from('ai_conversation').insert({ id: conversationId, patient_id: patientId, messages: [messageObj] });
			if (ins?.error) {
				console.warn('[ADVICE_API] saveMessageRow insert error', ins.error);
			}
		}
	} catch (error) {
		console.warn('[ADVICE_API] saveMessageRow supabase error', error);
		// no lanzar para mantener resiliencia
	}
	return id;
}

/** Leer historial por conversationId (usa ai_conversation.messages) */
async function loadConversationRows(conversationId: string, supabase: any) {
	try {
		const res = await supabase.from('ai_conversation').select('messages').eq('id', conversationId).maybeSingle();
		if (res?.error) {
			console.warn('[ADVICE_API] loadConversationRows supabase error', res.error);
			return [];
		}
		const msgs = Array.isArray(res.data?.messages) ? res.data.messages : [];
		// normaliza a [{ role, content, created_at }]
		return msgs.map((m: any) => ({
			role: m?.role ?? 'user',
			content: typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content ?? ''),
			created_at: m?.created_at ?? null,
		}));
	} catch (err) {
		console.warn('[ADVICE_API] loadConversationRows unexpected error', err);
		return [];
	}
}

/** Ejecutar la función SQL find_specialists(specialty, limit) usando RPC (devuelve json) */
async function callFindSpecialists(specialty: string, limit = 5, supabase: any) {
	try {
		const res = await supabase.rpc('find_specialists', { specialty, limit });
		if (res?.error) {
			console.warn('[ADVICE_API] callFindSpecialists rpc error', res.error);
			// fallback: intentar consulta por clinic_profile -> specialties (si existe)
			try {
				const fallback = await supabase.from('clinic_profile').select('*').contains('specialties', [specialty]).limit(limit);
				if (!fallback?.error && Array.isArray(fallback?.data)) return fallback.data;
			} catch (ferr) {
				console.warn('[ADVICE_API] callFindSpecialists fallback error', ferr);
			}
			return [];
		}
		return res?.data ?? [];
	} catch (err) {
		console.warn('[ADVICE_API] callFindSpecialists unexpected error', err);
		return [];
	}
}

/* Construye el System Prompt (aquí puedes editar la personalidad / reglas) */
function buildSystemPrompt({ patientName, age, remainingTurns }: { patientName: string; age: string | number; remainingTurns: number }) {
	return `
Eres ASHIRA AI Health Assistant: un asistente de triaje clínico conversacional.
Objetivo: obtener información suficiente en el menor número de intercambios posibles (ideal < ${remainingTurns} turns restantes)
y ofrecer un resumen final estructurado con hasta 5 posibles causas y el especialista recomendado.
Tono: empático, profesional, conciso, sin frases repetitivas ni plantillas obvias. Evita empezar respuestas con "Entiendo, <nombre>. Lamento mucho que...".
Reglas obligatorias:
1) Haz preguntas específicas y cerradas (sí/no, elección múltiple, ubicación precisa) para acotar el diagnóstico.
2) Prioriza preguntas que reduzcan la incertidumbre más rápidamente (dolor: agudo/crónico, fiebre sí/no, inicio, localización, traumatismo).
3) Si necesitas buscar especialistas en la plataforma, emite exactamente una línea con la directiva:
   CALL_FIND_SPECIALISTS:{"specialty":"<especialidad>", "limit":5}
   (sin otra explicación). El backend ejecutará la búsqueda y te devolverá resultados.
4) Cuando declares 'Resumen final', produce **únicamente** JSON válido (sin texto antes ni después) con este esquema:
{
  "summary": "Texto breve (1-2 frases).",
  "possible_causes": ["Causa 1", "Causa 2", "..."],
  "recommended_specialist": "Especialidad recomendada",
  "next_steps": "Qué hacer ahora (máx 2 acciones concretas).",
  "resources": [ {"clinic": "Nombre", "phone": "...", "doctors": [{"name":"...","email":"...","id":"..."}] } ]
}
5) Si llegas al límite de mensajes sin poder concluir, indica: {"incomplete": true, "reason":"..."} en lugar del JSON final.
6) Mantén cada respuesta (no JSON) en máximo 2-3 frases, preguntas directas y numeradas si necesitas más de una.
Contexto del paciente:
- Nombre: ${patientName}
- Edad aproximada: ${age}
Actúa ahora.
  `.trim();
}

/* ----------------- Endpoint ----------------- */

export async function POST(request: Request) {
	try {
		// --- 1) Autenticación robusta con Supabase ---
		let supabase = await createSupabaseServerClient();
		let user: any = null;

		try {
			const getUserRes = await supabase.auth.getUser();
			if (!getUserRes?.error) user = getUserRes?.data?.user ?? null;
		} catch (err) {
			console.warn('[ADVICE_API] supabase.auth.getUser initial error', err);
		}

		// fallback Authorization header
		if (!user) {
			try {
				const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
				if (authHeader?.toLowerCase().startsWith('bearer ')) {
					const token = authHeader.split(' ')[1];
					if (token) {
						const sessionObj: any = { access_token: String(token), refresh_token: '' };
						await supabase.auth.setSession(sessionObj as any);
						const getUserRes2 = await supabase.auth.getUser();
						if (!getUserRes2?.error) user = getUserRes2?.data?.user ?? null;
					}
				}
			} catch (err) {
				console.warn('[ADVICE_API] fallback auth header error', err);
			}
		}

		// fallback cookie header
		if (!user) {
			const cookieHeader = request.headers.get('cookie') ?? null;
			const parsed: Record<string, string> = {};
			if (cookieHeader) {
				cookieHeader.split(';').forEach((p) => {
					const idx = p.indexOf('=');
					if (idx === -1) return;
					parsed[p.slice(0, idx).trim()] = decodeURIComponent(p.slice(idx + 1).trim());
				});
			}
			const pick = (keys: string[]) => keys.map((k) => parsed[k]).find(Boolean) as string | undefined;
			const access = pick(['sb-access-token', 'sb:access-token', 'sb_access_token']);
			const refresh = pick(['sb-refresh-token', 'sb-refresh-token', 'sb_refresh_token']);
			if (access || refresh) {
				try {
					const sessionObj: any = { access_token: String(access ?? ''), refresh_token: String(refresh ?? '') };
					await supabase.auth.setSession(sessionObj as any);
					const getUserRes3 = await supabase.auth.getUser();
					if (!getUserRes3?.error) user = getUserRes3?.data?.user ?? null;
				} catch (err) {
					console.warn('[ADVICE_API] cookie session set failed', err);
				}
			}
		}

		if (!user) {
			return new NextResponse(JSON.stringify({ error: 'Usuario no autenticado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
		}

		// --- 2) Buscar perfil de paciente (con Supabase) ---
		let patientProfile: any = null;
		try {
			let userRow: any = null;
			try {
				const res = await supabase.from('User').select('patientProfileId').eq('authId', user.id).maybeSingle();
				if (!res?.error && res?.data) userRow = res.data;
			} catch (err) {
				console.warn('[ADVICE_API] reading User table failed (possible schema mismatch)', err);
				userRow = null;
			}

			if (!userRow || !userRow.patientProfileId) {
				try {
					const pAltRes = await supabase.from('Patient').select('*').eq('authId', user.id).maybeSingle();
					if (!pAltRes?.error && pAltRes?.data) {
						patientProfile = pAltRes.data;
					}
				} catch (err) {
					console.warn('[ADVICE_API] fallback patient by authId failed', err);
				}

				if (!patientProfile) {
					return new NextResponse(JSON.stringify({ error: 'Perfil de paciente no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
				}
			} else {
				const patientId = String(userRow.patientProfileId);
				const patientRowRes = await supabase.from('Patient').select('*').eq('id', patientId).maybeSingle();
				if (!patientRowRes || patientRowRes.error || !patientRowRes.data) {
					return new NextResponse(JSON.stringify({ error: 'Perfil de paciente no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
				}
				const patientRow = patientRowRes.data;

				let records: any[] = [];
				try {
					const recRes = await supabase.from('MedicalRecord').select('*').eq('patientId', patientRow.id).order('createdAt', { ascending: false }).limit(5);
					if (!recRes?.error && Array.isArray(recRes?.data)) records = recRes.data;
				} catch (err) {
					console.warn('[ADVICE_API] load medical records error', err);
				}

				let consultations: any[] = [];
				try {
					const consRes = await supabase.from('consultation').select('*').eq('patient_id', patientRow.id).order('created_at', { ascending: false }).limit(5);
					if (!consRes?.error && Array.isArray(consRes?.data)) consultations = consRes.data;
				} catch (err) {
					console.warn('[ADVICE_API] load consultations error', err);
				}

				patientProfile = {
					...patientRow,
					records,
					consultations,
				};
			}
		} catch (err) {
			console.error('[ADVICE_API] Error fetching patient profile from supabase', err);
			return new NextResponse(JSON.stringify({ error: 'Error al buscar perfil de paciente' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
		}

		// --- 3) Leer body ---
		const body = await request.json().catch(() => null);
		const message = body?.message && typeof body.message === 'string' ? String(body.message).trim() : null;
		if (!message) {
			return new NextResponse(JSON.stringify({ error: 'El campo "message" es requerido.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}
		const providedConversationId = body?.conversationId ?? null;
		const conversationId = providedConversationId ?? crypto.randomUUID();

		// --- 4) Persistir mensaje del usuario ---
		await saveMessageRow({ conversationId, patientId: patientProfile.id, role: 'user', content: message }, supabase);

		// --- 5) Cargar historial existente para calcular turns usados y ofrecer contexto al modelo ---
		const historyRows = await loadConversationRows(conversationId, supabase);
		const totalTurns = historyRows.length;
		const remainingTurns = Math.max(1, 10 - totalTurns);

		const conversationText = historyRows
			.map((r: any) => {
				const who = r.role === 'user' ? 'Paciente' : r.role === 'assistant' ? 'Asistente' : 'Sistema';
				return `${who}: ${r.content}`;
			})
			.join('\n');

		const recordsText = (patientProfile.records ?? [])
			.slice(0, 5)
			.map((r: any) => r?.summary ?? r?.note ?? JSON.stringify(r?.content ?? ''))
			.join('\n');

		const patientName = [patientProfile.firstName, patientProfile.lastName].filter(Boolean).join(' ') || 'Paciente';
		const ageGuess = (() => {
			try {
				const dob = (patientProfile as any).dob;
				if (!dob) return 'desconocida';
				const d = new Date(dob);
				if (isNaN(d.getTime())) return 'desconocida';
				const now = new Date();
				let age = now.getFullYear() - d.getFullYear();
				const m = now.getMonth() - d.getMonth();
				if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
				return age >= 0 ? String(age) : 'desconocida';
			} catch {
				return 'desconocida';
			}
		})();

		// --- 6) Construir system prompt y payload para el modelo ---
		const systemPrompt = buildSystemPrompt({ patientName, age: ageGuess, remainingTurns });

		const inputText = [`SYSTEM INSTRUCTIONS:\n${systemPrompt}`, `CONTEXTO PACIENTE:\nNombre: ${patientName}\nEdad: ${ageGuess}\nHistorial relevante (máx 5 registros):\n${recordsText || 'N/A'}`, `HISTORIAL CONVERSACIÓN:\n${conversationText || '(sin historial)'}`, `NUEVO MENSAJE DEL PACIENTE:\n${message}`, `INSTRUCCIONES: Sé breve en las preguntas y apunta a finalizar la evaluación en menos de ${remainingTurns} intercambios.`].join('\n\n');

		// --- 7) Instanciar modelo y generar ---
		let modelInstance: any;
		try {
			modelInstance = genAI.getGenerativeModel({ model: MODEL_NAME });
			try {
				const keys = modelInstance && typeof modelInstance === 'object' ? Object.keys(modelInstance) : [];
				console.log('[ADVICE_API] modelInstance keys:', keys.join(', ') || '(none)');
			} catch (e) {
				/* ignore */
			}
		} catch (err) {
			console.error('[ADVICE_API] Error instanciando el modelo:', err);
			return new NextResponse(JSON.stringify({ error: `No se pudo instanciar el modelo ${MODEL_NAME}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
		}

		let generationResult: any;
		try {
			generationResult = await generateContentSafe(modelInstance, inputText);
		} catch (err: any) {
			console.error('[ADVICE_API] Error generando contenido:', err);
			const retry = extractRetrySeconds(err);
			if (retry !== null || (err && (err as any).retryAfter)) {
				const retryAfter = Math.ceil((err?.retryAfter ?? retry ?? 0) as number);
				return new NextResponse(JSON.stringify({ error: 'Rate limit / Quota excedida', retryAfter }), { status: 429, headers: { 'Content-Type': 'application/json' } });
			}
			return new NextResponse(JSON.stringify({ error: 'Error generando contenido con el modelo seleccionado.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
		}

		// extraer texto
		let assistantReplyRaw: string;
		try {
			const maybe = extractText(generationResult);
			assistantReplyRaw = isThenable(maybe) ? await maybe : String(maybe ?? '');
		} catch (err) {
			console.error('[ADVICE_API] Error extrayendo texto:', err, 'raw:', generationResult);
			assistantReplyRaw = JSON.stringify(generationResult);
		}

		// Guardar respuesta asistente (temporal) en DB
		await saveMessageRow({ conversationId, patientId: patientProfile.id, role: 'assistant', content: assistantReplyRaw, ai_response: generationResult }, supabase);

		// --- 8) Detectar llamada a find_specialists ---
		const callMatch = assistantReplyRaw.match(/CALL_FIND_SPECIALISTS\s*:\s*(\{[\s\S]*\})/i);
		if (callMatch) {
			let parsedDirective: any = null;
			try {
				parsedDirective = JSON.parse(callMatch[1]);
			} catch (err) {
				console.warn('[ADVICE_API] find_specialists directive JSON parse failed', err);
			}

			if (parsedDirective?.specialty) {
				const specialty = String(parsedDirective.specialty);
				const limit = Number(parsedDirective.limit ?? 5);

				const clinics = await callFindSpecialists(specialty, Math.min(limit, 10), supabase);

				const sysContent = `FIND_SPECIALISTS_RESULT: ${JSON.stringify({ specialty, found: clinics?.length ?? 0 })}`;
				await saveMessageRow({ conversationId, patientId: patientProfile.id, role: 'system', content: sysContent }, supabase);

				const followUpPrompt = [`SYSTEM (datos de búsqueda de especialistas):`, `Se encontraron ${Array.isArray(clinics) ? clinics.length : 0} entradas para la especialidad "${specialty}".`, `RESULTS_JSON:\n${JSON.stringify(clinics)}`, `Por favor, genera ahora el resumen final en el formato JSON estricto solicitado anteriormente (sin texto adicional).`].join('\n\n');

				await saveMessageRow({ conversationId, patientId: patientProfile.id, role: 'system', content: `SPECIALISTS_PAYLOAD: ${JSON.stringify(clinics)}` }, supabase);

				let finalGen: any;
				try {
					finalGen = await generateContentSafe(modelInstance, `${systemPrompt}\n\n${followUpPrompt}\n\nHistorial:\n${conversationText}`);
				} catch (err) {
					console.error('[ADVICE_API] Error en segunda generación (final):', err);
					return NextResponse.json({ reply: assistantReplyRaw, conversationId, finished: false }, { status: 200 });
				}

				let finalText: string;
				try {
					const maybe = extractText(finalGen);
					finalText = isThenable(maybe) ? await maybe : String(maybe ?? '');
				} catch (err) {
					finalText = JSON.stringify(finalGen);
				}

				await saveMessageRow({ conversationId, patientId: patientProfile.id, role: 'assistant', content: finalText, ai_response: finalGen }, supabase);

				let parsedJson: any = null;
				try {
					parsedJson = JSON.parse(finalText);
				} catch (e) {
					return NextResponse.json({ reply: finalText, conversationId, finished: false }, { status: 200 });
				}

				return NextResponse.json({ reply: finalText, conversationId, finished: true, json: parsedJson }, { status: 200 });
			}
		}

		// --- 9) Intentar parsear JSON final si no hubo llamada a especialistas ---
		let parsedJson: any = null;
		try {
			parsedJson = JSON.parse(assistantReplyRaw.trim());
			return NextResponse.json({ reply: assistantReplyRaw, conversationId, finished: true, json: parsedJson }, { status: 200 });
		} catch {
			// no es JSON -> simple reply
		}

		// --- 10) Respuesta por defecto (no final) ---
		return NextResponse.json({ reply: assistantReplyRaw, conversationId, finished: false }, { status: 200 });
	} catch (error) {
		console.error('[ADVICE_API] Error inesperado:', error);
		return new NextResponse(JSON.stringify({ error: 'Error interno del servidor' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
