export default async function handler(req, res) {
  // 1. Abilita i CORS per permettere a GitHub Pages di chiamare questa API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // 2. Leggiamo i parametri dall'URL (es: /api/stream?type=movie&id=123)
  const { id, type, s, e } = req.query;

  if (!id || !type) {
    return res.status(400).json({ error: 'Mancano i parametri (id, type)' });
  }

  // 3. Ricostruiamo l'URL di vixsrc
  let targetUrl = `https://vixsrc.to/${type}/${id}`;
  if (type === 'tv' && s && e) {
    targetUrl += `/${s}/${e}`;
  }

  try {
    // 4. Prepariamo la richiesta "camuffata" da browser Chrome
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        // Passiamo l'IP reale dell'utente per evitare l'IP Binding
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '',
      }
    });

    const html = await response.text();

    // 5. Test Anti-Cloudflare: verifichiamo se ci hanno bloccato
    if (response.status === 403 || html.includes('Just a moment...') || html.includes('Cloudflare')) {
       return res.status(403).json({ 
         success: false, 
         message: 'Bloccati da Cloudflare!', 
         status: response.status 
       });
    }

    // 6. Vittoria! Se passiamo, restituiamo una porzione di HTML per confermarlo
    return res.status(200).json({ 
      success: true, 
      message: 'Cloudflare superato!',
      // Restituiamo i primi 1000 caratteri per vedere cosa c'è dentro
      htmlSnippet: html.substring(0, 1000) 
    });

  } catch (error) {
    return res.status(500).json({ error: 'Errore interno', details: error.message });
  }
}
