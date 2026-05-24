const APP_STATE = {
  network: "urbano",
  view: "lineas",
  map: null,
  routeMap: null,
  routeLayer: null,
  lineasGlobales: [],
  lineasFiltradas: [],
  currentLineData: null,
  currentDir: "ida",
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMainMap();
  initRouteMap();
  loadNetworkData("urbano");
});

function switchNetwork(network) {
  APP_STATE.network = network;

  document
    .querySelectorAll(".net-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`net-${network}`).classList.add("active");

  let colorVar = "var(--brand-600)";
  if (network === "urbano") colorVar = "var(--net-urbano)";
  else if (network === "consorcio") colorVar = "var(--net-consorcio)";
  else if (network === "metro") colorVar = "var(--net-metro)";
  document.documentElement.style.setProperty("--brand-600", colorVar);

  loadNetworkData(network);
}

function switchView(view) {
  APP_STATE.view = view;

  document
    .querySelectorAll(".spa-view")
    .forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`btn-view-${view}`).classList.add("active");

  if (view === "mapa" && APP_STATE.map) {
    setTimeout(() => APP_STATE.map.invalidateSize(), 100);
  }
}

async function loadNetworkData(network) {
  showLoading(true, "Cargando red...", network.toUpperCase());
  document.getElementById("searchLineas").value = "";

  try {
    const res = await fetch(`data/${network}/lineas.json`);
    if (!res.ok) throw new Error("No encontrado");

    APP_STATE.lineasGlobales = await res.json();
    APP_STATE.lineasFiltradas = APP_STATE.lineasGlobales;
    renderLineas();
  } catch (e) {
    console.error(e);
    document.getElementById("lineasList").innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px;">
        <i class="ri-error-warning-line" style="font-size: 32px;"></i>
        <p style="margin-top: 10px;">Error al cargar datos. ¿Se ha ejecutado el Python?</p>
      </div>`;
  } finally {
    showLoading(false);
  }
}

function filterLineas() {
  const q = document.getElementById("searchLineas").value.toLowerCase().trim();
  if (q) {
    APP_STATE.lineasFiltradas = APP_STATE.lineasGlobales.filter(
      (l) =>
        l.short_name.toLowerCase().includes(q) ||
        l.long_name.toLowerCase().includes(q),
    );
  } else {
    APP_STATE.lineasFiltradas = APP_STATE.lineasGlobales;
  }
  renderLineas();
}

function renderLineas() {
  const container = document.getElementById("lineasList");
  container.innerHTML = "";

  if (APP_STATE.lineasFiltradas.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">No se encontraron líneas.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  APP_STATE.lineasFiltradas.forEach((l) => {
    const card = document.createElement("div");
    card.className = "linea-card";
    card.onclick = () => openLineModal(l.id);
    card.innerHTML = `
      <div class="linea-badge" style="background-color: ${l.color}">${l.short_name}</div>
      <div class="linea-info">
        <span class="linea-name">${l.long_name}</span>
        <span class="linea-sub">Ver recorrido y horarios</span>
      </div>
      <i class="ri-arrow-right-s-line linea-arrow"></i>
    `;
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

async function openLineModal(lineId) {
  showLoading(true, "Cargando ruta...");
  try {
    const res = await fetch(
      `data/${APP_STATE.network}/detalles/${lineId}.json`,
    );
    if (!res.ok) throw new Error("JSON no encontrado");

    APP_STATE.currentLineData = await res.json();
    APP_STATE.currentDir = "ida";

    const info = APP_STATE.currentLineData.info;
    const header = document.getElementById("lmHeader");
    header.style.background = info.color;
    document.getElementById("lmBadge").textContent = info.short_name;
    document.getElementById("lmBadge").style.color = info.color;
    document.getElementById("lmName").textContent = info.long_name;

    const hasVuelta = APP_STATE.currentLineData.vuelta.paradas.length > 0;
    document.getElementById("lmDirVuelta").style.display = hasVuelta
      ? "block"
      : "none";

    document.getElementById("lineDetailModal").classList.remove("hidden");

    switchLineTab("paradas");

    setTimeout(() => {
      APP_STATE.routeMap.invalidateSize();
      renderLineDirection();
    }, 200);
  } catch (e) {
    console.error(e);
    showToast("Datos de línea no disponibles", "ri-error-warning-line");
  } finally {
    showLoading(false);
  }
}

function closeLineModal() {
  document.getElementById("lineDetailModal").classList.add("hidden");
}

function switchDirection(dir) {
  APP_STATE.currentDir = dir;
  document
    .querySelectorAll(".lm-dir-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .getElementById(`lmDir${dir === "ida" ? "Ida" : "Vuelta"}`)
    .classList.add("active");
  renderLineDirection();
}

function switchLineTab(tab) {
  document
    .querySelectorAll(".lm-tab")
    .forEach((b) => b.classList.remove("active"));
  document
    .getElementById(`lmTab${tab === "paradas" ? "Paradas" : "Horarios"}`)
    .classList.add("active");

  if (tab === "paradas") {
    document.getElementById("lmContentParadas").classList.remove("hidden");
    document.getElementById("lmContentHorarios").classList.add("hidden");
  } else {
    document.getElementById("lmContentParadas").classList.add("hidden");
    document.getElementById("lmContentHorarios").classList.remove("hidden");
  }
}

function renderLineDirection() {
  const data = APP_STATE.currentLineData[APP_STATE.currentDir];
  const info = APP_STATE.currentLineData.info;

  if (APP_STATE.routeLayer) {
    APP_STATE.routeMap.removeLayer(APP_STATE.routeLayer);
  }

  const layerGroup = L.featureGroup();

  if (data.shape && data.shape.length > 0) {
    const poly = L.polyline(data.shape, {
      color: info.color,
      weight: 5,
      opacity: 0.8,
    });
    layerGroup.addLayer(poly);
  }

  data.paradas.forEach((p, idx) => {
    const dot = L.circleMarker([p.lat, p.lon], {
      radius: 4,
      fillColor: "white",
      color: info.color,
      weight: 2,
      fillOpacity: 1,
    });
    dot.bindPopup(`<b>${p.name}</b><br>ID: ${p.id}`);
    layerGroup.addLayer(dot);
  });

  APP_STATE.routeLayer = layerGroup;
  APP_STATE.routeMap.addLayer(APP_STATE.routeLayer);

  if (data.shape && data.shape.length > 0) {
    APP_STATE.routeMap.fitBounds(APP_STATE.routeLayer.getBounds(), {
      padding: [20, 20],
    });
  }

  const paradasHtml = data.paradas
    .map((p) => {
      let transbordosHtml = "";
      if (p.transbordos && p.transbordos.length > 0) {
        transbordosHtml =
          `<div class="transbordos-container">` +
          p.transbordos
            .map(
              (t) =>
                `<span class="transbordo-badge" style="background-color: ${t.color}">${t.short_name}</span>`,
            )
            .join("") +
          `</div>`;
      }

      return `
      <div class="timeline-item">
        <div class="timeline-dot" style="border-color: ${info.color};"></div>
        <span class="timeline-name">${p.name}</span>
        <span class="timeline-id">Parada: ${p.id}</span>
        ${transbordosHtml}
      </div>
    `;
    })
    .join("");

  document.getElementById("lmContentParadas").innerHTML = paradasHtml;

  const horariosBox = document.getElementById("lmContentHorarios");
  horariosBox.innerHTML = "";

  const hData = data.horarios_cabecera;

  let hayHorarios = false;

  ["L-J", "V", "S", "D"].forEach((dia_key) => {
    if (hData[dia_key] && hData[dia_key].length > 0) {
      hayHorarios = true;
      let diaLabel = dia_key;
      if (dia_key === "L-J") diaLabel = "Lunes a Jueves";
      if (dia_key === "V") diaLabel = "Viernes";
      if (dia_key === "S") diaLabel = "Sábados";
      if (dia_key === "D") diaLabel = "Domingos y Festivos";

      const timesHtml = hData[dia_key]
        .map((t) => `<div class="sched-time">${t}</div>`)
        .join("");
      horariosBox.innerHTML += `
        <div class="sched-day-card">
          <div class="sched-day-header">${diaLabel}</div>
          <div class="sched-grid">${timesHtml}</div>
        </div>
      `;
    }
  });

  if (!hayHorarios) {
    horariosBox.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">No hay horarios teóricos registrados para esta dirección.</p>`;
  }
}

function initMainMap() {
  APP_STATE.map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([37.1773, -3.5985], 13);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 20 },
  ).addTo(APP_STATE.map);
}

function initRouteMap() {
  APP_STATE.routeMap = L.map("routeMap", {
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    tap: false,
  }).setView([37.1773, -3.5985], 13);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 20 },
  ).addTo(APP_STATE.routeMap);
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast("GPS no soportado", "ri-error-warning-line");
    return;
  }
  showToast("Ubicándote...", "ri-map-pin-user-line");
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      APP_STATE.map.setView([pos.coords.latitude, pos.coords.longitude], 16),
    () => showToast("Error GPS", "ri-error-warning-line"),
  );
}

function showLoading(show, title = "Cargando...", sub = "") {
  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = show ? "flex" : "none";
  if (show) {
    document.getElementById("loadingTitle").textContent = title;
    document.getElementById("loadingSub").textContent = sub;
  }
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
    localStorage.getItem("transporte_theme") === "dark" ||
    (!localStorage.getItem("transporte_theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").className = "ri-sun-fill";
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("transporte_theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").className = isDark
    ? "ri-sun-fill"
    : "ri-moon-fill";
}
