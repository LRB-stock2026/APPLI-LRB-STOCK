export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
  const { image, mediaType } = req.body;
  if (!image) return res.status(400).json({ error: 'Image manquante' });
  try {
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
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } }, { type: 'text', text: 'Tu es expert BTP. Analyse ce produit. Reponds UNIQUEMENT en JSON: {"nom":"...","famille":"OUTILLAGE ou MATERIAUX","sous_famille":"GROS OEUVRE ou SECOND OEUVRE ou AUTRES","corps_etat":"...","marque":null,"reference":null,"unite":"piece","quantite_estimee":null,"description":"..."}' }] }]
      })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
