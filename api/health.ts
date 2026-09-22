export default function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.status === 'function') {
    return res.status(200).json({ status: 'ok' });
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ status: 'ok' }));
}
