const APP_STATE = {
  cortes: [],
  filtered: [],
  map: null,
  markerGroup: null,
  activeTab: "tab-list",
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMap();
  fetchCortes();
});

async function fetchCortes() {
  showLoading(true, "Consultando Ayuntamiento...");
  try {
    const proxyUrl = "https://cors.xilauncher.workers.dev/?url=";
    const rssUrl = "http://www.movilidadgranada.com/app/noticias/rss.php";

    const res = await fetch(proxyUrl + encodeURIComponent(rssUrl));
    const xmlText = await res.text();

    parseRSS(xmlText);

    const now = new Date();
    document.getElementById("lastUpdateText").textContent =
      `Actualizado: ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    showToast("Datos actualizados", "ri-check-line");
  } catch (e) {
    console.error("Error cargando RSS:", e);
    showToast("Error de conexión", "ri-wifi-off-line");
  } finally {
    showLoading(false);
  }
}

function parseRSS(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const items = xmlDoc.querySelectorAll("item");

  let parsedCortes = [];

  items.forEach((item) => {
    const title =
      item.querySelector("title")?.textContent || "Incidencia sin título";
    const link = item.querySelector("link")?.textContent || "#";
    const content = item.querySelector("description")?.textContent || "";

    let endDateRaw = "";
    let endTimestamp = Number.MAX_SAFE_INTEGER;
    const matchDate = content.match(
      /Fin de la publicación:\s*(\d{4}-\d{2}-\d{2})/i,
    );
    if (matchDate) {
      endDateRaw = matchDate[1];
      const d = new Date(endDateRaw);
      endTimestamp = d.getTime();
    }

    let endDateFormatted = "Indefinido / Sin fecha";
    if (endDateRaw) {
      const parts = endDateRaw.split("-");
      if (parts.length === 3)
        endDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    let type = "Otro";
    const matchType = content.match(/Tipo de corte:\s*([^<]+)/i);
    if (matchType) type = matchType[1].trim();

    let buses = "";
    const matchBuses = content.match(/Posible afección a líneas:\s*([^<]+)/i);
    if (matchBuses) buses = matchBuses[1].trim();

    let lat = null,
      lng = null;
    const matchLoc = content.match(/Ubicación[^:]*:\s*\(([^,]+),\s*([^)]+)\)/i);
    if (matchLoc) {
      lat = parseFloat(matchLoc[1].trim());
      lng = parseFloat(matchLoc[2].trim());
    }

    parsedCortes.push({
      title,
      link,
      type,
      endDateFormatted,
      endTimestamp,
      buses,
      lat,
      lng,
    });
  });

  parsedCortes.sort((a, b) => a.endTimestamp - b.endTimestamp);

  APP_STATE.cortes = parsedCortes;

  updateBusBanner();
  applyFilters();
}

function updateBusBanner() {
  const banner = document.getElementById("busBanner");
  const linesSpan = document.getElementById("busBannerLines");

  let allLines = new Set();

  APP_STATE.cortes.forEach((c) => {
    if (c.buses) {
      let rawText = c.buses.replace(/ y /gi, ",").replace(/ e /gi, ",");
      let rawLines = rawText.split(",");
      rawLines.forEach((l) => {
        let cleaned = l.trim().toUpperCase();
        if (cleaned && cleaned.length < 5) {
          allLines.add(cleaned);
        }
      });
    }
  });

  if (allLines.size > 0) {
    let linesArray = Array.from(allLines).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

    let formattedText = "";
    if (linesArray.length === 1) {
      formattedText = linesArray[0];
    } else {
      const last = linesArray.pop();
      formattedText = linesArray.join(", ") + " y " + last;
    }

    linesSpan.textContent = formattedText;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function applyFilters() {
  const query = document
    .getElementById("searchQuery")
    .value.toLowerCase()
    .trim();
  if (query) {
    APP_STATE.filtered = APP_STATE.cortes.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.type.toLowerCase().includes(query) ||
        c.buses.toLowerCase().includes(query),
    );
  } else {
    APP_STATE.filtered = APP_STATE.cortes;
  }

  document.getElementById("cortesCount").textContent =
    APP_STATE.filtered.length;
  renderList();
  updateMapMarkers();
}

function renderList() {
  const container = document.getElementById("cortesList");
  container.innerHTML = "";

  if (APP_STATE.filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="ri-search-line" style="font-size: 32px;"></i><p style="margin-top: 10px;">No hay incidencias.</p></div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  APP_STATE.filtered.forEach((c) => {
    const typeLower = c.type.toLowerCase();
    let bgClass = "bg-default";

    if (typeLower.includes("total")) bgClass = "bg-total";
    else if (typeLower.includes("parcial")) bgClass = "bg-parcial";
    else if (typeLower.includes("puntual")) bgClass = "bg-puntual";
    else if (typeLower.includes("horario")) bgClass = "bg-horario";
    else if (typeLower.includes("reserva")) bgClass = "bg-reserva";
    else if (typeLower.includes("procesi")) bgClass = "bg-procesion";
    else if (typeLower.includes("deporte") || typeLower.includes("deportiv"))
      bgClass = "bg-deporte";
    else if (typeLower.includes("manifestaci")) bgClass = "bg-manifestacion";
    else if (typeLower.includes("civico") || typeLower.includes("cívico"))
      bgClass = "bg-civico";
    else if (typeLower.includes("evento")) bgClass = "bg-evento";

    const card = document.createElement("div");
    card.className = "corte-card";

    let busesHtml = c.buses
      ? `<div class="corte-bus"><i class="ri-bus-wifi-line"></i> <span><strong>Desvíos:</strong> ${c.buses}</span></div>`
      : "";

    card.innerHTML = `
      <div class="corte-header">
        <h4 class="corte-title">${c.title}</h4>
        <span class="corte-tipo ${bgClass}">${c.type}</span>
      </div>
      <div class="corte-details">
        <div class="corte-date"><i class="ri-calendar-check-line"></i> Hasta: ${c.endDateFormatted}</div>
        ${busesHtml}
      </div>
    `;

    if (c.lat && c.lng) {
      card.onclick = () => {
        switchTab("tab-map");
        APP_STATE.map.setView([c.lat, c.lng], 16);
      };
    } else {
      card.onclick = () => window.open(c.link, "_blank");
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
    maxClusterRadius: 35,
  }).addTo(APP_STATE.map);
}

function updateMapMarkers() {
  if (!APP_STATE.map || !APP_STATE.markerGroup) return;
  APP_STATE.markerGroup.clearLayers();

  let bounds = [];
  let markersToAdd = [];

  APP_STATE.filtered.forEach((c) => {
    if (!c.lat || !c.lng) return;

    const typeLower = c.type.toLowerCase();
    let pinColor = "#64748b";
    let iconClass = "ri-alert-fill";

    if (typeLower.includes("total")) {
      pinColor = "#ef4444";
      iconClass = "ri-close-circle-fill";
    } else if (typeLower.includes("parcial")) {
      pinColor = "#f97316";
      iconClass = "ri-error-warning-fill";
    } else if (typeLower.includes("puntual")) {
      pinColor = "#f59e0b";
      iconClass = "ri-timer-flash-fill";
    } else if (typeLower.includes("horario")) {
      pinColor = "#6366f1";
      iconClass = "ri-time-fill";
    } else if (typeLower.includes("reserva")) {
      pinColor = "#14b8a6";
      iconClass = "ri-parking-box-fill";
    } else if (typeLower.includes("procesi")) {
      pinColor = "#a855f7";
      iconClass = "ri-group-fill";
    } else if (
      typeLower.includes("deporte") ||
      typeLower.includes("deportiv")
    ) {
      pinColor = "#10b981";
      iconClass = "ri-run-fill";
    } else if (typeLower.includes("manifestaci")) {
      pinColor = "#3b82f6";
      iconClass = "ri-megaphone-fill";
    } else if (typeLower.includes("civico") || typeLower.includes("cívico")) {
      pinColor = "#06b6d4";
      iconClass = "ri-building-fill";
    } else if (typeLower.includes("evento")) {
      pinColor = "#3b82f6";
      iconClass = "ri-calendar-event-fill";
    }

    const customIcon = L.divIcon({
      className: "leaflet-div-icon-marker",
      html: `<div style="background-color: ${pinColor};" class="map-icon-marker"><i class="${iconClass}"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([c.lat, c.lng], { icon: customIcon });
    marker.bindPopup(`
      <div style="font-size: 11px; text-align: center; font-family: sans-serif; max-width: 220px;">
        <strong style="display: block; font-size: 13px; margin-bottom: 6px;">${c.title}</strong>
        <span style="color: ${pinColor}; font-weight: 800; text-transform: uppercase;">${c.type}</span><br>
        <span style="display: block; margin-top: 4px; color: #475569;">Hasta: ${c.endDateFormatted}</span>
        ${c.buses ? `<span style="display: block; margin-top: 4px; color: #d97706; font-weight:bold;">Líneas: ${c.buses}</span>` : ""}
      </div>
    `);

    markersToAdd.push(marker);
    bounds.push([c.lat, c.lng]);
  });

  APP_STATE.markerGroup.addLayers(markersToAdd);
  if (bounds.length > 0 && APP_STATE.activeTab === "tab-map") {
    APP_STATE.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
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
  APP_STATE.activeTab = tabId;

  if (tabId === "tab-map") {
    setTimeout(() => {
      APP_STATE.map.invalidateSize();
      updateMapMarkers();
    }, 100);
  }
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast("GPS no soportado.", "ri-error-warning-line");
    return;
  }
  showLoading(true, "Ubicándote...");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      switchTab("tab-map");
      APP_STATE.map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      showLoading(false);
    },
    () => {
      showLoading(false);
      showToast("Error GPS", "ri-error-warning-line");
    },
  );
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
    localStorage.getItem("cortes_theme") === "dark" ||
    (!localStorage.getItem("cortes_theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").className = "ri-sun-fill";
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("cortes_theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").className = isDark
    ? "ri-sun-fill"
    : "ri-moon-fill";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("../sw.js").catch(() => {}),
  );
}
