// api/relay.js (搭配 vercel.json 設定 "regions": ["sfo1"] 美國加州 / ["hnd1"] 東京 / ["sin1"] 新加坡)
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, region: process.env.VERCEL_REGION || 'unknown' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = process.env.RELAY_TOKEN;
  if (token && req.headers['x-relay-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized relay token' });
  }
  const { url, headers = {} } = req.body || {};
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const upstream = await fetch(url, { method: 'GET', redirect: 'follow', headers });
    const buf = Buffer.from(await upstream.arrayBuffer());
    const outHeaders = {};
    upstream.headers.forEach((v, k) => { outHeaders[k] = v; });
    res.setHeader('x-relay-status', String(upstream.status));
    res.setHeader('x-relay-status-text', upstream.statusText || 'OK');
    res.setHeader('x-relay-final-url', upstream.url || url);
    res.setHeader('x-relay-headers', Buffer.from(JSON.stringify(outHeaders), 'utf8').toString('base64'));
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/octet-stream');
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Upstream fetch failed' });
  }
};
