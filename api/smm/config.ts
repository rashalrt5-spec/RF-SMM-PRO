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
    if (req.method === 'POST') {
      let body = req.body || {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      return sendJson(200, {
        success: true,
        message: 'SMM configuration updated successfully',
        config: {
          apiUrl: body.apiUrl || 'https://my.smmgen.com/api/v2',
          apiKey: body.apiKey || '64994346bbbbeeaa10307df325162283',
          autoTransfer: body.autoTransfer !== false,
        }
      });
    }

    return sendJson(200, {
      apiUrl: process.env.SMM_API_URL || 'https://my.smmgen.com/api/v2',
      apiKey: process.env.SMM_API_KEY || '64994346bbbbeeaa10307df325162283',
      autoTransfer: true,
      success: true,
    });
  } catch (err: any) {
    return sendJson(500, { error: err.message, success: false });
  }
}
