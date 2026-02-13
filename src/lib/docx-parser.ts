import mammoth from 'mammoth';

/**
 * Extracts raw text from a DOCX file buffer/blob.
 * @param fileBuffer The array buffer of the .docx file
 * @returns Promise<string> The extracted text
 */
export async function extractTextFromDocx(fileBuffer: ArrayBuffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
        return result.value; // The raw text
    } catch (error) {
        console.error('Error extracting text from docx:', error);
        throw new Error('Failed to extract text from the document.');
    }
}
