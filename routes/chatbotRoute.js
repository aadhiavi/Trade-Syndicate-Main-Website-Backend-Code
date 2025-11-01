const express = require('express');
const axios = require('axios');
const router = express.Router();

const COMPANY_DATA = require('../companyData.json');
const MODEL = 'meta-llama/llama-3.1-70b-instruct';

async function sendToAI(prompt) {
    const aiRes = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: MODEL,
        messages: [
            { role: 'system', content: 'You are a helpful assistant that answers questions based on company profile and product catalog data.' },
            { role: 'user', content: prompt }
        ]
    }, {
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://tradesyndicate.in',
            'Content-Type': 'application/json'
        }
    });

    return aiRes.data.choices[0].message.content;
}

router.post('/', async (req, res) => {
    const { message } = req.body;

    try {
        const prompt = `
Here is the full company profile and product/service data in JSON format:
\`\`\`json
${JSON.stringify(COMPANY_DATA, null, 2)}
\`\`\`

Now respond to the user's message:
"${message}"
        `;

        const aiRes = await sendToAI(prompt);
        return res.json({ message: aiRes });

    } catch (err) {
        console.error('Chatbot error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
