export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
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
    let body: any = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        try {
          const sp = new URLSearchParams(req.body);
          const obj: Record<string, string> = {};
          sp.forEach((v, k) => { obj[k] = v; });
          body = obj;
        } catch {
          body = {};
        }
      }
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
    }

    const query = req.query || {};

    const apiKey = body?.key || body?.apiKey || query?.key || query?.apiKey || process.env.SMM_API_KEY || '64994346bbbbeeaa10307df325162283';
    const apiBase = body?.apiBase || body?.apiUrl || query?.apiUrl || process.env.SMM_API_URL || 'https://my.smmgen.com/api/v2';
    const isForce = Boolean(body?.force || query?.force);

    let service = query.service || body?.service;
    let link = query.link || body?.link;
    let quantity = query.quantity || body?.quantity;
    let comments = query.comments || body?.comments;
    let action = query.action || body?.action || 'add';

    if (!service || !link || !quantity) {
      return sendJson(400, {
        error: 'Missing required parameters: service, link, and quantity are required.',
      });
    }

    const formParams = new URLSearchParams();
    formParams.append('key', String(apiKey || '').trim());
    formParams.append('action', String(action || 'add').trim());
    formParams.append('service', String(service).trim());
    formParams.append('link', String(link).trim());
    formParams.append('quantity', String(quantity).trim());
    if (comments && String(comments).trim()) {
      formParams.append('comments', String(comments).trim());
    }

    let upstreamData: any = null;

    // 1. Try standard POST application/x-www-form-urlencoded
    try {
      const postRes = await fetch(apiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RF-SMM-Platform/2.0',
        },
        body: formParams.toString(),
      });
      const postText = await postRes.text();
      try {
        upstreamData = JSON.parse(postText);
      } catch {
        // Not JSON
      }
    } catch (postErr: any) {
      console.warn('Vercel SMM POST attempt failed:', postErr.message);
    }

    // 2. GET fallback if POST did not produce a valid parsed object
    if (!upstreamData || typeof upstreamData !== 'object') {
      try {
        const getUrl = `${apiBase}?${formParams.toString()}`;
        const getRes = await fetch(getUrl, {
          headers: {
            'User-Agent': 'RF-SMM-Platform/2.0',
          },
        });
        const getText = await getRes.text();
        try {
          upstreamData = JSON.parse(getText);
        } catch {
          // Not JSON
        }
      } catch (getErr: any) {
        console.warn('Vercel SMM GET attempt failed:', getErr.message);
      }
    }

    if (upstreamData && typeof upstreamData === 'object') {
      return sendJson(200, upstreamData);
    }

    return sendJson(502, {
      error: 'Upstream SMM Provider responded with an invalid response. Please check API URL and Key.',
      success: false,
    });
  } catch (err: any) {
    console.error('Vercel SMM Order Handler Error:', err);
    return sendJson(500, {
      error: err.message || 'Internal server error while processing SMM order',
      success: false,
    });
  }
}
