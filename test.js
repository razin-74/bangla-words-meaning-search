require('dotenv').config();
const key = process.env.OPENROUTER_API_KEY;
const prompt = 'Provide the meaning in Bangla, pronunciation (phonetic in English), 3 examples (in Bangla with English translation in parentheses), and 3 synonyms (in Bangla) for the Bangla word: "water". JSON format: {"word": "water", "meaning": "Bangla meaning", "pronunciation": "pronunciation", "examples": ["sentence (translation)"], "synonyms": ["..."]}';

async function test() {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'stepfun/step-3.5-flash:free',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        })
    });
    const d = await res.json();
    console.log("Status:", res.status);
    console.log("Body:", JSON.stringify(d, null, 2));
    if (d.choices && d.choices.length > 0) {
        console.log("Content:", d.choices[0].message.content);
        try {
            console.log("Parsed:", JSON.parse(d.choices[0].message.content));
        } catch (e) {
            console.error("Parse Error:", e.message);
        }
    }
}
test();
