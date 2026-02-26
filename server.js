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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const isDemoMode = !OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key';

if (isDemoMode) {
    console.log('Running in DEMO MODE (No OpenRouter API Key provided)');
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
        if (!isDemoMode) {
            console.log(`Searching AI (OpenRouter) for "${searchWord}"`);
            const prompt = `Provide the meaning in Bangla, pronunciation (phonetic in English), 3 examples (in Bangla with English translation in parentheses), and 3 synonyms (in Bangla) for the Bangla word: "${word}". JSON format: {"word": "${word}", "meaning": "Bangla meaning", "pronunciation": "pronunciation", "examples": ["sentence (translation)", ...], "synonyms": ["...", "...", "..."]}`;

            // OpenRouter selection
            const modelNames = [
                "stepfun/step-3.5-flash:free",
                "google/gemini-2.0-flash-001",
                "openrouter/auto:free",
                "google/gemma-2-9b-it:free",
                "deepseek/deepseek-chat:free",
                "mistralai/mistral-7b-instruct:free",
                "microsoft/phi-3-mini-128k-instruct:free",
                "openai/gpt-4o-mini"
            ];

            let aiResult;
            let lastErrorMessage = "";

            for (const modelName of modelNames) {
                try {
                    console.log(`Attempting OpenRouter model: ${modelName}`);
                    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:3000", // Optional, for OpenRouter rankings
                            "X-Title": "Bangla Word Meaning Search"      // Optional, for OpenRouter rankings
                        },
                        body: JSON.stringify({
                            model: modelName,
                            messages: [
                                { role: "user", content: prompt }
                            ],
                            // Only use json_object if not using reasoning (StepFun free might not support both)
                            ...(modelName.includes('stepfun') ? {} : { response_format: { type: "json_object" } }),
                            temperature: 0.1,
                            reasoning: { enabled: true }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                        throw new Error("Invalid response structure from OpenRouter: " + JSON.stringify(data));
                    }

                    let content = data.choices[0].message.content || "";

                    // Remove reasoning <think> blocks if present
                    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
                    // Remove markdown formatting
                    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

                    try {
                        aiResult = JSON.parse(content);
                    } catch (parseError) {
                        // Fallback: try to extract JSON from text
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            aiResult = JSON.parse(jsonMatch[0]);
                        } else {
                            throw new Error("Failed to parse JSON. Content: " + content.substring(0, 50));
                        }
                    }

                    if (aiResult) {
                        console.log(`Success with OpenRouter model: ${modelName}`);
                        break;
                    }
                } catch (error) {
                    lastErrorMessage = error.message;
                    console.error(`OpenRouter model ${modelName} failed:`, lastErrorMessage);
                }
            }

            if (!aiResult) {
                let userMessage = 'An error occurred while searching for the word.';
                if (lastErrorMessage.toLowerCase().includes('429') || lastErrorMessage.toLowerCase().includes('quota')) {
                    userMessage = 'The AI is currently busy. Please try again in a minute.';
                }

                console.error('All OpenRouter models failed. Final error:', lastErrorMessage);
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
                meaning: `এটি একটি উদাহরণ (OpenRouter API কী নেই)। "${word}" এর অর্থ এখানে প্রদর্শিত হছে।`,
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
