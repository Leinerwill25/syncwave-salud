// src/lib/utils/nurse-report-generator.ts
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Header, 
  Footer, 
  AlignmentType, 
  WidthType, 
  Table, 
  TableRow, 
  TableCell, 
  BorderStyle 
} from 'docx';
import type { ShiftReport } from '@/types/nurse.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Genera un archivo .docx profesional para un reporte de turno de enfermería.
 */
export async function generateShiftReportDoc(report: ShiftReport): Promise<Blob> {
  const primaryColor = "0D9488"; // Teal-600
  const secondaryColor = "64748B"; // Slate-500
  
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            color: "000000",
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                bottom: { style: BorderStyle.SINGLE, size: 12, color: primaryColor },
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "ASHIRA CLINIC SYNCWAVE",
                              bold: true,
                              size: 32,
                              color: primaryColor,
                            }),
                          ],
                        }),
                      ],
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      borders: { bottom: { style: BorderStyle.NONE, size: 0, color: "auto" } }
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `REPORTE DE ${report.report_type === 'shift_report' ? 'TURNO' : 'ATENCIÓN'}`,
                              bold: true,
                              size: 20,
                              color: secondaryColor,
                            }),
                          ],
                          alignment: AlignmentType.RIGHT,
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: format(new Date(report.report_date), "dd/MM/yyyy", { locale: es }),
                              size: 18,
                              color: secondaryColor,
                            }),
                          ],
                          alignment: AlignmentType.RIGHT,
                        }),
                      ],
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: "center",
                      borders: { bottom: { style: BorderStyle.NONE, size: 0, color: "auto" } }
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Este documento es una copia digital del registro clínico original. Generado por el sistema de Gestión de Enfermería ASHIRA.",
                  size: 14,
                  color: "999999",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200 },
            }),
          ],
        }),
      },
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: "RESUMEN DE ASISTENCIA",
              bold: true,
              size: 24,
              color: primaryColor,
            }),
          ],
          spacing: { before: 400, after: 200 },
        }),

        // General Info Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Enfermera ID:", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: report.nurse_id })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Pacientes Atendidos:", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: String(report.patients_count) })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Inicio Turno:", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: report.shift_start ? format(new Date(report.shift_start), "HH:mm") : 'N/A' })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fin Turno:", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: report.shift_end ? format(new Date(report.shift_end), "HH:mm") : 'N/A' })] }),
              ]
            })
          ]
        }),

        // Summary
        new Paragraph({
          children: [
            new TextRun({ text: "RESUMEN GENERAL", bold: true, color: primaryColor }),
          ],
          spacing: { before: 400, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primaryColor } }
        }),
        new Paragraph({
          children: [new TextRun({ text: report.summary || "No se registró resumen general." })],
          spacing: { after: 300 }
        }),

        // Incidents
        new Paragraph({
          children: [
            new TextRun({ text: "NOVEDADES E INCIDENTES", bold: true, color: primaryColor }),
          ],
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primaryColor } }
        }),
        ...((report.incidents as any[] || []).length > 0
          ? (report.incidents as any[]).map((inc) => 
              new Paragraph({
                children: [
                  new TextRun({ text: `[${inc.time}] `, bold: true }),
                  new TextRun({ text: `${inc.severity.toUpperCase()}: `, bold: true, color: inc.severity === 'high' ? 'FF0000' : 'EAB308' }),
                  new TextRun({ text: inc.description })
                ],
                bullet: { level: 0 }
              })
            )
          : [new Paragraph({ text: "Sin incidentes reportados." })]),

        // Pending Tasks
        new Paragraph({
          children: [
            new TextRun({ text: "TAREAS PENDIENTES PARA EL PRÓXIMO TURNO", bold: true, color: primaryColor }),
          ],
          spacing: { before: 400, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primaryColor } }
        }),
        ...((report.pending_tasks as any[] || []).length > 0
          ? (report.pending_tasks as any[]).map((task) => 
              new Paragraph({
                children: [
                  new TextRun({ text: `${task.patientName}: `, bold: true }),
                  new TextRun({ text: task.description }),
                  new TextRun({ text: ` (Prioridad: ${task.priority})`, italics: true, size: 16 })
                ],
                bullet: { level: 0 }
              })
            )
          : [new Paragraph({ text: "Sin tareas pendientes." })]),

        // Signatures
        new Paragraph({
          children: [
            new TextRun({
              text: "FIRMADO DIGITALMENTE EN FECHA: " + (report.signed_at ? format(new Date(report.signed_at), "dd/MM/yyyy HH:mm:ss") : "PENDIENTE"),
              bold: true,
              size: 16,
              color: "666666"
            }),
          ],
          spacing: { before: 800 },
          alignment: AlignmentType.CENTER
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
