export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
  
  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: 'Image manquante' });

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
              text: 'Tu es expert BTP. Analyse ce produit. Reponds UNIQUEMENT en JSON valide sans markdown: {"nom":"nom du produit","famille":"OUTILLAGE","sous_famille":"SECOND OEUVRE","corps_etat":"corps etat","marque":null,"reference":null,"unite":"piece","quantite_estimee":null,"description":"description"}'
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0]) {
      return res.status(500).json({ error: 'Reponse IA invalide', raw: data });
    }

    const text = data.content[0].text;
    
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json({ ok: true, result: parsed });
    } catch {
      return res.status(200).json({ ok: true, result: { nom: text, famille: 'MATERIAUX', sous_famille: 'SECOND OEUVRE', corps_etat: 'Divers', marque: null, reference: null, unite: 'piece', quantite_estimee: null, description: text }});
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
