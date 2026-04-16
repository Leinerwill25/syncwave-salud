/**
 * Utility to parse extracted text from DOCX recipe templates into specific fields.
 * It looks for section headers followed by a colon and extracts the content until the next header.
 */

export interface ParsedMedication {
    name: string;
    dosage?: string;
    frequency?: string;
}

export interface ParsedRecipe {
    fullText: string;
    planIndications?: string;
    description?: string; // For additional notes
    medications: ParsedMedication[];
    dietIndications?: string;
    intimateSoap?: string;
    treatmentInfection?: string;
    probiotics?: string;
    vitamins?: string;
    contraceptiveTreatment?: string;
    bleedingTreatment?: string;
}

const SECTION_KEYWORDS = {
    planIndications: [/INDICACIONES( GENERALES)?:/i, /PLAN:/i, /TRATAMIENTO:/i],
    recipe: [/RECIPE:?$/i, /PRESCRIPCI[ÓO]N:?$/i],
    dietIndications: [/DIETA:/i, /INDICACIONES DIET[ÉE]TICAS:/i, /ALIMENTACI[ÓO]N:/i],
    intimateSoap: [/JAB[ÓO]N [ÍI]NTIMO:/i, /ASEO [ÍI]NTIMO:/i],
    treatmentInfection: [/TRATAMIENTO INFECCI[ÓO]N:/i, /ANTIBI[ÓO]TICOS:/i],
    probiotics: [/PROBI[ÓO]TICOS:/i],
    vitamins: [/VITAMINAS:/i, /SUPLEMENTOS:/i],
    contraceptiveTreatment: [/ANTICONCEPTIVO(S)?:/i, /TRATAMIENTO ANTICONCEPTIVO:/i],
    bleedingTreatment: [/TRATAMIENTO SANGRADO:/i, /PARA EL SANGRADO:/i]
};

export function parseRecipeText(text: string): ParsedRecipe {
    const result: ParsedRecipe = {
        fullText: text,
        medications: []
    };

    // Normalize text (remove multiple newlines, etc. but keep structure)
    const normalized = text.replace(/\r\n/g, '\n');
    
    // Find all matches for headers to identify section boundaries
    const segments = normalized.split(/\n+/);
    
    // Patterns to ignore completely (headers, footers, metadata, and clinical boilerplate)
    const IGNORED_PATTERNS = [
        /^FECHA:/i,
        /^RECIPE:?$/i,
        /^PRESCRIPCI[ÓO]N:?$/i,
        /^Nombre y apellido:/i,
        /^C[ée]dula:/i,
        /^Edad:/i,
        /^{{.*}}$/i,
        /^Resultados de citología/i,
        /^Informe m[ée]dico/i,
        /^Se trata de paciente/i,
        /^Se eval[úa] paciente/i,
        /^Hipersensibilidad/i,
        /^Antecedentes/i,
        /^H[áa]bitos/i,
        /^Examen f[íi]sico/i,
        /^Mamas/i,
        /^Abdomen/i,
        /^Genitales/i,
        /^Laboratorio/i,
        /^Mamograf[íi]a/i,
        /^Ecosonograma/i,
        /^Ecograf[íi]a/i,
        /^FUR:/i,
        /^Menarquia/i
    ];

    // Keywords that indicate a line is likely clinical notes, not a medication
    const CLINICAL_NOISE_KEYWORDS = [
        'paciente', 'condiciones generales', 'afebril', 'eupneica', 'hidratada',
        'simétricas', 'indemne', 'tumoración', 'adenomegalias', 'blando', 'depresible',
        'palpación', 'megalias', 'normoconfigurados', 'espéculo', 'quien acude',
        'control anual', 'insuficiencia venosa', 'cesárea', 'legrado'
    ];
    
    let currentField: keyof typeof SECTION_KEYWORDS | null = null;
    let currentContent: string[] = [];

    // Local helper to push medications
    const processMedLines = (lines: string[]) => {
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.endsWith(':')) return;
            
            // Heuristic: If it contains many the clinical noise words, or it's a very long sentence without a colon
            const lowerLine = trimmed.toLowerCase();
            if (CLINICAL_NOISE_KEYWORDS.some(kw => lowerLine.includes(kw))) return;
            if (trimmed.length > 120 && !trimmed.includes(':')) return; // Likely a paragraph of notes
            if (IGNORED_PATTERNS.some(p => p.test(trimmed))) return;

            // Pattern: "Medication Name: Dosage / Frequency"
            if (trimmed.includes(':')) {
                const parts = trimmed.split(':');
                const name = parts[0].trim();
                const details = parts[1].trim();
                
                // Avoid capturing section headers as names
                const isHeader = Object.values(SECTION_KEYWORDS).some(patterns => 
                    patterns.some(p => p.test(name + ':'))
                );

                if (name && !isHeader && name.length < 60) {
                    result.medications.push({ 
                        name: name.toUpperCase(), 
                        dosage: details,
                        frequency: details 
                    });
                }
            } else if (trimmed.length > 3 && trimmed.length < 80) {
                // If it's a short-ish line, it's probably just a medication name
                result.medications.push({ name: trimmed.toUpperCase() });
            }
        });
    };

    for (const line of segments) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Skip ignored lines
        if (IGNORED_PATTERNS.some(p => p.test(trimmedLine))) {
            continue;
        }

        let foundHeader = false;
        for (const [field, patterns] of Object.entries(SECTION_KEYWORDS)) {
            if (patterns.some(p => p.test(trimmedLine))) {
                // If we were already collecting content for a field, save it
                if (currentField) {
                    const contentStr = currentContent.join('\n').trim();
                    if (contentStr) {
                        if (field !== 'recipe') {
                            (result as any)[currentField] = contentStr;
                        }
                        // Always try to extract meds from any content block
                        processMedLines(currentContent);
                    }
                }
                
                // Clear and move to new field
                currentField = field as keyof typeof SECTION_KEYWORDS;
                
                // Extract content if it's on the same line after the colon
                const colonIndex = trimmedLine.indexOf(':');
                if (colonIndex !== -1) {
                    const afterColon = trimmedLine.substring(colonIndex + 1).trim();
                    currentContent = afterColon ? [afterColon] : [];
                } else {
                    currentContent = [];
                }
                
                foundHeader = true;
                break;
            }
        }

        if (!foundHeader) {
            if (currentField) {
                currentContent.push(trimmedLine);
            } else {
                // If no header found yet, add to general plan if it doesn't exist
                if (!result.planIndications) result.planIndications = '';
                result.planIndications += (result.planIndications ? '\n' : '') + trimmedLine;
                processMedLines([trimmedLine]);
            }
        }
    }

    // Save last field
    if (currentField) {
        const contentStr = currentContent.join('\n').trim();
        if (contentStr) {
            if (currentField !== 'recipe') {
                (result as any)[currentField] = contentStr;
            }
            processMedLines(currentContent);
        }
    }

    // Post-processing: remove duplicates by name
    const uniqueMeds: ParsedMedication[] = [];
    const seenNames = new Set();
    result.medications.forEach(m => {
        if (!seenNames.has(m.name)) {
            uniqueMeds.push(m);
            seenNames.add(m.name);
        }
    });
    result.medications = uniqueMeds;

    return result;
}
