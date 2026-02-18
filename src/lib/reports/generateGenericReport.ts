import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, WidthType, Table, TableRow, TableCell, BorderStyle } from 'docx';
import { GenericReportConfig, ConsultationData } from '@/types/generic-report';

export const generateGenericReport = async (
    config: GenericReportConfig,
    consultation: ConsultationData,
    patientData?: {
        firstName?: string;
        lastName?: string;
        identifier?: string;
        age?: string | number;
        birthDate?: string;
    }
): Promise<Blob> => {
    const { primary_color, secondary_color, font_family, header_text, footer_text, logo_url } = config;

    // Helper to fetch image and convert to ArrayBuffer
    const getImageData = async (url: string): Promise<{ data: ArrayBuffer, type: 'png' | 'jpg' } | null> => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            const data = await blob.arrayBuffer();
            const type = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
            return { data, type };
        } catch (error) {
            console.error('Error fetching logo for report:', error);
            return null;
        }
    };

    let logoImagePart: ImageRun | undefined;
    if (logo_url) {
        const logoInfo = await getImageData(logo_url);
        if (logoInfo) {
            logoImagePart = new ImageRun({
                data: logoInfo.data,
                transformation: {
                    width: 100,
                    height: 50,
                },
                type: logoInfo.type,
            });
        }
    }

    // Format dates
    const dateStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Patient info
    const patientName = `${patientData?.firstName || ''} ${patientData?.lastName || ''}`.trim() || 'Desconocido';
    const patientIdentifier = patientData?.identifier || 'N/A';
    const patientAge = patientData?.age ? `${patientData.age} años` : 'No registrada';

    // Document structure
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440, // 1 inch
                        bottom: 1440,
                        left: 1440,
                        right: 1440,
                    },
                },
            },
            headers: {
                default: new Header({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                bottom: { style: BorderStyle.SINGLE, size: 6, color: secondary_color.replace('#', '') },
                                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: logoImagePart ? [logoImagePart] : [],
                                                }),
                                            ],
                                            width: { size: 30, type: WidthType.PERCENTAGE },
                                            verticalAlign: "bottom",
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({
                                                            text: header_text || 'INFORME MÉDICO',
                                                            bold: true,
                                                            size: 24, // 12pt
                                                            color: primary_color.replace('#', ''),
                                                            font: font_family,
                                                        }),
                                                    ],
                                                    alignment: AlignmentType.CENTER,
                                                }),
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({
                                                            text: dateStr,
                                                            size: 20, // 10pt
                                                            color: '808080',
                                                            font: font_family,
                                                        }),
                                                    ],
                                                    alignment: AlignmentType.CENTER,
                                                }),
                                            ],
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            verticalAlign: "bottom",
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
                                    text: footer_text || '',
                                    size: 16, // 8pt
                                    color: '808080',
                                    font: font_family,
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            border: { top: { style: BorderStyle.SINGLE, size: 6, color: secondary_color.replace('#', '') } },
                        }),
                    ],
                }),
            },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'INFORME MÉDICO',
                            bold: true,
                            size: 28, // 14pt
                            color: primary_color.replace('#', ''),
                            font: font_family,
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),

                // Patient Details Grid
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: "PACIENTE: ", bold: true, color: secondary_color.replace('#', ''), font: font_family }),
                                                new TextRun({ text: patientName, font: font_family }),
                                            ],
                                        }),
                                    ],
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: "EDAD: ", bold: true, color: secondary_color.replace('#', ''), font: font_family }),
                                                new TextRun({ text: patientAge, font: font_family }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: "IDENTIFICACIÓN: ", bold: true, color: secondary_color.replace('#', ''), font: font_family }),
                                                new TextRun({ text: patientIdentifier, font: font_family }),
                                            ],
                                        }),
                                    ],
                                }),
                                new TableCell({ children: [] }), // Empty cell
                            ],
                        }),
                    ],
                }),

                new Paragraph({ text: "", spacing: { after: 400 } }), // Spacer

                // Motivo de Consulta
                ...(consultation.chief_complaint ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "MOTIVO DE CONSULTA",
                                bold: true,
                                color: primary_color.replace('#', ''),
                                font: font_family,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: secondary_color.replace('#', '') } },
                        spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: consultation.chief_complaint,
                                font: font_family,
                            }),
                        ],
                        spacing: { after: 300 },
                    }),
                ] : []),

                // Diagnóstico
                ...((consultation.diagnosis || consultation.icd11_title) ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "DIAGNÓSTICO",
                                bold: true,
                                color: primary_color.replace('#', ''),
                                font: font_family,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: secondary_color.replace('#', '') } },
                        spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: [consultation.icd11_title, consultation.diagnosis].filter(Boolean).join('\n'),
                                font: font_family,
                            }),
                        ],
                        spacing: { after: 300 },
                    }),
                ] : []),

                // Notas / Plan
                ...(consultation.notes ? [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "NOTAS DE EVOLUCIÓN / PLAN",
                                bold: true,
                                color: primary_color.replace('#', ''),
                                font: font_family,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: secondary_color.replace('#', '') } },
                        spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: consultation.notes,
                                font: font_family,
                            }),
                        ],
                        spacing: { after: 300 },
                    }),
                ] : []),

                // GINECOLOGÍA
                ...((() => {
                    const gynecology = consultation.vitals?.gynecology;
                    if (!gynecology) return [];

                    return [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "GINECOLOGÍA",
                                    bold: true,
                                    color: primary_color.replace('#', ''),
                                    font: font_family,
                                }),
                            ],
                            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: secondary_color.replace('#', '') } },
                            spacing: { before: 200, after: 100 },
                        }),
                        // Tabla de Antecedentes Ginecológicos
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                            },
                            rows: [
                                // Fila 1: FUR y Menarquía
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: "FUR: ", bold: true, font: font_family }),
                                                        new TextRun({ text: gynecology.last_menstrual_period || 'N/A', font: font_family }),
                                                    ],
                                                }),
                                            ],
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: "Menarquía: ", bold: true, font: font_family }),
                                                        new TextRun({ text: gynecology.menarche || 'N/A', font: font_family }),
                                                    ],
                                                }),
                                            ],
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                        }),
                                    ],
                                }),
                                // Fila 2: Ciclo y Citología
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: "Ciclo: ", bold: true, font: font_family }),
                                                        new TextRun({ 
                                                            text: [gynecology.menstruation_type, gynecology.menstruation_pattern].filter(Boolean).join(' / ') || 'N/A', 
                                                            font: font_family 
                                                        }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: "Última Citología: ", bold: true, font: font_family }),
                                                        new TextRun({ text: gynecology.last_cytology || 'N/A', font: font_family }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                                // Fila 3: Pareja Actual y Gardasil
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: "Pareja Actual: ", bold: true, font: font_family }),
                                                        new TextRun({ text: gynecology.current_partner || 'N/A', font: font_family }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({ text: "Gardasil: ", bold: true, font: font_family }),
                                                        new TextRun({ text: gynecology.gardasil || 'N/A', font: font_family }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        
                        // Diagnósticos Ginecológicos
                        ...(gynecology.diagnoses && Array.isArray(gynecology.diagnoses) && gynecology.diagnoses.length > 0 ? [
                            new Paragraph({ text: "", spacing: { after: 200 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Diagnósticos Ginecológicos:", bold: true, font: font_family }),
                                ],
                            }),
                            ...gynecology.diagnoses.map((diag: string) => new Paragraph({
                                children: [new TextRun({ text: `• ${diag}`, font: font_family })],
                                indent: { left: 720 },
                            })),
                        ] : []),

                        // Plan y Tratamiento
                        ...((gynecology.plan_indications || 
                            gynecology.diet_indications || 
                            gynecology.treatment_infection ||
                            gynecology.contraceptive_treatment) ? [
                            
                            new Paragraph({ text: "", spacing: { after: 200 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "PLAN Y TRATAMIENTO",
                                        bold: true,
                                        color: primary_color.replace('#', ''),
                                        font: font_family,
                                    }),
                                ],
                                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E0E0E0" } },
                                spacing: { before: 200, after: 100 },
                            }),
                            
                            ...(gynecology.plan_indications ? [
                                new Paragraph({children: [new TextRun({ text: "Indicaciones Generales:", bold: true, font: font_family })]}),
                                new Paragraph({children: [new TextRun({ text: gynecology.plan_indications, font: font_family })], spacing: { after: 100 }}),
                            ] : []),

                            ...(gynecology.diet_indications ? [
                                new Paragraph({children: [new TextRun({ text: "Dieta:", bold: true, font: font_family })]}),
                                new Paragraph({children: [new TextRun({ text: gynecology.diet_indications, font: font_family })], spacing: { after: 100 }}),
                            ] : []),

                            ...(gynecology.treatment_infection ? [
                                new Paragraph({children: [new TextRun({ text: "Tratamiento Infección:", bold: true, font: font_family })]}),
                                new Paragraph({children: [new TextRun({ text: gynecology.treatment_infection, font: font_family })], spacing: { after: 100 }}),
                            ] : []),

                            ...(gynecology.contraceptive_treatment ? [
                                new Paragraph({children: [new TextRun({ text: "Tratamiento Anticonceptivo:", bold: true, font: font_family })]}),
                                new Paragraph({children: [new TextRun({ text: gynecology.contraceptive_treatment, font: font_family })], spacing: { after: 100 }}),
                            ] : []),

                        ] : []),
                    ];
                })())
            ],
        }],
    });

    return await Packer.toBlob(doc);
};
