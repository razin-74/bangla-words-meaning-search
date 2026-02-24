require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function reproduceSearch(word) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = `Provide the meaning, pronunciation (phonetic in English), 3 example sentences (in Bangla and English), and 3 synonyms for the Bangla word: "${word}". 
Respond ONLY in the following JSON format:
{
  "word": "${word}",
  "meaning": "primary meaning in Bangla",
  "pronunciation": "pronunciation",
  "examples": ["Bangla sentence (English translation)", ...],
  "synonyms": ["synonym1", "synonym2", "synonym3"]
}`;

    const modelsToTry = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-pro-latest", "gemini-1.5-flash"];

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            console.log('Raw response text:', text);

            // Clean up potential markdown formatting from AI
            text = text.replace(/```json|```/g, '').trim();
            const aiResult = JSON.parse(text);
            console.log('Parsed result:', JSON.stringify(aiResult, null, 2));
            return aiResult;
        } catch (error) {
            console.error(`Model ${modelName} failed:`, error);
        }
    }
}

reproduceSearch('আকাশ');
