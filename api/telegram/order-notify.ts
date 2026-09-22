export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(200).end();
    res.statusCode = 200;
    return res.end();
  }

  const sendJson = (status: number, data: any) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(status).json(data);
    }
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { botToken, channels, message, photoUrl } = body;
    if (!botToken || !channels || !Array.isArray(channels) || channels.length === 0 || !message) {
      return sendJson(400, {
        error: 'Missing required parameters: botToken, channels (array), and message are required.'
      });
    }

    const results = [];
    for (const channel of channels) {
      if (!channel) continue;
      try {
        let endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
        let payload: any = {
          chat_id: channel,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        };

        if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
          endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
          payload = {
            chat_id: channel,
            photo: photoUrl,
            caption: message,
            parse_mode: 'HTML'
          };
        }

        const tgRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const tgData = await tgRes.json();
        results.push({ channel, success: tgData.ok, data: tgData });
      } catch (chanErr: any) {
        results.push({ channel, success: false, error: chanErr.message });
      }
    }

    return sendJson(200, { success: true, results });
  } catch (err: any) {
    return sendJson(200, { success: false, error: err.message });
  }
}
