const https = require('https');

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Cle API manquante sur Vercel' });

    let body = req.body;
    if (!body || typeof body === 'string') {
        try { body = JSON.parse(body || '{}'); } catch(e) { body = {}; }
    }

    const payload = JSON.stringify(body);

    try {
        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };
            const r = https.request(options, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
            });
            r.on('error', reject);
            r.write(payload);
            r.end();
        });

        const parsed = JSON.parse(result.body);
        return res.status(result.status).json(parsed);
    } catch(e) {
        return res.status(500).json({ error: e.message });
    }
};
