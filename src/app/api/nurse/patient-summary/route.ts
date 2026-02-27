import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const authResult = await apiRequireRole(['ENFERMERA', 'ENFERMERO', 'MEDICO']);
    if (authResult.response) return authResult.response;

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId');
    const isUnreg = url.searchParams.get('isUnreg') === 'true';

    if (!patientId) {
      return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });
    }

    // 1. Obtener Datos Personales
    let patientData: any = null;
    if (isUnreg) {
      const { data, error } = await supabaseAdmin.from('unregisteredpatients').select('*').eq('id', patientId).single();
      if (error) console.error('[PatientSummaryAPI] Error al obtener unregisteredpatient:', error);
      if (data) {
        patientData = {
          name: `${data.first_name} ${data.last_name}`,
          identification: data.identification || 'N/D',
          type: 'Paciente Autónomo/No Registrado',
          phone: data.phone || 'N/D',
          blood_type: data.blood_type || 'N/D',
          allergies: data.allergies || 'Ninguna conocida',
          created_at: data.created_at
        };
      }
    } else {
      const { data, error } = await supabaseAdmin.from('patient').select('*').eq('id', patientId).single();
      if (error) console.error('[PatientSummaryAPI] Error al obtener patient:', error);
      if (data) {
        patientData = {
          name: `${data.firstName} ${data.lastName}`,
          identification: data.identifier || 'N/D',
          type: 'Paciente Clínico (Registrado)',
          phone: data.phone || 'N/D',
          blood_type: data.blood_type || 'N/D',
          allergies: data.allergies || 'Ninguna conocida',
          created_at: data.created_at
        };
      }
    }

    if (!patientData) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // 2. Obtener Historial de Atenciones (desde la cola general)
    const { data: rawHistory } = await supabaseAdmin
      .from('nurse_daily_dashboard')
      .select('queue_date, arrival_time, status, chief_complaint, nurse_notes, doctor_name, vital_signs_taken')
      .eq(isUnreg ? 'unregistered_patient_id' : 'patient_id', patientId)
      .order('queue_date', { ascending: false })
      .order('arrival_time', { ascending: false })
      .limit(30);

    // Filtrar atenciones reales (que tengan notas, o signos vitales, o que hayan sido completadas/transferidas)
    // y deduplicar para dejar solo una por día (la más reciente/completa)
    const historyMap = new Map<string, any>();
    if (rawHistory) {
      rawHistory.forEach(h => {
        const hasInteraction = h.vital_signs_taken || (h.nurse_notes && h.nurse_notes.trim().length > 0) || !['waiting', 'in_progress'].includes(h.status);
        
        if (hasInteraction) {
          // Guardamos solo un resumen por día. Como vienen ordenadas por desc, la primera que veamos es la última del ese día.
          if (!historyMap.has(h.queue_date)) {
            historyMap.set(h.queue_date, h);
          }
        }
      });
    }
    
    const history = Array.from(historyMap.values()).slice(0, 10); // Últimas 10 atenciones reales

    // --- GENERACIÓN DE PDF ---
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Header Corporativo
    doc.setFontSize(22);
    doc.setTextColor(0, 128, 128); // Teal
    doc.text('ASHIRA SALUD', margin, y);
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    y += 8;
    doc.text('RESUMEN DE HISTORIAL CLÍNICO', margin, y);
    
    y += 12;
    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, margin, y);
    doc.text(`Generado por: ${user.email}`, margin, y + 5);
    y += 15;

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 190, y);
    y += 10;

    // Información del Paciente
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL PACIENTE', margin, y);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const details = [
      `Nombre Completo: ${patientData.name}`,
      `Identificación: ${patientData.identification}`,
      `Tipo de Registro: ${patientData.type}`,
      `Teléfono de Contacto: ${patientData.phone}`,
      `Tipo de Sangre: ${patientData.blood_type}`,
      `Alergias Registradas: ${patientData.allergies}`
    ];

    details.forEach(detail => {
      doc.text(detail, margin, y);
      y += 6;
    });
    
    y += 5;
    doc.line(margin, y, 190, y);
    y += 10;

    // Historial de Atenciones
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ÚLTIMAS ATENCIONES REGISTRADAS', margin, y);
    y += 10;

    if (!history || history.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('No se encontraron registros de atención para este paciente.', margin, y);
    } else {
      history.forEach((h: any, idx: number) => {
        // Chequeo de salto de página
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 128, 128);
        doc.text(`Atención ${idx + 1} - Fecha: ${h.queue_date} (${h.arrival_time?.slice(0, 5) || '--'})`, margin, y);
        y += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Motivo principal: ${h.chief_complaint || 'No especificado'}`, margin + 5, y);
        y += 5;
        doc.text(`Estado final: ${h.status}`, margin + 5, y);
        y += 5;

        if (h.doctor_name) {
          doc.text(`Médico Asignado: ${h.doctor_name}`, margin + 5, y);
          y += 5;
        }

        if (h.nurse_notes) {
          // Wrap text si las notas son muy largas
          const splitNotes = doc.splitTextToSize(`Notas Clínicas: ${h.nurse_notes}`, 160);
          doc.text(splitNotes, margin + 5, y);
          y += (splitNotes.length * 5); // 5 unidades por línea
        }
        
        y += 6; 
      });
    }

    // Pie de página legal
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento es un resumen informativo. Todos los datos están protegidos por confidencialidad médica.', margin, 285);

    const pdfOutput = doc.output('arraybuffer');
    const safeName = patientData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    return new Response(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Resumen_${safeName}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('[PatientSummaryAPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
