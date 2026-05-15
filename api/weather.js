// Vercel Serverless Function - Intelligent Hybrid Weather Proxy (Fixed Compatibility)
module.exports = async (req, res) => {
  const { nx, ny, lat, lon } = req.query;
  const KMA_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY || '0JVUUwk_RKOVVFMJPwSj1Q'; 

  // Default to Paju if no coordinates provided
  const LAT = lat || 37.8625;
  const LON = lon || 126.7865;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}${mm}${dd}`;
  const currentHour = String(now.getHours()).padStart(2, '0') + '00';

  const fetchKMA = async () => {
    const h = now.getHours();
    const RELEASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
    let baseHour = RELEASE_HOURS.filter(t => t <= h).pop();
    const baseDateObj = new Date(now);
    if (baseHour === undefined) {
      baseHour = 23;
      baseDateObj.setDate(baseDateObj.getDate() - 1);
    }
    const bY = baseDateObj.getFullYear();
    const bM = String(baseDateObj.getMonth() + 1).padStart(2, '0');
    const bD = String(baseDateObj.getDate()).padStart(2, '0');
    const baseDate = `${bY}${bM}${bD}`;
    const baseTime = `${String(baseHour).padStart(2, '0')}00`;

    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?ServiceKey=${KMA_API_KEY}&pageNo=1&numOfRows=200&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx || 57}&ny=${ny || 131}`;
    console.log('[Weather] Fetching KMA:', url.replace(KMA_API_KEY, 'HIDDEN'));
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return await response.json();
  };

  const fetchOpenMeteo = async () => {
    // Requesting current weather + hourly + daily for full forecast
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=relative_humidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia%2FSeoul`;
    console.log('[Weather] Fetching Open-Meteo:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    const hourIdx = now.getHours();
    const currentHumidity = data.hourly?.relative_humidity_2m?.[hourIdx] ?? 0;
    const currentRainProb = data.hourly?.precipitation_probability?.[hourIdx] ?? 0;
    const temp = data.current_weather?.temperature ?? 0;
    const wind = data.current_weather?.windspeed ?? 0;

    // Mapping Open-Meteo weather codes to KMA-style SKY/PTY (simplified)
    const getKmaCodes = (code) => {
      if (code === 0) return { sky: '1', pty: '0' }; // 맑음
      if (code <= 3) return { sky: '3', pty: '0' }; // 구름
      if (code >= 51) return { sky: '4', pty: '1' }; // 비
      return { sky: '4', pty: '0' }; // 흐림
    };

    const currentCodes = getKmaCodes(data.current_weather?.weathercode || 0);

    // Build 7-day forecast
    const weekForecast = (data.daily?.time || []).map((t, i) => {
      const dayCodes = getKmaCodes(data.daily?.weathercode?.[i] || 0);
      return {
        date: t,
        max: data.daily?.temperature_2m_max?.[i],
        min: data.daily?.temperature_2m_min?.[i],
        sky: dayCodes.sky,
        pty: dayCodes.pty
      };
    });

    return {
      source: 'Open-Meteo',
      weekForecast,
      response: {
        header: { resultCode: '00', resultMsg: 'OK (Fallback)' },
        body: {
          items: {
            item: [
              { category: 'TMP', fcstDate: todayStr, fcstTime: currentHour, fcstValue: Math.round(temp).toString() },
              { category: 'TMX', fcstDate: todayStr, fcstTime: currentHour, fcstValue: Math.round(data.daily?.temperature_2m_max?.[0] || temp).toString() },
              { category: 'TMN', fcstDate: todayStr, fcstTime: currentHour, fcstValue: Math.round(data.daily?.temperature_2m_min?.[0] || temp).toString() },
              { category: 'SKY', fcstDate: todayStr, fcstTime: currentHour, fcstValue: currentCodes.sky },
              { category: 'PTY', fcstDate: todayStr, fcstTime: currentHour, fcstValue: currentCodes.pty },
              { category: 'REH', fcstDate: todayStr, fcstTime: currentHour, fcstValue: currentHumidity.toString() },
              { category: 'POP', fcstDate: todayStr, fcstTime: currentHour, fcstValue: currentRainProb.toString() },
              { category: 'WSD', fcstDate: todayStr, fcstTime: currentHour, fcstValue: wind.toString() },
            ]
          }
        }
      }
    };
  };

  try {
    try {
      const kmaData = await fetchKMA();
      if (kmaData?.response?.header?.resultCode === '00') {
        // Even if KMA succeeds, we might want to attach Open-Meteo's week forecast
        // for features KMA Village Forecast doesn't easily provide in 1 call.
        const omData = await fetchOpenMeteo();
        return res.status(200).json({ ...kmaData, weekForecast: omData.weekForecast, source: 'KMA' });
      }
      throw new Error(kmaData?.response?.header?.resultMsg || 'KMA Error');
    } catch (e) {
      console.log('[Server] KMA Failed, using Open-Meteo:', e.message);
      const omData = await fetchOpenMeteo();
      return res.status(200).json(omData);
    }
  } catch (error) {
    console.error('[Server] Weather Fatal Error:', error.message);
    return res.status(500).json({ message: 'Weather Fetch Failed', detail: error.message });
  }
};
