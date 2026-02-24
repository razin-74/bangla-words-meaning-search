require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const WORDS_FILE = path.join(__dirname, 'words.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper functions for JSON storage (Async)
const readWords = async () => {
    try {
        const exists = await fs.access(WORDS_FILE).then(() => true).catch(() => false);
        if (!exists) return {};
        const data = await fs.readFile(WORDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading words file:', error);
        return {};
    }
};

const saveWord = async (wordData) => {
    try {
        const words = await readWords();
        words[wordData.word.toLowerCase()] = wordData;
        await fs.writeFile(WORDS_FILE, JSON.stringify(words, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving word:', error);
    }
};

// AI Setup
const genAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key'
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

if (!genAI) {
    console.log('Running in DEMO MODE (No Gemini API Key provided)');
}

// API Routes
app.post('/api/search', async (req, res) => {
    const { word } = req.body;

    if (!word) {
        return res.status(400).json({ error: 'Word is required' });
    }

    const searchWord = word.toLowerCase().trim();

    try {
        // 1. Check Local JSON Database
        const words = await readWords();
        if (words[searchWord]) {
            console.log(`Found "${searchWord}" in local storage`);
            return res.json({ source: 'local', ...words[searchWord] });
        }

        // 2. If not found and AI is available, call AI
        if (genAI) {
            console.log(`Searching AI for "${searchWord}"`);
            const prompt = `Provide the meaning in Bangla, pronunciation (phonetic in English), 3 examples (in Bangla with English translation in parentheses), and 3 synonyms (in Bangla) for the Bangla word: "${word}". JSON format: {"word": "${word}", "meaning": "Bangla meaning", "pronunciation": "pronunciation", "examples": ["sentence (translation)", ...], "synonyms": ["...", "...", "..."]}`;

            let aiResult;
            let lastErrorMessage = "";
            // List of models to try in order of preference
            const modelsToTry = [
                "gemini-1.5-flash",
                "gemini-2.0-flash",
                "gemini-flash-latest",
                "gemini-pro-latest"
            ];

            for (const modelName of modelsToTry) {
                try {
                    console.log(`Attempting with model: ${modelName}`);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.1, // Lower temperature for faster, deterministic output
                        }
                    });

                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    aiResult = JSON.parse(response.text());

                    if (aiResult) {
                        console.log(`Success with model: ${modelName}`);
                        break; // Success!
                    }
                } catch (error) {
                    lastErrorMessage = error.message;
                    console.log(`Model ${modelName} failed:`, lastErrorMessage);

                    // If it's a quota error or overloaded, continue to next model
                    // If it's something fatal (like invalid key), we might want to stop,
                    // but for now, we'll try all available models.
                }
            }

            if (!aiResult) {
                let userMessage = 'An error occurred while searching for the word.';
                if (lastErrorMessage.includes('429') || lastErrorMessage.toLowerCase().includes('quota')) {
                    userMessage = 'The AI is currently busy. Please try again in a minute.';
                }

                console.error('All models failed. Final error:', lastErrorMessage);
                return res.status(503).json({ error: userMessage });
            }

            // Standardize the word key to lowercase
            const wordData = {
                ...aiResult,
                word: searchWord
            };

            // 3. Save to local storage
            await saveWord(wordData);

            return res.json({ source: 'ai', ...wordData });
        } else {
            // Demo fallback if no AI
            return res.json({
                source: 'demo',
                word: word,
                meaning: `এটি একটি উদাহরণ (নিবন্ধিত কী নেই)। "${word}" এর অর্থ এখানে প্রদর্শিত হছে।`,
                pronunciation: word,
                examples: [
                    `এখানে একটি উদাহরণ বাক্য থাকবে: "${word}" ব্যবহার করা হয়েছে। (This is an example sentence using "${word}")`,
                    "বাংলা অর্থ খোঁজার জন্য এটি একটি দারুণ প্ল্যাটফর্ম। (This is a great platform for finding Bangla meanings.)"
                ],
                synonyms: ["নমুনা", "উদাহরণ", "প্রদর্শন"]
            });
        }

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
