// app/api/medic/pacientes-frecuentes/extract/route.ts
// API para extraer información de pacientes desde archivos Excel y Word

import { NextRequest, NextResponse } from 'next/server';
import { apiRequireRole } from '@/lib/auth-guards';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface ExtractedPatient {
	first_name: string;
	last_name: string;
	identification: string;
	email: string;
	phone?: string;
}

// Función para extraer datos de Excel
function extractFromExcel(buffer: Buffer): ExtractedPatient[] {
	const workbook = XLSX.read(buffer, { type: 'buffer' });
	const patients: ExtractedPatient[] = [];

	// Procesar cada hoja del libro
	workbook.SheetNames.forEach((sheetName) => {
		const worksheet = workbook.Sheets[sheetName];
		const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

		data.forEach((row: any) => {
			// Intentar diferentes variaciones de nombres de columnas
			const firstName =
				row['Nombre'] ||
				row['nombre'] ||
				row['Nombre(s)'] ||
				row['NOMBRE'] ||
				row['First Name'] ||
				row['first_name'] ||
				row['FIRST_NAME'] ||
				row['Primer Nombre'] ||
				'';

			const lastName =
				row['Apellido'] ||
				row['apellido'] ||
				row['Apellido(s)'] ||
				row['APELLIDO'] ||
				row['Last Name'] ||
				row['last_name'] ||
				row['LAST_NAME'] ||
				row['Segundo Nombre'] ||
				'';

			const identification =
				row['Cédula'] ||
				row['cedula'] ||
				row['Cédula de Identidad'] ||
				row['CÉDULA'] ||
				row['CI'] ||
				row['ci'] ||
				row['Identification'] ||
				row['identification'] ||
				row['ID'] ||
				row['id'] ||
				'';

			const email =
				row['Email'] ||
				row['email'] ||
				row['EMAIL'] ||
				row['Correo'] ||
				row['correo'] ||
				row['Correo Electrónico'] ||
				row['E-mail'] ||
				'';

			const phone =
				row['Teléfono'] ||
				row['telefono'] ||
				row['TELÉFONO'] ||
				row['Phone'] ||
				row['phone'] ||
				row['PHONE'] ||
				row['Celular'] ||
				row['celular'] ||
				'';

			// Solo agregar si tiene al menos nombre o apellido
			if (firstName || lastName) {
				patients.push({
					first_name: String(firstName || '').trim(),
					last_name: String(lastName || '').trim(),
					identification: String(identification || '').trim(),
					email: String(email || '').trim(),
					phone: String(phone || '').trim() || undefined,
				});
			}
		});
	});

	return patients;
}

// Función para extraer datos de Word usando expresiones regulares
async function extractFromWord(buffer: Buffer): Promise<ExtractedPatient[]> {
	const result = await mammoth.extractRawText({ buffer });
	const text = result.value;
	const patients: ExtractedPatient[] = [];

	// Patrones para buscar información
	// Buscar líneas que contengan información de pacientes
	const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

	// Intentar extraer información estructurada
	// Patrón común: Nombre Apellido | Cédula: XXXX | Email: xxx@xxx.com
	const patientPatterns = [
		// Patrón 1: Nombre Apellido - Cédula: XXXX - Email: xxx@xxx.com
		/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)[\s\-|]*[Cc]édula[:\s]*([0-9V\-]+)[\s\-|]*[Ee]mail[:\s]*([^\s]+)/gi,
		// Patrón 2: Cédula: XXXX - Nombre Apellido - Email: xxx@xxx.com
		/[Cc]édula[:\s]*([0-9V\-]+)[\s\-|]*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)[\s\-|]*[Ee]mail[:\s]*([^\s]+)/gi,
		// Patrón 3: Nombre, Apellido, Cédula, Email (separados por comas o tabs)
		/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)[,\t]+\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)[,\t]+\s*([0-9V\-]+)[,\t]+\s*([^\s,]+@[^\s,]+)/gi,
	];

	let foundPatients = new Set<string>(); // Para evitar duplicados

	patientPatterns.forEach((pattern) => {
		let match;
		while ((match = pattern.exec(text)) !== null) {
			let firstName = '';
			let lastName = '';
			let identification = '';
			let email = '';

			if (match.length === 5) {
				// Patrón 1 o 2
				if (match[1].match(/^[0-9V\-]+$/)) {
					// Patrón 2: Cédula primero
					identification = match[1];
					firstName = match[2];
					lastName = match[3];
					email = match[4];
				} else {
					// Patrón 1: Nombre primero
					firstName = match[1];
					lastName = match[2];
					identification = match[3];
					email = match[4];
				}
			} else if (match.length === 5) {
				// Patrón 3: separado por comas
				firstName = match[1];
				lastName = match[2];
				identification = match[3];
				email = match[4];
			}

			if (firstName || lastName) {
				const key = `${firstName}-${lastName}-${identification}`;
				if (!foundPatients.has(key)) {
					foundPatients.add(key);
					patients.push({
						first_name: firstName.trim(),
						last_name: lastName.trim(),
						identification: identification.trim(),
						email: email.trim(),
					});
				}
			}
		}
	});

	// Si no se encontraron patrones estructurados, intentar extraer de líneas individuales
	if (patients.length === 0) {
		// Buscar líneas que parezcan contener información de pacientes
		lines.forEach((line) => {
			// Buscar emails en la línea
			const emailMatch = line.match(/([^\s]+@[^\s]+)/);
			if (emailMatch) {
				const email = emailMatch[1];
				// Buscar cédula (formato venezolano común: V-12345678 o 12345678)
				const cedulaMatch = line.match(/(?:[Vv]-?)?([0-9]{6,10})/);
				// Buscar nombres (palabras que empiezan con mayúscula)
				const nameMatches = line.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/g);

				if (nameMatches && nameMatches.length >= 2) {
					const firstName = nameMatches[0];
					const lastName = nameMatches[1];
					const identification = cedulaMatch ? cedulaMatch[1] : '';

					const key = `${firstName}-${lastName}-${identification}`;
					if (!foundPatients.has(key)) {
						foundPatients.add(key);
						patients.push({
							first_name: firstName.trim(),
							last_name: lastName.trim(),
							identification: identification.trim(),
							email: email.trim(),
						});
					}
				}
			}
		});
	}

	return patients;
}

export async function POST(req: NextRequest) {
	try {
		const authResult = await apiRequireRole(['MEDICO']);
		if (authResult.response) return authResult.response;

		const formData = await req.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const fileName = file.name.toLowerCase();
		let patients: ExtractedPatient[] = [];

		// Determinar tipo de archivo y procesar
		if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
			// Procesar Excel
			patients = extractFromExcel(buffer);
		} else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
			// Procesar Word
			patients = await extractFromWord(buffer);
		} else {
			return NextResponse.json({ error: 'Formato de archivo no soportado' }, { status: 400 });
		}

		// Filtrar pacientes vacíos
		patients = patients.filter((p) => p.first_name || p.last_name);

		if (patients.length === 0) {
			return NextResponse.json(
				{ error: 'No se pudo extraer información de pacientes del archivo. Verifica el formato.' },
				{ status: 400 }
			);
		}

		return NextResponse.json({
			success: true,
			patients,
			count: patients.length,
		});
	} catch (error: any) {
		console.error('[Extract Patients API] Error:', error);
		return NextResponse.json({ error: error.message || 'Error al procesar el archivo' }, { status: 500 });
	}
}

