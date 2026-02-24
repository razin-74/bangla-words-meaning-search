require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;

async function testFetch() {
    console.log('Testing with API Key:', apiKey.substring(0, 5) + '...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log('Response status:', response.status);
        if (data.models) {
            console.log('Available models:');
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log('No models found or error:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testFetch();
