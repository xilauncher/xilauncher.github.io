const APP_STATE = {
  currentCity: { name: "Granada", lat: 37.1882, lng: -3.6067 },
  weatherData: null,
  aqiData: null,
  activeTab: "tab-today",
};

const WEATHER_CODES = {
  0: {
    text: "Despejado",
    icon: "ri-sun-fill",
    iconNight: "ri-moon-clear-fill",
  },
  1: {
    text: "Mayormente despejado",
    icon: "ri-sun-cloudy-line",
    iconNight: "ri-moon-cloudy-line",
  },
  2: {
    text: "Parcialmente nublado",
    icon: "ri-cloudy-line",
    iconNight: "ri-cloudy-line",
  },
  3: { text: "Nublado", icon: "ri-cloud-fill", iconNight: "ri-cloud-fill" },
  45: { text: "Niebla", icon: "ri-mist-line", iconNight: "ri-mist-line" },
  48: {
    text: "Niebla escarcha",
    icon: "ri-mist-line",
    iconNight: "ri-mist-line",
  },
  51: {
    text: "Llovizna ligera",
    icon: "ri-drizzle-line",
    iconNight: "ri-drizzle-line",
  },
  53: {
    text: "Llovizna",
    icon: "ri-drizzle-fill",
    iconNight: "ri-drizzle-fill",
  },
  61: {
    text: "Lluvia leve",
    icon: "ri-showers-line",
    iconNight: "ri-showers-line",
  },
  63: {
    text: "Lluvia moderada",
    icon: "ri-heavy-showers-line",
    iconNight: "ri-heavy-showers-line",
  },
  65: {
    text: "Lluvia fuerte",
    icon: "ri-heavy-showers-fill",
    iconNight: "ri-heavy-showers-fill",
  },
  71: { text: "Nieve leve", icon: "ri-snowy-line", iconNight: "ri-snowy-line" },
  73: {
    text: "Nieve moderada",
    icon: "ri-snowy-fill",
    iconNight: "ri-snowy-fill",
  },
  95: {
    text: "Tormenta",
    icon: "ri-thunderstorms-line",
    iconNight: "ri-thunderstorms-line",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  const searchInput = document.getElementById("searchQuery");
  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    if (e.target.value.length >= 3) {
      searchTimeout = setTimeout(() => searchGeocoding(e.target.value), 500);
    } else {
      document.getElementById("searchResults").classList.add("hidden");
    }
  });

  fetchWeatherData();
});

async function fetchWeatherData() {
  showLoading(true);
  const { lat, lng } = APP_STATE.currentCity;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi`;

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(aqiUrl),
    ]);
    APP_STATE.weatherData = await weatherRes.json();
    APP_STATE.aqiData = await aqiRes.json();

    renderUI();
    showToast("Datos actualizados", "ri-check-line", "text-emerald-400");
  } catch (err) {
    showToast("Error de red", "ri-wifi-off-line", "text-rose-400");
  } finally {
    showLoading(false);
  }
}

async function searchGeocoding(query) {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`,
    );
    const data = await res.json();
    const dropdown = document.getElementById("searchResults");

    if (data.results && data.results.length > 0) {
      dropdown.innerHTML = data.results
        .map(
          (city) => `
        <div class="search-item" onclick="selectCity('${city.name}', ${city.latitude}, ${city.longitude})">
          <strong>${city.name}</strong>
          <span>${city.admin1 || ""}, ${city.country}</span>
        </div>
      `,
        )
        .join("");
      dropdown.classList.remove("hidden");
    } else {
      dropdown.classList.add("hidden");
    }
  } catch (e) {
    console.error("Geocoding failed", e);
  }
}

function selectCity(name, lat, lng) {
  APP_STATE.currentCity = { name, lat, lng };
  document.getElementById("searchQuery").value = "";
  document.getElementById("searchResults").classList.add("hidden");
  fetchWeatherData();
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast("GPS no soportado.", "ri-error-warning-line", "text-rose-500");
    return;
  }
  showLoading(true, "Buscando satélites GPS...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        );
        const data = await res.json();
        const cityName =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          "Tu Ubicación";
        selectCity(cityName, lat, lng);
      } catch (e) {
        selectCity("Ubicación GPS", lat, lng);
      }
    },
    () => {
      showLoading(false);
      showToast("Error GPS", "ri-error-warning-line", "text-rose-500");
    },
  );
}

function renderUI() {
  const current = APP_STATE.weatherData.current;
  const daily = APP_STATE.weatherData.daily;
  const hourly = APP_STATE.weatherData.hourly;
  const isNight = current.is_day === 0;

  document.getElementById("cityName").textContent = APP_STATE.currentCity.name;
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("es-ES", options);
  document.getElementById("currentTemp").textContent = Math.round(
    current.temperature_2m,
  );
  document.getElementById("tempFeels").textContent = Math.round(
    current.apparent_temperature,
  );
  document.getElementById("tempMax").textContent = Math.round(
    daily.temperature_2m_max[0],
  );
  document.getElementById("tempMin").textContent = Math.round(
    daily.temperature_2m_min[0],
  );

  const weatherCode = WEATHER_CODES[current.weather_code] || WEATHER_CODES[0];
  document.getElementById("currentCondition").textContent = weatherCode.text;
  document.getElementById("currentIcon").className =
    `weather-main-icon ${isNight ? weatherCode.iconNight : weatherCode.icon}`;

  const card = document.querySelector(".current-weather-card");
  isNight ? card.classList.add("is-night") : card.classList.remove("is-night");

  const hourlyTodayContainer = document.getElementById("hourlyTodayList");
  hourlyTodayContainer.innerHTML = "";

  const nowTimeMs = new Date().getTime();
  let startIndex = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]).getTime() >= nowTimeMs - 3600000) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < startIndex + 24; i++) {
    if (!hourly.time[i]) break;
    const timeDate = new Date(hourly.time[i]);
    const hourLabel =
      i === startIndex
        ? "Ahora"
        : `${timeDate.getHours().toString().padStart(2, "0")}:00`;
    const hCode = WEATHER_CODES[hourly.weather_code[i]] || WEATHER_CODES[0];
    const isNightH = hourly.is_day[i] === 0;
    const hIcon = isNightH ? hCode.iconNight : hCode.icon;
    const hTemp = Math.round(hourly.temperature_2m[i]);

    hourlyTodayContainer.innerHTML += `
      <div class="hourly-card">
        <span class="hc-time">${hourLabel}</span>
        <i class="${hIcon} hc-icon"></i>
        <span class="hc-temp">${hTemp}°</span>
      </div>
    `;
  }

  document.getElementById("metricHumidity").textContent =
    `${current.relative_humidity_2m}%`;
  document.getElementById("metricWind").textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById("metricUV").textContent = Math.round(
    daily.uv_index_max[0],
  );

  const aqiVal = APP_STATE.aqiData.current.european_aqi;
  document.getElementById("metricAQI").textContent = aqiVal;
  const aqiBox = document.getElementById("aqiAlertBox");
  const aqiDesc = document.getElementById("aqiDesc");
  if (aqiVal <= 20) {
    aqiBox.style.backgroundColor = "rgba(16,185,129,0.1)";
    aqiBox.style.color = "#065f46";
    aqiDesc.textContent =
      "Calidad del aire Excelente. Perfecto para deporte al aire libre.";
  } else if (aqiVal <= 50) {
    aqiBox.style.backgroundColor = "rgba(245,158,11,0.1)";
    aqiBox.style.color = "#92400e";
    aqiDesc.textContent =
      "Calidad del aire Razonable. Ligera contaminación detectada.";
  } else {
    aqiBox.style.backgroundColor = "rgba(244,63,94,0.1)";
    aqiBox.style.color = "#9f1239";
    aqiDesc.textContent = "Aire Contaminado. Precaución para grupos sensibles.";
  }

  const forecastContainer = document.getElementById("forecastList");
  forecastContainer.innerHTML = "";

  for (let i = 1; i < 7; i++) {
    const dateObj = new Date(daily.time[i]);
    const dayName = dateObj.toLocaleDateString("es-ES", { weekday: "short" });
    const code = WEATHER_CODES[daily.weather_code[i]] || WEATHER_CODES[0];

    let dayHourlyHtml = '<div class="fc-hourly-scroll">';
    for (let h = i * 24; h < (i + 1) * 24; h++) {
      if (!hourly.time[h]) break;
      const hDate = new Date(hourly.time[h]);
      const hCodeSub =
        WEATHER_CODES[hourly.weather_code[h]] || WEATHER_CODES[0];
      const isNightSub = hourly.is_day[h] === 0;
      const hIconSub = isNightSub ? hCodeSub.iconNight : hCodeSub.icon;

      dayHourlyHtml += `
        <div class="hourly-card">
          <span class="hc-time">${hDate.getHours().toString().padStart(2, "0")}:00</span>
          <i class="${hIconSub} hc-icon"></i>
          <span class="hc-temp">${Math.round(hourly.temperature_2m[h])}°</span>
        </div>
      `;
    }
    dayHourlyHtml += "</div>";

    forecastContainer.innerHTML += `
      <div class="forecast-wrapper" onclick="this.classList.toggle('expanded')">
        <div class="forecast-row">
          <span class="fc-day">${i === 1 ? "Mañana" : dayName}</span>
          <i class="${code.icon} fc-icon"></i>
          <div class="fc-temps">
            <span class="fc-high">${Math.round(daily.temperature_2m_max[i])}°</span>
            <span class="fc-low">${Math.round(daily.temperature_2m_min[i])}°</span>
          </div>
          <i class="ri-arrow-down-s-line expand-icon"></i>
        </div>
        <div class="forecast-hourly-container">
          ${dayHourlyHtml}
        </div>
      </div>
    `;
  }
}

function switchTab(tabId) {
  document
    .querySelectorAll(".spa-tab")
    .forEach((t) => t.classList.add("hidden"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(tabId).classList.remove("hidden");
  document.getElementById(`btn-${tabId}`).classList.add("active");
  document.getElementById("mainScrollArea").scrollTop = 0;
}

function showLoading(show, msg = "") {
  document.getElementById("loadingOverlay").style.display = show
    ? "flex"
    : "none";
  if (msg) document.querySelector(".loading-subtitle").textContent = msg;
}

function showToast(message, icon = "ri-information-line", colorClass = "") {
  const toast = document.getElementById("toast");
  document.getElementById("toastMessage").textContent = message;
  document.getElementById("toastIcon").className = `${icon} ${colorClass}`;
  toast.classList.add("active");
  setTimeout(() => toast.classList.remove("active"), 3500);
}

function initTheme() {
  if (
    localStorage.getItem("tiempo_theme") === "dark" ||
    (!localStorage.getItem("tiempo_theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").className = "ri-sun-fill";
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("tiempo_theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").className = isDark
    ? "ri-sun-fill"
    : "ri-moon-fill";
}
