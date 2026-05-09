const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image, mediaType } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Image manquante' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Cle API manquante' });

    const payload = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
          { type: 'text', text: 'Analyse ce produit BTP. Reponds UNIQUEMENT en JSON sans markdown: {"nom":"nom","famille":"OUTILLAGE ou MATERIAUX","corps_etat":"corps etat","marque":null,"reference":null,"unite":"piece","quantite_estimee":null}' }
        ]
      }]
    });

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

      const req2 = https.request(options, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({ status: r.statusCode, body: data }));
      });
      req2.on('error', reject);
      req2.write(payload);
      req2.end();
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.body });
    }

    const data = JSON.parse(result.body);
    const text = data.content[0].text.trim().replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();

    try {
      return res.status(200).json(JSON.parse(text));
    } catch(e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return res.status(200).json(JSON.parse(match[0]));
      return res.status(200).json({ nom: 'Produit', famille: 'MATERIAUX', corps_etat: 'Divers', marque: null, reference: null, unite: 'piece', quantite_estimee: null });
    }

  } catch(error) {
    return res.status(500).json({ error: error.message });
  }
}
