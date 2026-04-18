const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for location logs
const locationLogs = [];

app.use(cors());
app.use(express.json());

// Serve the frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/location — receive GPS coordinates
app.post('/api/location', (req, res) => {
  const { name, latitude, longitude, timestamp } = req.body;

  // Validate required fields
  if (!name || latitude === undefined || longitude === undefined || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields: name, latitude, longitude, timestamp' });
  }

  const entry = {
    id: locationLogs.length + 1,
    name,
    latitude,
    longitude,
    timestamp,
    receivedAt: new Date().toISOString(),
  };

  locationLogs.push(entry);

  // Console log in the requested format
  const localTime = new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  console.log('\n─────────────────────────────────────────');
  console.log(`📍 New Location Received (#${entry.id})`);
  console.log(`   User      : ${name}`);
  console.log(`   Latitude  : ${latitude}`);
  console.log(`   Longitude : ${longitude}`);
  console.log(`   Time      : ${localTime}`);
  console.log(`   Received  : ${entry.receivedAt}`);
  console.log('─────────────────────────────────────────\n');

  res.status(200).json({ success: true, message: 'Location received!', entry });
});

// GET /api/locations — view all logged entries
app.get('/api/locations', (req, res) => {
  res.json({ total: locationLogs.length, logs: locationLogs });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server only when run directly (not when imported by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 GPS Logger Server running at http://localhost:${PORT}`);
    console.log(`   Frontend : http://localhost:${PORT}`);
    console.log(`   API      : http://localhost:${PORT}/api/location\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
