/**
 * Utility to parse extracted text from DOCX recipe templates into specific fields.
 * It looks for section headers followed by a colon and extracts the content until the next header.
 */

export interface ParsedRecipe {
    fullText: string;
    planIndications?: string;
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
        fullText: text
    };

    // Normalize text (remove multiple newlines, etc. but keep structure)
    const normalized = text.replace(/\r\n/g, '\n');
    
    // Create a regex that matches any of the section headers
    const allPatterns = Object.values(SECTION_KEYWORDS).flat();
    
    // Find all matches for headers to identify section boundaries
    const segments = normalized.split(/\n+/);
    
    // Patterns to ignore completely (headers, footers, etc.)
    const IGNORED_PATTERNS = [
        /^FECHA:/i,
        /^RECIPE:?$/i,
        /^Nombre y apellido:/i,
        /^C[ée]dula:/i,
        /^Edad:/i,
        /^{{.*}}$/ // Ignore standalone template placeholders
    ];
    
    let currentField: keyof typeof SECTION_KEYWORDS | null = null;
    let currentContent: string[] = [];

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
                if (currentField && currentContent.length > 0) {
                    result[currentField] = currentContent.join('\n').trim();
                }
                
                // Clear and move to new field
                currentField = field as keyof typeof SECTION_KEYWORDS;
                
                // Extract content if it's on the same line after the colon
                const colonIndex = trimmedLine.indexOf(':');
                const afterColon = trimmedLine.substring(colonIndex + 1).trim();
                currentContent = afterColon ? [afterColon] : [];
                
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
            }
        }
    }

    // Save last field
    if (currentField && currentContent.length > 0) {
        result[currentField] = currentContent.join('\n').trim();
    }

    return result;
}
