
// Vercel Serverless Function - Diagnosis Proxy (Stabilized Version)
const API_KEY = 'ZrjgpD5BAneLxJ48gTCxjxvAWdmkTjWyn5JcvLgqdxc8v808GY';

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body;
    if (!body || !body.images) {
      console.error('[API] Missing images in request body');
      return res.status(400).json({ error: 'No images provided' });
    }

    const { images, ...otherParams } = body;
    const finalKey = process.env.EXPO_PUBLIC_PLANTID_API_KEY || API_KEY;

    console.log('[API] Request received, forwarding to Plant.id... (Images count: ' + images.length + ')');

    // We use health_assessment as primary
    const payload = {
      images: images,
      language: 'ko',
      ...otherParams
    };

    // Primary attempt: health_assessment
    console.log('[API] Attempting health_assessment...');
    let response = await fetch('https://plant.id/api/v3/health_assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': finalKey },
      body: JSON.stringify(payload)
    });

    let status = response.status;
    let rawData = await response.text();
    let data;

    try {
      data = JSON.parse(rawData);
    } catch (e) {
      console.error('[API] Parse error on health_assessment');
    }

    // Fallback: If health_assessment fails or returns no suggestions, try identification
    if (status >= 400 || !data?.result?.disease?.suggestions?.length) {
      console.log('[API] health_assessment failed/empty, falling back to identification...');
      try {
        response = await fetch('https://plant.id/api/v3/identification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Api-Key': finalKey },
          body: JSON.stringify({ ...payload, health: 'all' })
        });
        status = response.status;
        rawData = await response.text();
        try {
          data = JSON.parse(rawData);
        } catch (parseErr) {
          console.error('[API] Identification parse error:', rawData.substring(0, 100));
          data = { error: { message: 'Identification endpoint returned non-JSON' }, raw: rawData.substring(0, 100) };
        }
      } catch (fetchErr) {
        console.error('[API] Identification fetch error:', fetchErr.message);
        status = 500;
        data = { error: { message: fetchErr.message } };
      }
    }

    if (status >= 400) {
      console.error('[API] Both endpoints failed or returned error:', status, data);
      return res.status(status).json({
        error: 'Plant.id API Error',
        detail: data?.error?.message || data?.message || data?.detail || 'Unknown error',
        status: status,
        suggestions: []
      });
    }

    console.log('[API] Success response from Plant.id (v3)');
    return res.status(200).json(data);
  } catch (error) {
    console.error('[API] Server Exception:', error.message);
    // CRITICAL: Always return JSON, never let Vercel return HTML 500
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
};
