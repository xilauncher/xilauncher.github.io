const APP_STATE = {
  stations: [],
  favorites: JSON.parse(localStorage.getItem("radio_favs")) || [],
  currentStation: null,
  currentView: "explore",
  apiBaseUrl: "https://de1.api.radio-browser.info",
};

const audioObj = document.getElementById("audioElement");

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupAudioEvents();
  initRadioBrowser();

  const searchInput = document.getElementById("searchQuery");
  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    searchTimeout = setTimeout(() => {
      if (query && APP_STATE.currentView === "favs") {
        switchView("explore");
      }
      fetchStations(query);
    }, 600);
  });
});

async function initRadioBrowser() {
  try {
    const res = await fetch("https://all.api.radio-browser.info/json/servers");
    const servers = await res.json();
    if (servers.length > 0) APP_STATE.apiBaseUrl = `https://${servers[0].name}`;
  } catch (e) {
    console.warn("Usando servidor por defecto", e);
  }
  fetchStations();
}

async function fetchStations(query = "") {
  showLoading(true);
  try {
    let url = "";
    if (query) {
      document.getElementById("listTitle").textContent = "Resultados";
      url = `${APP_STATE.apiBaseUrl}/json/stations/search?name=${encodeURIComponent(query)}&countrycode=ES&limit=40&order=clickcount&reverse=true&hidebroken=true`;
    } else {
      document.getElementById("listTitle").textContent = "Top España";
      url = `${APP_STATE.apiBaseUrl}/json/stations/search?countrycode=ES&limit=50&order=clickcount&reverse=true&hidebroken=true`;
    }

    const res = await fetch(url);
    const data = await res.json();
    APP_STATE.stations = data;

    if (APP_STATE.currentView === "explore")
      renderRadioList(APP_STATE.stations);
  } catch (err) {
    showToast("Error conectando con la API", "ri-wifi-off-line");
    console.error(err);
  } finally {
    showLoading(false);
  }
}

function switchView(view) {
  APP_STATE.currentView = view;
  document
    .getElementById("tab-explore")
    .classList.toggle("active", view === "explore");
  document
    .getElementById("tab-favs")
    .classList.toggle("active", view === "favs");

  if (view === "favs") {
    document.getElementById("listTitle").textContent = "Tus Guardadas";
    document.getElementById("searchQuery").value = "";
    renderRadioList(APP_STATE.favorites);
  } else {
    const query = document.getElementById("searchQuery").value.trim();
    document.getElementById("listTitle").textContent = query
      ? "Resultados"
      : "Top España";
    renderRadioList(APP_STATE.stations);
  }
}

function toggleFavorite(stationId, event) {
  event.stopPropagation();

  const station =
    APP_STATE.stations.find((s) => s.stationuuid === stationId) ||
    APP_STATE.favorites.find((s) => s.stationuuid === stationId);
  if (!station) return;

  const favIndex = APP_STATE.favorites.findIndex(
    (f) => f.stationuuid === stationId,
  );

  if (favIndex > -1) {
    APP_STATE.favorites.splice(favIndex, 1);
    showToast("Eliminada de favoritas", "ri-star-line");
  } else {
    APP_STATE.favorites.push(station);
    showToast("Añadida a favoritas", "ri-star-fill text-amber-400");
  }

  localStorage.setItem("radio_favs", JSON.stringify(APP_STATE.favorites));

  if (APP_STATE.currentView === "favs") {
    renderRadioList(APP_STATE.favorites);
  } else {
    renderRadioList(APP_STATE.stations);
  }
}

function renderRadioList(dataList = APP_STATE.stations) {
  const container = document.getElementById("radioList");

  if (dataList.length === 0) {
    const msg =
      APP_STATE.currentView === "favs"
        ? "Aún no tienes emisoras guardadas."
        : "No se encontraron emisoras.";
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;"><i class="ri-error-warning-line" style="font-size: 32px;"></i><p style="margin-top: 10px;">${msg}</p></div>`;
    return;
  }

  container.innerHTML = dataList
    .map((station) => {
      const mainTag = station.tags
        ? station.tags.split(",")[0].trim()
        : "Radio";
      const isFav = APP_STATE.favorites.some(
        (f) => f.stationuuid === station.stationuuid,
      );
      const isActive =
        APP_STATE.currentStation &&
        APP_STATE.currentStation.stationuuid === station.stationuuid;

      const imageHtml = station.favicon
        ? `<img src="${station.favicon}" class="radio-logo-img" alt="${station.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`
        : "";

      return `
      <div class="radio-card ${isActive ? "active" : ""}" id="card-${station.stationuuid}" onclick="playStation('${station.stationuuid}')">
        
        <button class="radio-fav-btn ${isFav ? "active" : ""}" onclick="toggleFavorite('${station.stationuuid}', event)">
          <i class="${isFav ? "ri-star-fill" : "ri-star-line"}"></i>
        </button>

        <div class="radio-logo-wrapper">
          ${imageHtml}
          <i class="ri-radio-2-line fallback-icon" style="${station.favicon ? "display:none;" : "display:block;"}"></i>
        </div>
        <div class="radio-name">${station.name.trim()}</div>
        <span class="radio-tag">${mainTag}</span>
      </div>
    `;
    })
    .join("");
}

function playStation(stationId) {
  const station =
    APP_STATE.stations.find((s) => s.stationuuid === stationId) ||
    APP_STATE.favorites.find((s) => s.stationuuid === stationId);
  if (!station) return;

  if (
    APP_STATE.currentStation &&
    APP_STATE.currentStation.stationuuid === stationId
  ) {
    togglePlay();
    return;
  }

  if (APP_STATE.currentStation) {
    const oldCard = document.getElementById(
      `card-${APP_STATE.currentStation.stationuuid}`,
    );
    if (oldCard) oldCard.classList.remove("active");
  }

  APP_STATE.currentStation = station;
  const newCard = document.getElementById(`card-${station.stationuuid}`);
  if (newCard) newCard.classList.add("active");

  document.getElementById("bottomPlayer").classList.remove("hidden");
  document.getElementById("playerStationName").textContent =
    station.name.trim();

  const playerLogo = document.getElementById("playerLogo");
  const defaultIcon = document.getElementById("playerIcon");
  if (station.favicon) {
    playerLogo.src = station.favicon;
    playerLogo.classList.remove("hidden");
    defaultIcon.classList.add("hidden");
    playerLogo.onerror = () => {
      playerLogo.classList.add("hidden");
      defaultIcon.classList.remove("hidden");
    };
  } else {
    playerLogo.classList.add("hidden");
    defaultIcon.classList.remove("hidden");
  }

  audioObj.src = station.url_resolved || station.url;
  audioObj.play().catch((e) => {
    console.error("Error al reproducir", e);
    showToast("La emisora está caída", "ri-error-warning-line");
  });

  setupMediaSession(station);
}

function togglePlay() {
  if (!APP_STATE.currentStation) return;
  if (audioObj.paused) audioObj.play();
  else audioObj.pause();
}

function setupAudioEvents() {
  const playIcon = document.getElementById("playIcon");
  const visualizer = document.getElementById("visualizer");
  const spinner = document.getElementById("playerLoading");

  audioObj.addEventListener("playing", () => {
    playIcon.className = "ri-pause-fill";
    visualizer.classList.remove("hidden");
    spinner.classList.add("hidden");
    document.getElementById("playerStatus").textContent =
      "Emitiendo en directo";
  });

  audioObj.addEventListener("pause", () => {
    playIcon.className = "ri-play-fill";
    visualizer.classList.add("hidden");
  });

  audioObj.addEventListener("waiting", () => {
    spinner.classList.remove("hidden");
    document.getElementById("playerStatus").textContent = "Cargando señal...";
  });

  audioObj.addEventListener("error", () => {
    spinner.classList.add("hidden");
    document.getElementById("playerStatus").textContent = "Error de conexión";
    playIcon.className = "ri-play-fill";
    visualizer.classList.add("hidden");
  });
}

function setupMediaSession(station) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name.trim(),
      artist: station.tags ? station.tags.split(",")[0].trim() : "Radio",
      album: "XiLauncher Radio",
      artwork: station.favicon
        ? [{ src: station.favicon, sizes: "512x512", type: "image/png" }]
        : [{ src: "../logo.png", sizes: "512x512", type: "image/png" }],
    });

    navigator.mediaSession.setActionHandler("play", () => audioObj.play());
    navigator.mediaSession.setActionHandler("pause", () => audioObj.pause());
    navigator.mediaSession.setActionHandler("stop", () => {
      audioObj.pause();
      document.getElementById("bottomPlayer").classList.add("hidden");
      if (APP_STATE.currentStation) {
        const card = document.getElementById(
          `card-${APP_STATE.currentStation.stationuuid}`,
        );
        if (card) card.classList.remove("active");
      }
      APP_STATE.currentStation = null;
    });
  }
}

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = show ? "flex" : "none";
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
    localStorage.getItem("radio_theme") === "dark" ||
    (!localStorage.getItem("radio_theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").className = "ri-sun-fill";
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("radio_theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").className = isDark
    ? "ri-sun-fill"
    : "ri-moon-fill";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("../sw.js").catch(() => {}),
  );
}
