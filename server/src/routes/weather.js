const express = require('express');

const router = express.Router();

// Public API integration: Open-Meteo (https://open-meteo.com) — free, no API key.
// Step 1: geocode the city name. Step 2: fetch current weather for its coordinates.
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO weather interpretation codes -> human-readable text
const WEATHER_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
};

const cache = new Map(); // city -> { at, payload }
const CACHE_MS = 10 * 60 * 1000;

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`upstream responded ${res.status}`);
  return res.json();
}

// GET /api/weather?city=Lahore
router.get('/', async (req, res) => {
  const city = String(req.query.city || '').trim();
  if (!city || city.length > 100) return res.status(400).json({ error: 'city query parameter is required' });

  const key = city.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return res.json(hit.payload);

  try {
    const geo = await fetchJson(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1`);
    const place = geo.results?.[0];
    if (!place) return res.status(404).json({ error: `city "${city}" not found` });

    const wx = await fetchJson(
      `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto'
    );
    const c = wx.current;
    const payload = {
      city: place.name,
      country: place.country,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      condition: WEATHER_CODES[c.weather_code] ?? 'Unknown',
      observedAt: c.time,
      source: 'Open-Meteo',
    };
    cache.set(key, { at: Date.now(), payload });
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: 'weather service unavailable', detail: err.message });
  }
});

module.exports = router;
