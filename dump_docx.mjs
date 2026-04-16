import mammoth from 'mammoth';
import fs from 'fs';

async function dumpDocx(filename) {
    if (!fs.existsSync(filename)) {
        console.log(`File not found: ${filename}`);
        return;
    }
    const buffer = fs.readFileSync(filename);
    const result = await mammoth.extractRawText({ buffer });
    console.log(`--- ${filename} ---`);
    console.log(result.value);
}

const files = [
    'RECIPE PERFIL 20 Y GENOTIPIFICACION VIRAL.docx',
    'RECIPE SOLO PROBIOTICOS Y VITAMINAS.docx'
];

Promise.all(files.map(dumpDocx)).catch(console.error);
