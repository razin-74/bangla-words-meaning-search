require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const result = await genAI.listModels();
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
