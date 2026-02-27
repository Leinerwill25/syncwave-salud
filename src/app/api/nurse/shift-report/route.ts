import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/app/adapters/server';
import { apiRequireRole } from '@/lib/auth-guards';
import { jsPDF } from 'jspdf';

export async function GET(req: Request) {
  try {
    const authResult = await apiRequireRole(['ENFERMERA', 'ENFERMERO']);
    if (authResult.response) return authResult.response;

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Obtener información del perfil clínica
    const { data: profile } = await supabase
      .from('nurse_profiles')
      .select('nurse_profile_id, organization_id, license_number')
      .eq('user_id', user.userId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de enfermería no encontrado' }, { status: 404 });
    }

    // 1. Obtener atenciones del día
    // NOTA: Usamos nurse_profile_id para la consistencia de datos clínicos
    const { data: queueRecords } = await supabase
      .from('nurse_daily_dashboard')
      .select('*')
      .eq('assigned_nurse_id', profile.nurse_profile_id)
      .eq('queue_date', date);

    // 2. Obtener procedimientos realizados
    const { data: procedures } = await supabase
      .from('nurse_procedures')
      .select('*')
      .eq('nurse_id', profile.nurse_profile_id)
      .gte('completed_at', `${date}T00:00:00.000Z`)
      .lte('completed_at', `${date}T23:59:59.999Z`);

    // 3. Obtener medicamentos administrados (audit_log es más confiable para auditoría, pero MAR es para el reporte)
    const { data: administeredMeds } = await supabase
      .from('nurse_mar_records')
      .select('*')
      .eq('nurse_id', profile.nurse_profile_id)
      .eq('status', 'administered')
      .gte('administered_at', `${date}T00:00:00.000Z`)
      .lte('administered_at', `${date}T23:59:59.999Z`);

    // --- GENERACIÓN DE PDF ---
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 128, 128); // Teal
    doc.text('ASHIRA - REPORTE DE TURNO', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, margin, y);
    y += 15;

    // Nurse Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PROFESIONAL', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Enfermero/a: ${user.email}`, margin, y);
    y += 5;
    doc.text(`Licencia: ${profile.license_number}`, margin, y);
    y += 5;
    doc.text(`Fecha del Reporte: ${date}`, margin, y);
    y += 15;

    // Stats Section
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE ACTIVIDAD', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Pacientes Atendidos: ${queueRecords?.length || 0}`, margin, y);
    y += 5;
    doc.text(`Procedimientos Realizados: ${procedures?.length || 0}`, margin, y);
    y += 5;
    doc.text(`Medicamentos Administrados: ${administeredMeds?.length || 0}`, margin, y);
    y += 15;

    // Tables (Simple version for MVP)
    if (queueRecords && queueRecords.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PACIENTES', margin, y);
      y += 8;
      doc.setFontSize(8);
      queueRecords.forEach((p, idx) => {
        const name = p.patient_first_name || p.unreg_first_name || 'N/A';
        const id = p.patient_identifier || p.unreg_identifier || 'N/A';
        doc.text(`${idx + 1}. ${name} (${id}) - Estado: ${p.status}`, margin + 5, y);
        y += 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      y += 10;
    }

    if (administeredMeds && administeredMeds.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDICACIÓN ADMINISTRADA', margin, y);
      y += 8;
      doc.setFontSize(8);
      administeredMeds.forEach((m, idx) => {
        doc.text(`${idx + 1}. ${m.medication_name} - ${m.dose} (${m.route})`, margin + 5, y);
        y += 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });
    }

    // Footnote
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento es una copia digital oficial de los registros de enfermería de ASHIRA.', margin, 285);

    const pdfOutput = doc.output('arraybuffer');

    return new Response(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ShiftReport_${date}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('[ShiftReportAPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
