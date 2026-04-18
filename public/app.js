/* ───────────────────────────────────────────────────────────────────────────
   GPS Location Tester — Frontend Logic
   ─────────────────────────────────────────────────────────────────────────── */

const API_URL = '/api/location';

// ─── House Geofence Polygon (ABCD) ──────────────────────────────────────────
// Your house corners in order: A → B → C → D
const HOUSE_POLYGON = [
  { lat: 11.150816, lng: 75.898068, label: 'A' },
  { lat: 11.150844, lng: 75.897984, label: 'B' },
  { lat: 11.150740, lng: 75.897960, label: 'C' },
  { lat: 11.150717, lng: 75.898027, label: 'D' },
];

// Ray-casting point-in-polygon algorithm
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Haversine distance in meters between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Centroid of the house polygon
function polygonCentroid(polygon) {
  const lat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const lng = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;
  return { lat, lng };
}

function showGeofenceResult(capturedLat, capturedLng, gpsAccuracy) {
  const inside = isPointInPolygon(capturedLat, capturedLng, HOUSE_POLYGON);
  const center = polygonCentroid(HOUSE_POLYGON);
  const distFromCenter = haversineDistance(capturedLat, capturedLng, center.lat, center.lng);

  const el = document.getElementById('geofence-result');
  const icon = document.getElementById('gf-icon');
  const verdict = document.getElementById('gf-verdict');
  const detail = document.getElementById('gf-detail');

  el.className = `geofence-result ${inside ? 'inside' : 'outside'}`;

  if (inside) {
    icon.textContent = '🏠';
    verdict.textContent = '✅ INSIDE the House';
    detail.textContent = `GPS is within the ABCD boundary. ~${distFromCenter.toFixed(1)}m from centre.`;
  } else {
    icon.textContent = '📍';
    verdict.textContent = '❌ OUTSIDE the House';
    const accuracyNote = gpsAccuracy
      ? ` (GPS accuracy: ±${gpsAccuracy.toFixed(0)}m)`
      : '';
    detail.textContent = `~${distFromCenter.toFixed(1)}m from house centre${accuracyNote}.`;
  }

  el.classList.remove('hidden');
}


let sessionLog = [];
let sessionCount = 0;

// ─── Screen Navigation ───────────────────────────────────────────────────────

function showScreen(id) {
  const screens = document.querySelectorAll('.screen');
  const target = document.getElementById(id);

  screens.forEach(s => {
    if (s === target) return;
    if (s.classList.contains('active')) {
      s.classList.add('exit');
      s.classList.remove('active');
      setTimeout(() => s.classList.remove('exit'), 400);
    }
  });

  setTimeout(() => {
    target.classList.add('active');
  }, 50);
}

// ─── Screen 1: Name Entry ────────────────────────────────────────────────────

function handleContinue() {
  const input = document.getElementById('user-name');
  const name = input.value.trim();

  if (!name) {
    input.style.borderColor = '#ef4444';
    input.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.2)';
    input.focus();
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.boxShadow = '';
    }, 1200);
    return;
  }

  currentUser = name;
  document.getElementById('display-username').textContent = name;
  showScreen('screen-gps');
}

// Allow pressing Enter to continue
document.getElementById('user-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleContinue();
});

// ─── Screen 2: GPS / Back ────────────────────────────────────────────────────

function handleBack() {
  showScreen('screen-name');
}

// ─── Status UI Helpers ───────────────────────────────────────────────────────

function setStatus(type, msg) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
}

function clearStatus() {
  const el = document.getElementById('status-msg');
  el.classList.add('hidden');
  el.className = 'status-msg hidden';
}

function setHero(title, subtitle) {
  document.getElementById('hero-title').textContent = title;
  document.getElementById('hero-subtitle').textContent = subtitle;
}

// ─── Coordinates Display ─────────────────────────────────────────────────────

function showCoords(lat, lng, accuracy, timestamp) {
  const card = document.getElementById('coords-card');
  document.getElementById('val-lat').textContent = lat.toFixed(7);
  document.getElementById('val-lng').textContent = lng.toFixed(7);
  document.getElementById('val-accuracy').textContent =
    accuracy ? `±${accuracy.toFixed(1)} meters` : 'Unknown';

  const ts = new Date(timestamp);
  document.getElementById('val-timestamp').textContent =
    ts.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  document.getElementById('map-link').href = mapUrl;

  card.classList.remove('hidden');
}

// ─── Session Log ─────────────────────────────────────────────────────────────

function addLogEntry(lat, lng, timestamp) {
  sessionCount++;
  sessionLog.push({ sessionCount, lat, lng, timestamp });

  const list = document.getElementById('logs-list');
  const empty = list.querySelector('.logs-empty');
  if (empty) empty.remove();

  const ts = new Date(timestamp);
  const timeStr = ts.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <div class="log-entry-head">
      <span class="log-entry-num">#${sessionCount}</span>
      <span class="log-entry-time">${timeStr}</span>
    </div>
    <div class="log-entry-coords">
      Lat: <span>${lat.toFixed(6)}</span> &nbsp; Lng: <span>${lng.toFixed(6)}</span>
    </div>
  `;

  list.prepend(entry);
  document.getElementById('logs-count').textContent =
    `${sessionCount} entr${sessionCount === 1 ? 'y' : 'ies'}`;
}

// ─── Main Action: Capture & Send Location ────────────────────────────────────

function handleSendLocation() {
  const btn = document.getElementById('btn-send');

  if (!navigator.geolocation) {
    setStatus('error', '❌ Geolocation is not supported by your browser.');
    return;
  }

  // UI: loading state
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Getting GPS…';
  btn.querySelector('.btn-icon-large').textContent = '⏳';
  document.getElementById('pulse-ring').classList.add('searching');
  clearStatus();
  setHero('Acquiring Signal…', 'Please stay still for best accuracy.');
  setStatus('loading', '📡 Requesting GPS coordinates…');

  // Geolocation options — high accuracy for mobile
  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = new Date().toISOString();

      // Display coords on screen + geofence check
      showCoords(latitude, longitude, accuracy, timestamp);
      showGeofenceResult(latitude, longitude, accuracy);
      setHero('Location Captured ✓', 'Sending data to server…');

      // Build payload
      const payload = {
        name: currentUser,
        latitude,
        longitude,
        timestamp,
      };

      try {
        setStatus('loading', '☁️ Sending to server…');
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${response.status}`);
        }

        const result = await response.json();

        // Success
        setStatus('success', `✅ Location sent! Entry #${result.entry?.id ?? '—'} recorded.`);
        setHero('All Good! 🎉', 'Your coordinates were logged on the server.');
        addLogEntry(latitude, longitude, timestamp);

      } catch (err) {
        setStatus('error', `❌ Failed to send: ${err.message}`);
        setHero('Send Failed', 'Coordinates captured but server unreachable.');
      } finally {
        resetButton();
      }
    },
    (error) => {
      let msg = '❌ Could not get location.';
      if (error.code === error.PERMISSION_DENIED)
        msg = '❌ Location permission denied. Please allow GPS access.';
      else if (error.code === error.POSITION_UNAVAILABLE)
        msg = '❌ GPS signal unavailable. Try stepping outside.';
      else if (error.code === error.TIMEOUT)
        msg = '⏱️ GPS timed out. Ensure location services are on and try again.';

      setStatus('error', msg);
      setHero('GPS Error', 'Could not retrieve your position.');
      resetButton();
    },
    geoOptions
  );
}

function resetButton() {
  const btn = document.getElementById('btn-send');
  btn.disabled = false;
  btn.querySelector('.btn-text').textContent = 'Send My Location';
  btn.querySelector('.btn-icon-large').textContent = '📡';
  document.getElementById('pulse-ring').classList.remove('searching');
}
