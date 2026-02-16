
const { Groq } = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.API_GROQ,
});

async function main() {
    try {
        const models = await groq.models.list();
        console.log('Available Models:');
        models.data.forEach((model) => {
            console.log(`- ${model.id}`);
        });
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

main();
