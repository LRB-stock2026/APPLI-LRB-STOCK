module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const image = req.body && req.body.image;
    const mediaType = (req.body && req.body.mediaType) || 'image/jpeg';

    if (!image) {
      return res.status(400).json({ error: 'Image manquante' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Clé API manquante' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: image
              }
            },
            {
              type: 'text',
              text: 'Analyse ce produit BTP. Reponds UNIQUEMENT en JSON sans markdown: {"nom":"nom du produit","famille":"OUTILLAGE ou MATERIAUX","sous_famille":"GROS OEUVRE ou SECOND OEUVRE ou AUTRES","corps_etat":"corps etat","marque":null,"reference":null,"unite":"piece","quantite_estimee":null,"description":"description courte"}'
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'API Anthropic: ' + errText });
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(500).json({ error: 'Reponse IA vide', raw: JSON.stringify(data) });
    }

    let text = data.content[0].text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);
    } catch(e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return res.status(200).json(JSON.parse(match[0]));
        } catch(e2) {}
      }
      return res.status(200).json({
        nom: 'Produit identifié',
        famille: 'MATERIAUX',
        sous_famille: 'SECOND OEUVRE',
        corps_etat: 'Divers',
        marque: null,
        reference: null,
        unite: 'piece',
        quantite_estimee: null,
        description: text
      });
    }

  } catch(error) {
    return res.status(500).json({ error: error.message });
  }
}
