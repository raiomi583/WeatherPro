

const API_KEY = '9bb5ac4ff7d1e3c2a939537fefc4f57a';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';

let isDarkMode = localStorage.getItem('darkMode') === 'true';
let selectedFormat = 'json';
let locationCards = [];
let globalData = [];
let globalLoaded = false;
let activeRegion = 'all';

// Initialize dark mode on page load
if (isDarkMode) {
  document.body.classList.add('dark');
}



function navigateTo(pageId, clickedItem) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  if (clickedItem) clickedItem.classList.add('active');

  // Update breadcrumb
  const labels = {
    dashboard: 'Dashboard',
    location: 'Location Hub',
    forecasts: 'Forecasts',
    alerts: 'Alerts',
    storm: 'Storm Tracker',
    global: 'Global View',
    export: 'Data Export'
  };
  const breadcrumb = document.getElementById('breadcrumbCurrent');
  if (breadcrumb) breadcrumb.textContent = labels[pageId] || pageId;

  // Close sidebar on mobile
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 900) sidebar.classList.remove('open');

  // Page-specific initializers
  if (pageId === 'global') initGlobalView();
}

// ===================================================
// LIVE CLOCK
// ===================================================

function updateClock() {
  const el = document.getElementById('liveTime');
  if (el) el.textContent = new Date().toUTCString().replace(' GMT', ' UTC');
}
updateClock();
setInterval(updateClock, 1000);

// ===================================================
// DASHBOARD — WEATHER
// ===================================================

function quickLoad(city) {
  document.getElementById('cityInput').value = city;
  fetchWeather(city);
}

function getWeather() {
  const cityInput = document.getElementById('cityInput');
  const city = cityInput.value.trim();
  if (!city) { showToast('Please enter a city name', 'error'); return; }
  fetchWeather(city);
  cityInput.value = '';
}

function getLocationWeather() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }
  showLoadingSpinner(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByCoordinates(latitude, longitude);
    },
    () => {
      showLoadingSpinner(false);
      showToast('Unable to get your location. Please enable location access.', 'error');
    }
  );
}

function fetchWeather(city, callback) {
  showLoadingSpinner(true);
  return fetch(`${WEATHER_API_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`)
    .then(response => {
      if (!response.ok) throw new Error('City not found');
      return response.json();
    })
    .then(data => {
      showLoadingSpinner(false);
      if (callback) { callback(data); }
      else {
        displayWeather(data);
        showToast('Station data loaded for ' + data.name, 'success');
      }
      return data;
    })
    .catch(error => {
      showLoadingSpinner(false);
      showToast('Error: ' + error.message, 'error');
      throw error;
    });
}

function fetchWeatherByCoordinates(lat, lon) {
  fetch(`${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
    .then(r => r.json())
    .then(data => {
      displayWeather(data);
      showLoadingSpinner(false);
      showToast('Station data loaded for ' + data.name, 'success');
    })
    .catch(() => {
      showLoadingSpinner(false);
      showToast('Error fetching weather data', 'error');
    });
}

function getConditionLabel(visibility, clouds, humidity) {
  const score = (visibility / 10) * 0.5 + (1 - clouds / 100) * 0.3 + (1 - humidity / 100) * 0.2;
  if (score >= 0.65) return { label: 'Good Conditions', cls: 'good', icon: 'fa-circle-check' };
  if (score >= 0.35) return { label: 'Moderate Conditions', cls: 'moderate', icon: 'fa-circle-exclamation' };
  return { label: 'Poor Visibility', cls: 'poor', icon: 'fa-circle-xmark' };
}

function getWindDir(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function displayWeather(data) {
  const weatherDiv = document.getElementById('weather');
  const iconUrl = 'https://openweathermap.org/img/wn/' + data.weather[0].icon + '@4x.png';
  const feelsLike = Math.round(data.main.feels_like);
  const temp = Math.round(data.main.temp);
  const humidity = data.main.humidity;
  const windSpeed = data.wind.speed;
  const windDeg = data.wind.deg || 0;
  const pressure = data.main.pressure;
  const visibility = (data.visibility / 1000).toFixed(1);
  const cloudiness = data.clouds.all;
  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const condition = getConditionLabel(parseFloat(visibility), cloudiness, humidity);
  const windDir = getWindDir(windDeg);

  weatherDiv.innerHTML = '<div class="weather-grid">' +
    '<div class="hero-weather-card">' +
      '<div class="card-header-strip">' +
        '<div class="station-meta">' +
          '<div>' +
            '<div class="station-label">Active Station</div>' +
            '<div class="station-name">' + data.name + ', ' + data.sys.country + '</div>' +
            '<div class="station-coords">' + (data.coord ? data.coord.lat.toFixed(4) + '&deg;N, ' + data.coord.lon.toFixed(4) + '&deg;E' : '') + '</div>' +
          '</div>' +
          '<div class="station-time">' +
            '<div class="update-label">Last updated</div>' +
            '<div class="update-time">' + now + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="temp-hero-block">' +
        '<div class="weather-icon-wrap"><img src="' + iconUrl + '" alt="' + data.weather[0].main + '"></div>' +
        '<div class="temp-block">' +
          '<div><span class="temp-number">' + temp + '</span><span class="temp-unit">&deg;C</span></div>' +
          '<div class="temp-desc">' + data.weather[0].description + '</div>' +
          '<div class="temp-feels">Feels like <strong>' + feelsLike + '&deg;C</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="card-divider"></div>' +
      '<div class="stats-grid">' +
        '<div class="stat-cell"><div class="stat-cell-icon"><i class="fas fa-droplets"></i></div><div class="stat-cell-label">Humidity</div><div class="stat-cell-value">' + humidity + '<span style="font-size:14px;font-weight:500;color:var(--text-tertiary)">%</span></div><div class="stat-cell-sub">Relative humidity</div></div>' +
        '<div class="stat-cell"><div class="stat-cell-icon"><i class="fas fa-wind"></i></div><div class="stat-cell-label">Wind</div><div class="stat-cell-value">' + windSpeed + '<span style="font-size:14px;font-weight:500;color:var(--text-tertiary)"> m/s</span></div><div class="stat-cell-sub">Direction ' + windDir + ' (' + windDeg + '&deg;)</div></div>' +
        '<div class="stat-cell"><div class="stat-cell-icon"><i class="fas fa-gauge"></i></div><div class="stat-cell-label">Pressure</div><div class="stat-cell-value">' + pressure + '<span style="font-size:14px;font-weight:500;color:var(--text-tertiary)"> hPa</span></div><div class="stat-cell-sub">Atmospheric</div></div>' +
        '<div class="stat-cell"><div class="stat-cell-icon"><i class="fas fa-eye"></i></div><div class="stat-cell-label">Visibility</div><div class="stat-cell-value">' + visibility + '<span style="font-size:14px;font-weight:500;color:var(--text-tertiary)"> km</span></div><div class="stat-cell-sub">Ground-level</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="side-panel">' +
      '<div class="panel-card">' +
        '<div class="panel-card-title"><i class="fas fa-clock-rotate-left"></i> Solar Events</div>' +
        '<div class="sun-row">' +
          '<div class="sun-item sunrise"><i class="fas fa-sun"></i><div class="sun-label">Sunrise</div><div class="sun-time">' + sunrise + '</div></div>' +
          '<div class="sun-item sunset"><i class="fas fa-moon"></i><div class="sun-label">Sunset</div><div class="sun-time">' + sunset + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-card-title"><i class="fas fa-microscope"></i> Atmospheric Detail</div>' +
        '<div class="metrics-list">' +
          '<div class="metric-row"><div class="metric-left"><div class="metric-icon-wrap"><i class="fas fa-cloud"></i></div><div class="metric-name">Cloud Cover</div></div><div class="metric-value">' + cloudiness + '%</div></div>' +
          '<div class="metric-row"><div class="metric-left"><div class="metric-icon-wrap"><i class="fas fa-temperature-low"></i></div><div class="metric-name">Temp Min</div></div><div class="metric-value">' + Math.round(data.main.temp_min) + '&deg;C</div></div>' +
          '<div class="metric-row"><div class="metric-left"><div class="metric-icon-wrap"><i class="fas fa-temperature-high"></i></div><div class="metric-name">Temp Max</div></div><div class="metric-value">' + Math.round(data.main.temp_max) + '&deg;C</div></div>' +
          '<div class="metric-row"><div class="metric-left"><div class="metric-icon-wrap"><i class="fas fa-compass"></i></div><div class="metric-name">Wind Dir</div></div><div class="metric-value">' + windDir + ' ' + windDeg + '&deg;</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-card-title"><i class="fas fa-shield-halved"></i> Station Condition</div>' +
        '<div class="metrics-list">' +
          '<div class="metric-row"><div class="metric-left"><div class="metric-icon-wrap"><i class="fas fa-id-badge"></i></div><div class="metric-name">Weather ID</div></div><div class="metric-value">#' + data.weather[0].id + '</div></div>' +
          '<div class="metric-row"><div class="metric-left"><div class="metric-icon-wrap"><i class="fas fa-layer-group"></i></div><div class="metric-name">Category</div></div><div class="metric-value">' + data.weather[0].main + '</div></div>' +
        '</div>' +
        '<div class="condition-badge ' + condition.cls + '"><i class="fas ' + condition.icon + '"></i> ' + condition.label + '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ===================================================
// LOCATION HUB
// ===================================================

function addLocation() {
  document.getElementById('locationSearchInput').focus();
}

function addLocationFromInput() {
  const input = document.getElementById('locationSearchInput');
  const city = input.value.trim();
  if (!city) { showToast('Enter a city name first', 'error'); return; }
  input.value = '';

  if (locationCards.find(c => c.toLowerCase() === city.toLowerCase())) {
    showToast(city + ' is already in your hub', 'info');
    return;
  }

  showLoadingSpinner(true);
  fetch(WEATHER_API_URL + '/weather?q=' + encodeURIComponent(city) + '&appid=' + API_KEY + '&units=metric')
    .then(r => { if (!r.ok) throw new Error('City not found'); return r.json(); })
    .then(data => {
      showLoadingSpinner(false);
      locationCards.push(data.name);
      renderLocationCard(data);
      showToast(data.name + ' added to Location Hub', 'success');
    })
    .catch(err => {
      showLoadingSpinner(false);
      showToast('Error: ' + err.message, 'error');
    });
}

function renderLocationCard(data) {
  const grid = document.getElementById('locationGrid');
  const empty = grid.querySelector('.loc-empty');
  if (empty) empty.remove();

  const iconUrl = 'https://openweathermap.org/img/wn/' + data.weather[0].icon + '@2x.png';
  const temp = Math.round(data.main.temp);

  const card = document.createElement('div');
  card.className = 'loc-card';
  card.innerHTML =
    '<div class="loc-card-header">' +
      '<div><div class="loc-city">' + data.name + '</div><div class="loc-country">' + data.sys.country + '</div></div>' +
      '<img src="' + iconUrl + '" class="loc-icon" alt="' + data.weather[0].main + '">' +
    '</div>' +
    '<div class="loc-temp">' + temp + '&deg;C</div>' +
    '<div class="loc-desc">' + data.weather[0].description + '</div>' +
    '<div class="loc-stats">' +
      '<span><i class="fas fa-droplets"></i> ' + data.main.humidity + '%</span>' +
      '<span><i class="fas fa-wind"></i> ' + data.wind.speed + ' m/s</span>' +
      '<span><i class="fas fa-gauge"></i> ' + data.main.pressure + ' hPa</span>' +
    '</div>' +
    '<button class="loc-remove-btn" onclick="removeLocation(this, \'' + data.name + '\')"><i class="fas fa-trash-can"></i> Remove</button>';
  grid.appendChild(card);
}

function removeLocation(btn, name) {
  btn.closest('.loc-card').remove();
  locationCards = locationCards.filter(c => c !== name);
  showToast(name + ' removed', 'info');
  const grid = document.getElementById('locationGrid');
  if (grid.children.length === 0) {
    grid.innerHTML = '<div class="loc-empty"><i class="fas fa-map-pin"></i><p>No locations added yet. Search a city above to start comparing.</p></div>';
  }
}

// ===================================================
// FORECASTS
// ===================================================

function loadForecast() {
  const city = document.getElementById('forecastCityInput').value.trim();
  if (!city) { showToast('Enter a city name', 'error'); return; }

  showLoadingSpinner(true);
  fetch(WEATHER_API_URL + '/forecast?q=' + encodeURIComponent(city) + '&appid=' + API_KEY + '&units=metric&cnt=56')
    .then(r => { if (!r.ok) throw new Error('City not found'); return r.json(); })
    .then(data => {
      showLoadingSpinner(false);
      displayForecast(data);
      showToast('Forecast loaded for ' + data.city.name, 'success');
    })
    .catch(err => {
      showLoadingSpinner(false);
      showToast('Error: ' + err.message, 'error');
    });
}

function displayForecast(data) {
  var container = document.getElementById('forecastContent');
  var days = {};
  data.list.forEach(function(item) {
    var date = new Date(item.dt * 1000);
    var key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  var dayEntries = Object.entries(days).slice(0, 7);
  var cardsHTML = dayEntries.map(function(entry) {
    var day = entry[0];
    var items = entry[1];
    var temps = items.map(function(i) { return i.main.temp; });
    var maxTemp = Math.round(Math.max.apply(null, temps));
    var minTemp = Math.round(Math.min.apply(null, temps));
    var midItem = items[Math.floor(items.length / 2)];
    var icon = midItem.weather[0].icon;
    var desc = midItem.weather[0].description;
    var humidity = Math.round(items.reduce(function(a, i) { return a + i.main.humidity; }, 0) / items.length);
    var wind = (items.reduce(function(a, i) { return a + i.wind.speed; }, 0) / items.length).toFixed(1);
    var pop = Math.round(Math.max.apply(null, items.map(function(i) { return (i.pop || 0) * 100; })));
    return '<div class="forecast-day-card">' +
      '<div class="fc-day">' + day + '</div>' +
      '<img src="https://openweathermap.org/img/wn/' + icon + '@2x.png" class="fc-icon" alt="' + desc + '">' +
      '<div class="fc-desc">' + desc + '</div>' +
      '<div class="fc-temps"><span class="fc-max">' + maxTemp + '&deg;</span><span class="fc-min">' + minTemp + '&deg;</span></div>' +
      '<div class="fc-meta"><span><i class="fas fa-droplets"></i> ' + humidity + '%</span><span><i class="fas fa-wind"></i> ' + wind + 'm/s</span><span><i class="fas fa-cloud-rain"></i> ' + pop + '%</span></div>' +
    '</div>';
  }).join('');

  container.innerHTML =
    '<div class="forecast-header-info">' +
      '<h3 class="forecast-city-title">' + data.city.name + ', ' + data.city.country + '</h3>' +
      '<p class="forecast-sub">7-day extended outlook &middot; Updated just now</p>' +
    '</div>' +
    '<div class="forecast-cards">' + cardsHTML + '</div>';
}

// ===================================================
// GLOBAL VIEW
// ===================================================

var GLOBAL_CITIES = [
  { name: 'Mumbai', region: 'asia' },
  { name: 'Tokyo', region: 'asia' },
  { name: 'Singapore', region: 'asia' },
  { name: 'Delhi', region: 'asia' },
  { name: 'Bangkok', region: 'asia' },
  { name: 'London', region: 'europe' },
  { name: 'Paris', region: 'europe' },
  { name: 'Berlin', region: 'europe' },
  { name: 'Rome', region: 'europe' },
  { name: 'Amsterdam', region: 'europe' },
  { name: 'New York', region: 'americas' },
  { name: 'Los Angeles', region: 'americas' },
  { name: 'Chicago', region: 'americas' },
  { name: 'Toronto', region: 'americas' },
  { name: 'Dubai', region: 'middle-east' },
  { name: 'Riyadh', region: 'middle-east' },
  { name: 'Istanbul', region: 'middle-east' }
];

function initGlobalView() {
  if (globalLoaded) { renderGlobalGrid(); return; }

  var grid = document.getElementById('globalGrid');
  grid.innerHTML = '<div class="empty-state small"><div class="spinner-small"></div><p class="empty-sub">Loading global data...</p></div>';

  var promises = GLOBAL_CITIES.map(function(city) {
    return fetch(WEATHER_API_URL + '/weather?q=' + encodeURIComponent(city.name) + '&appid=' + API_KEY + '&units=metric')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) { return data ? Object.assign(data, { region: city.region }) : null; })
      .catch(function() { return null; });
  });

  Promise.all(promises).then(function(results) {
    globalData = results.filter(function(r) { return r !== null; });
    globalLoaded = true;
    renderGlobalGrid();
    showToast('Loaded ' + globalData.length + ' global stations', 'success');
  });
}

function refreshGlobalView() {
  globalLoaded = false;
  globalData = [];
  initGlobalView();
  showToast('Refreshing global data...', 'info');
}

function filterRegion(region, btn) {
  activeRegion = region;
  document.querySelectorAll('.region-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  renderGlobalGrid();
}

function renderGlobalGrid() {
  var grid = document.getElementById('globalGrid');
  var filtered = activeRegion === 'all' ? globalData : globalData.filter(function(d) { return d.region === activeRegion; });

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state small"><p class="empty-sub">No data for this region yet.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(data) {
    var temp = Math.round(data.main.temp);
    var iconUrl = 'https://openweathermap.org/img/wn/' + data.weather[0].icon + '@2x.png';
    var regionLabel = data.region.replace('-', ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    return '<div class="global-city-card">' +
      '<div class="global-card-top">' +
        '<div><div class="global-city-name">' + data.name + '</div><div class="global-region-tag">' + data.sys.country + ' &middot; ' + regionLabel + '</div></div>' +
        '<img src="' + iconUrl + '" class="global-icon" alt="' + data.weather[0].main + '">' +
      '</div>' +
      '<div class="global-temp">' + temp + '&deg;C</div>' +
      '<div class="global-desc">' + data.weather[0].description + '</div>' +
      '<div class="global-meta">' +
        '<span><i class="fas fa-droplets"></i>' + data.main.humidity + '%</span>' +
        '<span><i class="fas fa-wind"></i>' + data.wind.speed + 'm/s</span>' +
        '<span><i class="fas fa-eye"></i>' + (data.visibility / 1000).toFixed(1) + 'km</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===================================================
// DATA EXPORT
// ===================================================

function selectFormat(fmt, el) {
  selectedFormat = fmt;
  document.querySelectorAll('.format-opt').forEach(function(o) { o.classList.remove('active'); });
  el.classList.add('active');
}

function generateExport() {
  var city = document.getElementById('exportCity').value.trim();
  var type = document.getElementById('exportType').value;
  if (!city) { showToast('Enter a city name first', 'error'); return; }

  showLoadingSpinner(true);
  fetch(WEATHER_API_URL + '/weather?q=' + encodeURIComponent(city) + '&appid=' + API_KEY + '&units=metric')
    .then(function(r) { if (!r.ok) throw new Error('City not found'); return r.json(); })
    .then(function(data) {
      showLoadingSpinner(false);
      var obj = buildExportData(data, type);
      renderExportPreview(obj);
      showToast('Report generated!', 'success');
    })
    .catch(function(err) {
      showLoadingSpinner(false);
      showToast('Error: ' + err.message, 'error');
    });
}

function buildExportData(data, type) {
  var base = {
    city: data.name,
    country: data.sys.country,
    coordinates: { lat: data.coord.lat, lon: data.coord.lon },
    temperature_c: Math.round(data.main.temp),
    feels_like_c: Math.round(data.main.feels_like),
    weather: data.weather[0].description,
    humidity_pct: data.main.humidity,
    wind_speed_ms: data.wind.speed,
    pressure_hpa: data.main.pressure,
    visibility_km: (data.visibility / 1000).toFixed(1),
    timestamp: new Date().toISOString()
  };
  if (type === 'full') {
    base.temp_min_c = Math.round(data.main.temp_min);
    base.temp_max_c = Math.round(data.main.temp_max);
    base.cloud_cover_pct = data.clouds.all;
    base.wind_direction_deg = data.wind.deg || 0;
    base.sunrise = new Date(data.sys.sunrise * 1000).toISOString();
    base.sunset = new Date(data.sys.sunset * 1000).toISOString();
    base.weather_id = data.weather[0].id;
    base.weather_main = data.weather[0].main;
  }
  return base;
}

function renderExportPreview(obj) {
  var preview = document.getElementById('exportPreview');
  var actions = document.getElementById('exportActions');
  var content = '';

  if (selectedFormat === 'json') {
    content = JSON.stringify(obj, null, 2);
    preview.innerHTML = '<pre class="export-code">' + escapeHtml(content) + '</pre>';
  } else if (selectedFormat === 'csv') {
    var keys = Object.keys(obj);
    var vals = keys.map(function(k) { return typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : obj[k]; });
    content = keys.join(',') + '\n' + vals.join(',');
    preview.innerHTML = '<pre class="export-code">' + escapeHtml(content) + '</pre>';
  } else {
    content = Object.entries(obj).map(function(entry) {
      var k = entry[0]; var v = entry[1];
      return (k.replace(/_/g, ' ').toUpperCase() + ':').padEnd(26) + (typeof v === 'object' ? JSON.stringify(v) : v);
    }).join('\n');
    preview.innerHTML = '<pre class="export-code">' + escapeHtml(content) + '</pre>';
  }

  actions.style.display = 'flex';
  window._exportContent = content;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyExport() {
  if (!window._exportContent) return;
  navigator.clipboard.writeText(window._exportContent)
    .then(function() { showToast('Copied to clipboard!', 'success'); })
    .catch(function() { showToast('Could not copy', 'error'); });
}

function downloadExport() {
  if (!window._exportContent) return;
  var ext = selectedFormat;
  var city = document.getElementById('exportCity').value.trim() || 'weather';
  var filename = city.toLowerCase().replace(/\s+/g, '-') + '-report.' + ext;
  var blob = new Blob([window._exportContent], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showToast('Downloaded ' + filename, 'success');
}

// ===================================================
// DARK MODE
// ===================================================

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDarkMode);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    var icon = btn.querySelector('i');
    var label = btn.querySelector('span');
    if (isDarkMode) { icon.className = 'fas fa-sun'; label.textContent = 'Light Mode'; }
    else { icon.className = 'fas fa-moon'; label.textContent = 'Dark Mode'; }
  }
}

// ===================================================
// SIDEBAR
// ===================================================

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===================================================
// SPINNER & TOAST
// ===================================================

function showLoadingSpinner(show) {
  var spinner = document.getElementById('loadingSpinner');
  if (show) spinner.classList.add('active');
  else spinner.classList.remove('active');
}

function showToast(message, type) {
  type = type || 'info';
  var toast = document.getElementById('toast');
  var icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i> ' + message;
  toast.className = 'toast show ' + type;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 3500);
}

// ===================================================
// ENTER KEY HANDLERS
// ===================================================

document.getElementById('cityInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') getWeather();
});

document.addEventListener('DOMContentLoaded', function() {
  var locInput = document.getElementById('locationSearchInput');
  if (locInput) locInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') addLocationFromInput(); });

  var fcInput = document.getElementById('forecastCityInput');
  if (fcInput) fcInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') loadForecast(); });
});

// ===================================================
// INIT
// ===================================================

(function init() {
  var btn = document.getElementById('themeToggle');
  if (btn && isDarkMode) {
    btn.querySelector('i').className = 'fas fa-sun';
    btn.querySelector('span').textContent = 'Light Mode';
  }
})();
