module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { image, mediaType } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: image
              }
            },
            {
              type: 'text',
              text: 'Tu es expert BTP. Analyse ce produit. Reponds UNIQUEMENT en JSON valide sans markdown ni backticks: {"nom":"nom du produit","famille":"OUTILLAGE ou MATERIAUX","sous_famille":"GROS OEUVRE ou SECOND OEUVRE ou AUTRES","corps_etat":"corps etat","marque":null,"reference":null,"unite":"piece","quantite_estimee":null,"description":"description courte"}'
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.content && data.content[0] && data.content[0].text) {
      const text = data.content[0].text.trim();
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch(e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return res.status(200).json(JSON.parse(match[0]));
        return res.status(200).json({ nom: text, famille: 'MATERIAUX', sous_famille: 'SECOND OEUVRE', corps_etat: 'Divers', marque: null, reference: null, unite: 'piece', quantite_estimee: null, description: text });
      }
    }
    
    return res.status(500).json({ error: 'Reponse IA vide', raw: data });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
