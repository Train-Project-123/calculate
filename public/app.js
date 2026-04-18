/* ───────────────────────────────────────────────────────────────────────────
   GPS Location Tester — Frontend Logic
   ─────────────────────────────────────────────────────────────────────────── */

const API_URL = '/api/location';

let currentUser = '';
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

  setTimeout(() => target.classList.add('active'), 50);
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

document.getElementById('user-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleContinue();
});

// ─── Back ────────────────────────────────────────────────────────────────────

function handleBack() {
  showScreen('screen-name');
}

// ─── Status / Hero Helpers ───────────────────────────────────────────────────

function setStatus(type, msg) {
  const el = document.getElementById('status-msg');
  el.innerHTML = msg;
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
  document.getElementById('val-lat').textContent      = lat.toFixed(7);
  document.getElementById('val-lng').textContent      = lng.toFixed(7);
  document.getElementById('val-accuracy').textContent =
    accuracy != null ? `±${accuracy.toFixed(1)} meters` : 'Unknown';

  const ts = new Date(timestamp);
  document.getElementById('val-timestamp').textContent =
    ts.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  document.getElementById('map-link').href =
    `https://www.google.com/maps?q=${lat},${lng}`;

  document.getElementById('coords-card').classList.remove('hidden');
}

// ─── Session Log ─────────────────────────────────────────────────────────────

function addLogEntry(lat, lng, accuracy, timestamp) {
  sessionCount++;
  sessionLog.push({ sessionCount, lat, lng, accuracy, timestamp });

  const list  = document.getElementById('logs-list');
  const empty = list.querySelector('.logs-empty');
  if (empty) empty.remove();

  const ts      = new Date(timestamp);
  const timeStr = ts.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' });
  const accStr  = accuracy != null ? `±${accuracy.toFixed(0)}m` : '?';

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
    <div class="log-entry-accuracy">Accuracy: <span>${accStr}</span></div>
  `;

  list.prepend(entry);
  document.getElementById('logs-count').textContent =
    `${sessionCount} entr${sessionCount === 1 ? 'y' : 'ies'}`;
}

// ─── Error Fallback UI ───────────────────────────────────────────────────────

const GPS_ERRORS = {
  PERMISSION: {
    icon: '🔒',
    title: 'Permission Denied',
    desc: 'You blocked location access. To fix this, tap the lock/info icon in your browser address bar and allow Location.',
    action: null,
  },
  UNAVAILABLE: {
    icon: '📡',
    title: 'GPS Signal Lost',
    desc: 'Your device could not determine a position. Try moving outside or enabling GPS in device settings.',
    action: 'Try Again',
  },
  TIMEOUT: {
    icon: '⏱️',
    title: 'GPS Timed Out',
    desc: 'Location took too long to respond. Make sure GPS is enabled and you have a clear sky view.',
    action: 'Retry',
  },
  SERVER: {
    icon: '☁️',
    title: 'Server Error',
    desc: null, // filled dynamically
    action: 'Try Again',
  },
  UNSUPPORTED: {
    icon: '🚫',
    title: 'Not Supported',
    desc: 'Your browser does not support the Geolocation API. Try Chrome or Safari on a modern device.',
    action: null,
  },
};

function showErrorFallback(type, extraMsg = '') {
  const err = GPS_ERRORS[type];
  const desc = extraMsg || err.desc;

  setStatus('error', `
    <div class="err-block">
      <span class="err-icon">${err.icon}</span>
      <div class="err-body">
        <strong class="err-title">${err.title}</strong>
        <span class="err-desc">${desc}</span>
        ${err.action ? `<button class="err-retry-btn" onclick="retryLocation()">↻ ${err.action}</button>` : ''}
      </div>
    </div>
  `);

  setHero('Something went wrong', 'See the error below for details.');
  document.getElementById('pulse-ring').classList.remove('searching');
  resetButton();
}

// retry just re-triggers the send
function retryLocation() {
  clearStatus();
  setHero('Ready to Capture', 'Tap the button below to get your GPS coordinates.');
  handleSendLocation();
}

// ─── Main Action: Capture & Send Location ────────────────────────────────────

function handleSendLocation() {
  if (!navigator.geolocation) {
    showErrorFallback('UNSUPPORTED');
    return;
  }

  const btn = document.getElementById('btn-send');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Getting GPS…';
  btn.querySelector('.btn-icon-large').textContent = '⏳';
  document.getElementById('pulse-ring').classList.add('searching');
  clearStatus();
  setHero('Acquiring Signal…', 'Please stay still for best accuracy.');
  setStatus('loading', '📡 Requesting GPS coordinates from your device…');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = new Date().toISOString();

      // Show the live data
      showCoords(latitude, longitude, accuracy, timestamp);
      setHero('Location Captured ✓', 'Sending to server…');
      setStatus('loading', '☁️ Sending coordinates to server…');

      const payload = { name: currentUser, latitude, longitude, timestamp };

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        setStatus('success', `✅ Sent! Entry <strong>#${result.entry?.id ?? '—'}</strong> logged on server.`);
        setHero('All Good! 🎉', 'Your coordinates were logged on the server.');
        addLogEntry(latitude, longitude, accuracy, timestamp);

      } catch (err) {
        showErrorFallback('SERVER', `Could not reach server: ${err.message}`);
        setHero('Send Failed', 'GPS captured but server unreachable.');
      } finally {
        resetButton();
      }
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED)      showErrorFallback('PERMISSION');
      else if (error.code === error.POSITION_UNAVAILABLE) showErrorFallback('UNAVAILABLE');
      else if (error.code === error.TIMEOUT)           showErrorFallback('TIMEOUT');
      else showErrorFallback('UNAVAILABLE', `Unknown GPS error (code ${error.code}).`);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function resetButton() {
  const btn = document.getElementById('btn-send');
  btn.disabled = false;
  btn.querySelector('.btn-text').textContent = 'Send My Location';
  btn.querySelector('.btn-icon-large').textContent = '📡';
  document.getElementById('pulse-ring').classList.remove('searching');
}
