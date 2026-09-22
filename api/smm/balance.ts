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
    const query = req.query || {};
    const key = query.key || process.env.SMM_API_KEY || '64994346bbbbeeaa10307df325162283';
    const apiBase = query.apiUrl || process.env.SMM_API_URL || 'https://my.smmgen.com/api/v2';

    const targetUrl = `${apiBase}?key=${encodeURIComponent(key)}&action=balance`;
    const response = await fetch(targetUrl);
    const data: any = await response.json();

    return sendJson(200, {
      ...data,
      success: !data.error,
      apiUrl: apiBase,
    });
  } catch (err: any) {
    console.error('Vercel SMM Balance Error:', err);
    return sendJson(500, { error: err.message || 'Failed to fetch SMM balance', success: false });
  }
}
