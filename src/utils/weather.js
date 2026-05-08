// 기상청 단기예보 API 연동 유틸
// 키는 .env의 EXPO_PUBLIC_WEATHER_API_KEY에서 불러옴
import * as Location from 'expo-location';

const API_KEY  = process.env.EXPO_PUBLIC_WEATHER_API_KEY ?? '';
const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

// 경북 청송군 현서면 격자 좌표 (GPS 실패 시 기본값)
const DEFAULT_NX = 89;
const DEFAULT_NY = 107;
const DEFAULT_LOCATION_NAME = '경북 청송군 현서면';

// WGS84 위경도 → 기상청 격자(nx, ny) 변환 (Lambert Conformal Conic)
function latLngToGrid(lat, lng) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon  = OLON  * DEGRAD;
  const olat  = OLAT  * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  const raVal = re * sf / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta >  Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(raVal * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - raVal * Math.cos(theta) + YO + 0.5),
  };
}

const FALLBACK = { nx: DEFAULT_NX, ny: DEFAULT_NY, locationName: DEFAULT_LOCATION_NAME };

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// GPS 현재 위치 취득 → { nx, ny, locationName }  (5초 타임아웃)
export async function getCurrentLocation() {
  try {
    const { status } = await withTimeout(Location.requestForegroundPermissionsAsync(), 5000);
    if (status !== 'granted') return FALLBACK;

    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      5000,
    );
    const { latitude, longitude } = pos.coords;
    const { nx, ny } = latLngToGrid(latitude, longitude);

    let locationName = DEFAULT_LOCATION_NAME;
    try {
      const geo = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), 4000);
      if (geo?.length > 0) {
        const g = geo[0];
        const parts = [g.region, g.city || g.subregion, g.district || g.street].filter(Boolean);
        if (parts.length > 0) locationName = parts.slice(0, 3).join(' ');
      }
    } catch (_) {}

    return { nx, ny, locationName };
  } catch (e) {
    console.warn('[위치] 취득 실패:', e.message);
    return FALLBACK;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// 기상청은 가장 최근 발표 시각(02/05/08/11/14/17/20/23시)을 base_time으로 요구
function getBaseDateTime() {
  const now = new Date();
  const h   = now.getHours();
  const RELEASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

  let baseHour = RELEASE_HOURS.filter(t => t <= h).pop();
  const baseDate = new Date(now);

  // 자정~02시 사이: 전날 23시 발표 자료 사용
  if (baseHour === undefined) {
    baseHour = 23;
    baseDate.setDate(baseDate.getDate() - 1);
  }

  const yyyy = baseDate.getFullYear();
  const mm   = pad2(baseDate.getMonth() + 1);
  const dd   = pad2(baseDate.getDate());
  return {
    baseDate: `${yyyy}${mm}${dd}`,
    baseTime: `${pad2(baseHour)}00`,
  };
}

export async function fetchWeather(nx = DEFAULT_NX, ny = DEFAULT_NY) {
  if (!API_KEY) return getMockWeather();

  const { baseDate, baseTime } = getBaseDateTime();

  // 기상청 API는 ServiceKey를 URLSearchParams가 아닌 직접 문자열로 조합해야
  // 이중 인코딩 오류를 피할 수 있음
  const query = [
    `ServiceKey=${API_KEY}`,
    `pageNo=1`,
    `numOfRows=200`,
    `dataType=JSON`,
    `base_date=${baseDate}`,
    `base_time=${baseTime}`,
    `nx=${nx}`,
    `ny=${ny}`,
  ].join('&');

  try {
    const res  = await fetch(`${BASE_URL}?${query}`, { timeout: 8000 });
    const json = await res.json();

    const resultCode = json?.response?.header?.resultCode;
    if (resultCode !== '00') {
      console.warn('[날씨 API] 오류 코드:', resultCode, json?.response?.header?.resultMsg);
      return getMockWeather();
    }

    const items = json?.response?.body?.items?.item ?? [];
    if (!items.length) return getMockWeather();

    return parseWeather(items);
  } catch (e) {
    console.warn('[날씨 API] 네트워크 오류:', e.message);
    return getMockWeather();
  }
}

function parseWeather(items) {
  // fcstDate가 오늘인 항목 중 가장 가까운 시각의 값만 사용
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const currentHour = pad2(new Date().getHours()) + '00';

  // 오늘 예보 중 현재 시각에 가장 가까운 것 선택
  const todayItems = items.filter(i => i.fcstDate === todayStr);

  // 가능한 fcstTime 목록에서 현재 시각 이후 가장 가까운 것
  const times = [...new Set(todayItems.map(i => i.fcstTime))].sort();
  const targetTime = times.find(t => t >= currentHour) ?? times[0] ?? currentHour;

  const map = {};
  todayItems
    .filter(i => i.fcstTime === targetTime)
    .forEach(({ category, fcstValue }) => { map[category] = fcstValue; });

  // TMX/TMN은 하루 1개만 있으므로 전체 todayItems에서 추출
  const allMap = {};
  todayItems.forEach(({ category, fcstValue }) => {
    if (!allMap[category] || category === 'TMX' || category === 'TMN') {
      allMap[category] = fcstValue;
    }
  });

  return {
    temp:      parseFloat(map.TMP  ?? map.T1H ?? 18),
    maxTemp:   parseFloat(allMap.TMX ?? 22),
    minTemp:   parseFloat(allMap.TMN ?? 9),
    humidity:  parseFloat(map.REH  ?? 55),
    windSpeed: parseFloat(map.WSD  ?? 2.3),
    rainProb:  parseFloat(map.POP  ?? 5),
    skyCode:   parseInt(map.SKY   ?? 1),   // 1맑음 3구름많음 4흐림
    rainCode:  parseInt(map.PTY   ?? 0),   // 0없음 1비 2비/눈 3눈 4소나기
  };
}

// 네트워크 없을 때 / API 오류 시 기본값
export function getMockWeather() {
  return {
    temp: 18, maxTemp: 22, minTemp: 9,
    humidity: 55, windSpeed: 2.3,
    rainProb: 5, skyCode: 1, rainCode: 0,
  };
}

export function getWeatherIcon(skyCode, rainCode) {
  if (rainCode === 1 || rainCode === 4) return '🌧';
  if (rainCode === 2) return '🌨';
  if (rainCode === 3) return '❄️';
  if (skyCode === 1) return '☀️';
  if (skyCode === 3) return '⛅';
  return '☁️';
}

export function getWeatherDesc(skyCode, rainCode) {
  if (rainCode === 1 || rainCode === 4) return '비';
  if (rainCode === 2) return '비/눈';
  if (rainCode === 3) return '눈';
  if (skyCode === 1) return '맑음';
  if (skyCode === 3) return '구름 많음';
  return '흐림';
}

// 날씨 조건 → 농작업 추천
export function getWorkRecommendations(weather) {
  const recs = [];
  const { temp, windSpeed, rainProb, rainCode } = weather;

  if (rainCode > 0 || rainProb >= 70) {
    recs.push({ icon: '⛔', text: '농약 살포 금지 — 비 예보', priority: 'high',   color: '#C0392B' });
    recs.push({ icon: '🚿', text: '배수로 점검 및 정비 권장', priority: 'medium', color: '#F39C12' });
  } else {
    if (windSpeed < 5) {
      recs.push({ icon: '🌿', text: '방제 작업 최적 조건 (바람 약함)',  priority: 'high',   color: '#27AE60' });
    }
    if (temp >= 15 && temp <= 25) {
      recs.push({ icon: '✂️', text: '적과 작업 권장 (적기 온도)',       priority: 'high',   color: '#4A7C2F' });
    }
    if (temp > 25) {
      recs.push({ icon: '🌡', text: '오전 중 작업 권장 — 고온 주의',   priority: 'medium', color: '#F39C12' });
    }
    if (temp < 5) {
      recs.push({ icon: '🧊', text: '동해 주의 — 보온 조치 확인',       priority: 'high',   color: '#2E86C1' });
    }
  }

  if (windSpeed >= 7) {
    recs.push({ icon: '💨', text: '강풍 주의 — 농약 살포 금지',        priority: 'high',   color: '#C0392B' });
  }

  recs.push({ icon: '📋', text: '생육 현황 점검 및 기록',              priority: 'low',    color: '#8A9A7A' });
  return recs;
}
