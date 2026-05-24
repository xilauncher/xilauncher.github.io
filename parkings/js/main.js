const APP_STATE = {
  parkings: [],
  filtered: [],
  map: null,
  markerGroup: null,
  userMarker: null,
  activeTab: "tab-list",
};

const COORDS_DB = {
  violón: [37.1654, -3.5966],
  "san agustín": [37.1772, -3.5996],
  "puerta real": [37.1718, -3.5985],
  "pedro antonio": [37.1741, -3.6053],
  cármenes: [37.1528, -3.596],
  congresos: [37.1627, -3.5959],
  triunfo: [37.1843, -3.6006],
  méndez: [37.1787, -3.6083],
  sócrates: [37.1755, -3.6047],
  cruz: [37.1593, -3.6025],
  alsina: [37.1683, -3.5975],
  victoria: [37.171, -3.5965],
  caleta: [37.1845, -3.6095],
  hosp: [37.184, -3.609],
  nieves: [37.184, -3.609],
  "severo ochoa": [37.1824, -3.6041],
  "san lázaro": [37.1852, -3.6033],
  salud: [37.1491, -3.6042],
  pts: [37.1491, -3.6042],
  trauma: [37.1914, -3.6038],
  salón: [37.1678, -3.5925],
  "gran capitán": [37.1771, -3.604],
  "san juan de dios": [37.1802, -3.6022],
  arabial: [37.1706, -3.6067],
  neptuno: [37.1684, -3.6051],
  rex: [37.1713, -3.602],
  maristas: [37.1783, -3.6031],
  "ave maría": [37.1827, -3.5923],
  alhambra: [37.1732, -3.5824],
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMap();
  fetchParkingData();
});

async function fetchParkingData() {
  showLoading(true, "Conectando con Movilidad Granada...");
  try {
    const proxyUrl = "https://cors.xilauncher.workers.dev/?url=";
    const tableUrl =
      "http://www.movilidadgranada.com/aparcamientos/par_tabla.php";

    const tableRes = await fetch(proxyUrl + encodeURIComponent(tableUrl));
    const tableHtml = await tableRes.text();

    parseHtmlToData(tableHtml);

    const now = new Date();
    document.getElementById("lastUpdateText").textContent =
      `Actualizado: ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    showToast("Plazas sincronizadas", "ri-check-line");
  } catch (e) {
    console.error("Error al obtener parkings", e);
    showToast("Error de conexión", "ri-wifi-off-line");
  } finally {
    showLoading(false);
  }
}

function parseHtmlToData(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const rows = doc.querySelectorAll("tr");

  let parsedParkings = [];

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td");
    if (cols.length >= 2) {
      const name = cols[0].textContent.trim();
      let free = 0;
      let status = "Abierto";

      for (let i = 1; i < cols.length; i++) {
        let txt = cols[i].textContent.trim();
        if (/^\d+$/.test(txt)) {
          free = parseInt(txt, 10);
        } else if (
          txt.toLowerCase().includes("abierto") ||
          txt.toLowerCase().includes("cerrado") ||
          txt.toLowerCase().includes("completo")
        ) {
          status = txt;
        }
      }

      if (name.length > 2) {
        parsedParkings.push({
          id: name.toLowerCase().replace(/\s+/g, ""),
          name: name,
          free: free,
          status: status,
          lat: 0,
          lng: 0,
        });
      }
    }
  });

  parsedParkings.forEach((p) => {
    const lowName = p.name.toLowerCase();
    for (let key in COORDS_DB) {
      if (lowName.includes(key)) {
        p.lat = COORDS_DB[key][0];
        p.lng = COORDS_DB[key][1];
        break;
      }
    }
  });

  APP_STATE.parkings = parsedParkings;
  applyFilters();
}

function applyFilters() {
  const query = document
    .getElementById("searchQuery")
    .value.toLowerCase()
    .trim();

  if (query) {
    APP_STATE.filtered = APP_STATE.parkings.filter((p) =>
      p.name.toLowerCase().includes(query),
    );
  } else {
    APP_STATE.filtered = APP_STATE.parkings;
  }

  document.getElementById("parkingsCount").textContent =
    APP_STATE.filtered.length;
  renderList();
  updateMapMarkers();
}

function renderList() {
  const container = document.getElementById("parkingsList");
  container.innerHTML = "";

  if (APP_STATE.filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="ri-error-warning-line" style="font-size: 32px;"></i><p style="margin-top: 10px;">No se encontraron aparcamientos.</p></div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  APP_STATE.filtered.forEach((p) => {
    const isClosed = p.status.toLowerCase().includes("cerrado");
    const isFull = p.status.toLowerCase().includes("completo") || p.free === 0;

    let spotsClass = "spots-high";
    if (isClosed || isFull) spotsClass = "spots-low";
    else if (p.free < 50) spotsClass = "spots-med";

    let displayFree = isClosed ? "-" : p.free;

    const card = document.createElement("div");
    card.className = "station-card";
    card.innerHTML = `
      <div class="station-info">
        <h4 class="station-title">${p.name}</h4>
        <span class="status-badge ${isClosed ? "closed" : "open"}">
          <i class="${isClosed ? "ri-close-circle-fill" : "ri-checkbox-circle-fill"}"></i> ${p.status}
        </span>
      </div>
      <div class="spots-badge ${spotsClass}">
        <span class="spots-num">${displayFree}</span>
        <span class="spots-text">${isClosed ? "Cerrado" : "Libres"}</span>
      </div>
    `;

    if (p.lat !== 0) {
      card.onclick = () => {
        switchTab("tab-map");
        APP_STATE.map.setView([p.lat, p.lng], 16);
      };
    }

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function initMap() {
  const defaultCenter = [37.1773, -3.5985];
  APP_STATE.map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView(defaultCenter, 14);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 20 },
  ).addTo(APP_STATE.map);

  APP_STATE.markerGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
  }).addTo(APP_STATE.map);
}

function updateMapMarkers() {
  if (!APP_STATE.map || !APP_STATE.markerGroup) return;
  APP_STATE.markerGroup.clearLayers();

  let bounds = [];
  let markersToAdd = [];

  APP_STATE.filtered.forEach((p) => {
    if (p.lat === 0) return; // Si no hay coordenadas, saltamos

    const isClosed = p.status.toLowerCase().includes("cerrado");
    const isFull = p.status.toLowerCase().includes("completo") || p.free === 0;

    let pinColor = "#10b981"; // Verde (High)
    if (isClosed || isFull)
      pinColor = "#f43f5e"; // Rojo
    else if (p.free < 50) pinColor = "#f59e0b"; // Naranja

    const customIcon = L.divIcon({
      className: "leaflet-div-icon-price",
      html: `<div style="background-color: ${pinColor};" class="map-price-marker">${isClosed ? "X" : p.free}</div>`,
      iconSize: [32, 16],
      iconAnchor: [16, 8],
    });

    const marker = L.marker([p.lat, p.lng], { icon: customIcon });
    marker.bindPopup(`
      <div style="font-size: 11px; text-align: center; font-family: sans-serif;">
        <strong style="display: block; font-size: 13px; margin-bottom: 4px;">${p.name}</strong>
        <span style="color: ${pinColor}; font-weight: 800;">${isClosed ? "CERRADO" : p.free + " Plazas Libres"}</span>
        <br><br>
        <a href="https://www.google.com/maps/dir/?api=1&destination=$${p.lat},${p.lng}" target="_blank" style="display: block; background: var(--brand-500); color: white; text-decoration: none; padding: 6px; border-radius: 6px; font-weight: 800;">Cómo llegar</a>
      </div>
    `);

    markersToAdd.push(marker);
    bounds.push([p.lat, p.lng]);
  });

  APP_STATE.markerGroup.addLayers(markersToAdd);

  if (bounds.length > 0 && APP_STATE.activeTab === "tab-map") {
    APP_STATE.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast("GPS no soportado.", "ri-error-warning-line");
    return;
  }
  showLoading(true, "Ubicándote en el mapa...");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      switchTab("tab-map");

      if (APP_STATE.userMarker) {
        APP_STATE.userMarker.setLatLng([lat, lng]);
      } else {
        const userIcon = L.divIcon({
          className: "leaflet-user-marker",
          html: `<div class="user-location-dot"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        APP_STATE.userMarker = L.marker([lat, lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(APP_STATE.map);
      }

      APP_STATE.map.setView([lat, lng], 15);
      showToast("Ubicación fijada", "ri-map-pin-line");
      showLoading(false);
    },
    (err) => {
      showLoading(false);
      showToast("Error. Habilita el GPS.", "ri-error-warning-line");
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
}

function switchTab(tabId) {
  document
    .querySelectorAll(".spa-tab")
    .forEach((tab) => tab.classList.add("hidden"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(tabId).classList.remove("hidden");
  document.getElementById(`btn-${tabId}`).classList.add("active");
  APP_STATE.activeTab = tabId;

  if (tabId === "tab-map") {
    setTimeout(() => {
      APP_STATE.map.invalidateSize();
      updateMapMarkers();
    }, 100);
  }
}

function showLoading(show, message = "") {
  document.getElementById("loadingOverlay").style.display = show
    ? "flex"
    : "none";
  if (message)
    document.querySelector(".loading-subtitle").textContent = message;
}

function showToast(message, icon) {
  const toast = document.getElementById("toast");
  document.getElementById("toastMessage").textContent = message;
  document.getElementById("toastIcon").className = icon;
  toast.classList.add("active");
  setTimeout(() => toast.classList.remove("active"), 3500);
}

function initTheme() {
  if (
    localStorage.getItem("parkings_theme") === "dark" ||
    (!localStorage.getItem("parkings_theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").className = "ri-sun-fill";
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("parkings_theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").className = isDark
    ? "ri-sun-fill"
    : "ri-moon-fill";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("../sw.js").catch(() => {}),
  );
}
