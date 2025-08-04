require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for weather by city or lat/lon
app.get('/api/weather', async (req, res) => {
  const { city, lat, lon } = req.query;
  let weatherUrl = '';

  if (city) {
    weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
  } else if (lat && lon) {
    weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  } else {
    return res.status(400).json({ error: 'City or lat/lon required' });
  }

  try {
    const response = await fetch(weatherUrl);
    const data = await response.json();

    // Log the API response for debugging
    console.log('OpenWeatherMap response:', data);

    if (!response.ok || !data || (data.cod && data.cod !== 200)) {
      // Forward the OpenWeatherMap error message if available
      return res.status(404).json({ error: data.message || 'City not found or API failed' });
    }
    res.json(data);
  } catch (error) {
    // Log the error stack for debugging
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// (Optional) Keep old endpoint for backward compatibility
app.get('/weather', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'City is required' });

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
  try {
    const response = await fetch(weatherUrl);
    if (!response.ok) {
      return res.status(404).json({ error: 'City not found or API failed' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to proxy air quality
app.get('/api/aqi', async (req, res) => {
  const { lat, lon } = req.query;
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch AQI data" });
  }
});

// Endpoint to proxy 5-day forecast
app.get('/api/forecast', async (req, res) => {
  const { lat, lon } = req.query;
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch forecast data" });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
