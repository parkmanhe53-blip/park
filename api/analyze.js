
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

    const response = await fetch('https://plant.id/api/v3/health_assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': finalKey
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const rawData = await response.text();
    let data;

    try {
      data = JSON.parse(rawData);
    } catch (e) {
      console.error('[API] Failed to parse Plant.id response:', rawData);
      return res.status(500).json({ 
        error: 'Plant.id Response Parse Error', 
        detail: 'The server returned a non-JSON response. This usually happens when the API key is invalid or quota is exceeded.',
        raw: rawData.substring(0, 500)
      });
    }

    if (status >= 400) {
      console.error('[API] Plant.id returned error:', status, data);
      return res.status(status).json({
        error: 'Plant.id API Error',
        detail: data?.error?.message || data?.message || data?.detail || 'Unknown error from Plant.id',
        status: status,
        suggestions: [] // Ensure suggestions is present but empty to avoid client crashes
      });
    }

    console.log('[API] Success response from Plant.id');
    return res.status(200).json(data);
  } catch (error) {
    console.error('[API] Server Exception:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
};
