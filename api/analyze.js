const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body || {};
    const image = body.image;
    const mediaType = body.mediaType || 'image/jpeg';
    const mode = body.mode || 'produit';

    if (!image) return res.status(400).json({ error: 'Image manquante' });

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Cle API manquante' });

    const promptProduit = 'Analyse ce produit BTP. Reponds UNIQUEMENT en JSON sans markdown: {"nom":"nom","famille":"OUTILLAGE ou MATERIAUX","corps_etat":"corps etat","marque":null,"reference":null,"unite":"piece","quantite_estimee":null}';

    const promptBon = 'Tu es un expert en lecture de documents BTP. Analyse cette image qui est un bon de livraison, une facture ou une liste de materiaux. Extrais TOUS les produits visibles meme si la photo est imparfaite. Cherche des noms de produits, references, designations, quantites dans tout le document. Reponds UNIQUEMENT en JSON valide sans markdown ni explication: {"articles":[{"nom":"designation complete du produit","quantite":1,"unite":"piece"}]}. Si tu vois du texte avec des produits, mets-les tous. Uniquement si image totalement illisible: {"articles":[]}';

    const prompt = mode === 'bon_livraison' ? promptBon : promptProduit;

    const payload = JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: prompt }
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
      const r = https.request(options, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
      });
      r.on('error', reject);
      r.write(payload);
      r.end();
    });

    if (result.status !== 200) return res.status(result.status).json({ error: result.body });

    const data = JSON.parse(result.body);
    let text = data.content[0].text.trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return res.status(200).json(JSON.parse(text));
    } catch(e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { return res.status(200).json(JSON.parse(match[0])); } catch(e2) {}
      }
      if (mode === 'bon_livraison') return res.status(200).json({ articles: [] });
      return res.status(200).json({ nom: 'Produit', famille: 'MATERIAUX', corps_etat: 'Divers', unite: 'piece' });
    }
  } catch(error) {
    return res.status(500).json({ error: error.message });
  }
};
