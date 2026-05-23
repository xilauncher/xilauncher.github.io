const APP_STATE = {
  gasStations: [],
  filteredStations: [],
  provinces: [],
  municipalities: [],
  favorites: [],
  userLocation: null,
  activeTab: "tab-list",
  selectedFuel: "gasolina95",
  selectedProvince: "TODAS",
  selectedMunicipality: "TODOS",
  searchQuery: "",
  isOfflineDemo: false,
  map: null,
  markerGroup: null,
};

const FUEL_KEYS = {
  gasolina95: { label: "Gasolina 95 E5", key: "Precio Gasolina 95 E5" },
  gasolina98: { label: "Gasolina 98 E5", key: "Precio Gasolina 98 E5" },
  dieselA: { label: "Diésel / Gasóleo A", key: "Precio Gasoleo A" },
  glp: { label: "Autogás / GLP", key: "Precio Gases licuados del petróleo" },
};

const DB_NAME = "GasoEspanaDB";
const STORE_NAME = "gasStationsStore";

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveStationsToDB(data) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, "latest_data");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Error guardando en IndexedDB", e);
  }
}

async function getStationsFromDB() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("latest_data");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Error leyendo de IndexedDB", e);
    return null;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const savedFavs = localStorage.getItem("gasoesp_favs");
  if (savedFavs) {
    APP_STATE.favorites = JSON.parse(savedFavs);
  }

  if (
    localStorage.getItem("gasoesp_theme") === "dark" ||
    (!localStorage.getItem("gasoesp_theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
    document.getElementById("themeIcon").className = "ri-sun-fill";
  }

  document.getElementById("filterSheet").addEventListener("click", (e) => {
    if (e.target === document.getElementById("filterSheet"))
      toggleFilterSheet(false);
  });

  initMap();
  fetchGasPrices();
});

async function fetchGasPrices() {
  showLoading(true, "Descargando carburantes oficiales de España...");
  const apiEndpoint =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
  const proxyUrl = "https://proxy.contacto-granago.workers.dev/?url=";

  let dataFetched = null;

  try {
    const url = `${proxyUrl}${encodeURIComponent(apiEndpoint)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      dataFetched = await response.json();
    }
  } catch (err) {
    console.warn("Fallo al conectar con el proxy:", err);
  }

  if (
    dataFetched &&
    dataFetched.ListaEESSPrecio &&
    dataFetched.ListaEESSPrecio.length > 0
  ) {
    APP_STATE.gasStations = dataFetched.ListaEESSPrecio;
    APP_STATE.isOfflineDemo = false;

    const syncDate =
      dataFetched.Fecha || new Date().toLocaleDateString("es-ES");
    localStorage.setItem("gasoesp_last_sync", syncDate);

    await saveStationsToDB(dataFetched);

    document.getElementById("dataStatus").textContent = "Conectado";
    showToast(
      "✓ Sincronizado en tiempo real.",
      "ri-checkbox-circle-line",
      "text-emerald-400",
    );

    processDataset();
    showLoading(false);
  } else {
    loadOfflineData("auto");
  }
}

async function loadOfflineData(triggerSource) {
  showLoading(true, "Buscando datos guardados en el dispositivo...");

  const cachedData = await getStationsFromDB();
  const statusElement = document.getElementById("dataStatus");
  const lastSync = localStorage.getItem("gasoesp_last_sync") || "Desconocida";

  if (
    cachedData &&
    cachedData.ListaEESSPrecio &&
    cachedData.ListaEESSPrecio.length > 0
  ) {
    APP_STATE.gasStations = cachedData.ListaEESSPrecio;

    statusElement.textContent = `Caché (Última vez: ${lastSync})`;
    statusElement.className = "status-text text-amber-400";

    showToast(
      "Sin conexión: Usando últimos precios guardados.",
      "ri-database-2-line",
      "text-amber-400",
    );

    processDataset();
    showLoading(false);
  } else {
    APP_STATE.gasStations = [];

    statusElement.textContent = `Sin conexión ni datos`;
    statusElement.className = "status-text text-rose-400";

    showToast(
      "Conexión requerida para el primer uso.",
      "ri-wifi-off-line",
      "text-rose-400",
    );

    showLoading(false);

    const container = document.getElementById("stationsList");
    container.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
              <i class="ri-wifi-off-line" style="font-size: 48px; color: var(--accent-rose-dark); margin-bottom: 16px;"></i>
              <h3 style="font-weight: 800; font-size: 16px; color: var(--text-primary); margin-bottom: 8px;">Base de datos vacía</h3>
              <p style="font-size: 12px; line-height: 1.5; text-align: center; max-width: 280px;">
                Debes abrir esta aplicación con conexión a <strong>Internet al menos una vez</strong> para poder descargar y guardar los precios de las gasolineras en tu dispositivo.
              </p>
              <button onclick="fetchGasPrices()" style="margin-top: 24px; background-color: var(--brand-500); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(2, 132, 195, 0.3);">
                <i class="ri-refresh-line"></i> Reintentar conexión
              </button>
            </div>
          `;

    document.getElementById("stationsCount").textContent = "0";
    document.getElementById("filterDetails").textContent =
      "Sin datos disponibles";
  }
}

function processDataset() {
  const provincesSet = new Set();
  APP_STATE.gasStations.forEach((st) => {
    if (st.Provincia) provincesSet.add(st.Provincia.toUpperCase().trim());
  });
  APP_STATE.provinces = Array.from(provincesSet).sort();

  const provSelector = document.getElementById("provinceSelector");
  provSelector.innerHTML = '<option value="TODAS">-- Toda España --</option>';
  APP_STATE.provinces.forEach((prov) =>
    provSelector.insertAdjacentHTML(
      "beforeend",
      `<option value="${prov}">${prov}</option>`,
    ),
  );
  applyFilters();
}

function handleProvinceChange() {
  const selectedProv = document.getElementById("provinceSelector").value;
  APP_STATE.selectedProvince = selectedProv;
  const muniSelector = document.getElementById("municipalitySelector");
  muniSelector.innerHTML =
    '<option value="TODOS">-- Todos los Municipios --</option>';

  if (selectedProv === "TODAS") {
    muniSelector.disabled = true;
    APP_STATE.selectedMunicipality = "TODOS";
  } else {
    muniSelector.disabled = false;
    const munisSet = new Set();
    APP_STATE.gasStations.forEach((st) => {
      if (
        st.Provincia &&
        st.Provincia.toUpperCase().trim() === selectedProv &&
        st.Municipio
      )
        munisSet.add(st.Municipio.trim());
    });
    Array.from(munisSet)
      .sort()
      .forEach((muni) =>
        muniSelector.insertAdjacentHTML(
          "beforeend",
          `<option value="${muni}">${muni}</option>`,
        ),
      );
  }
  applyFilters();
}

function handleFuelChange() {
  APP_STATE.selectedFuel = document.getElementById("fuelSelector").value;
  applyFilters();
}

function resetFilters() {
  document.getElementById("searchQuery").value = "";
  document.getElementById("fuelSelector").value = "gasolina95";
  document.getElementById("provinceSelector").value = "TODAS";
  document.getElementById("municipalitySelector").innerHTML =
    '<option value="TODOS">-- Todos los Municipios --</option>';
  document.getElementById("municipalitySelector").disabled = true;
  APP_STATE.selectedFuel = "gasolina95";
  APP_STATE.selectedProvince = "TODAS";
  APP_STATE.selectedMunicipality = "TODOS";
  APP_STATE.searchQuery = "";
  applyFilters();
  showToast("Filtros restablecidos", "ri-filter-3-line");
}

function applyFilters() {
  const query = document
    .getElementById("searchQuery")
    .value.toLowerCase()
    .trim();
  const fuelKey = FUEL_KEYS[APP_STATE.selectedFuel].key;
  const selectedMuni = document.getElementById("municipalitySelector").value;
  const sortBy = document.getElementById("sortSelector").value;

  APP_STATE.searchQuery = query;
  APP_STATE.selectedMunicipality = selectedMuni;

  let tempResult = APP_STATE.gasStations.filter((st) => {
    const priceStr = st[fuelKey];
    if (!priceStr) return false;
    const cleanPrice = parseFloat(priceStr.replace(",", "."));
    if (isNaN(cleanPrice) || cleanPrice <= 0) return false;
    if (
      APP_STATE.selectedProvince !== "TODAS" &&
      (!st.Provincia ||
        st.Provincia.toUpperCase().trim() !== APP_STATE.selectedProvince)
    )
      return false;
    if (
      selectedMuni !== "TODOS" &&
      (!st.Municipio || st.Municipio.trim() !== selectedMuni)
    )
      return false;
    if (query) {
      const rotulo = (st.Rótulo || "").toLowerCase(),
        direccion = (st.Dirección || "").toLowerCase(),
        cp = (st["C.P."] || "").toLowerCase();
      if (
        !rotulo.includes(query) &&
        !direccion.includes(query) &&
        !cp.includes(query)
      )
        return false;
    }
    return true;
  });

  if (sortBy === "closest" && APP_STATE.userLocation) {
    tempResult.forEach(
      (st) =>
        (st._distance = calculateDistance(
          APP_STATE.userLocation.lat,
          APP_STATE.userLocation.lng,
          parseFloat((st.Latitud || "0").replace(",", ".")),
          parseFloat((st["Longitud (WGS84)"] || "0").replace(",", ".")),
        )),
    );
  }

  if (sortBy === "cheapest")
    tempResult.sort(
      (a, b) =>
        parseFloat(a[fuelKey].replace(",", ".")) -
        parseFloat(b[fuelKey].replace(",", ".")),
    );
  else if (sortBy === "closest" && APP_STATE.userLocation)
    tempResult.sort((a, b) => (a._distance || 99999) - (b._distance || 99999));
  else if (sortBy === "name")
    tempResult.sort((a, b) => (a.Rótulo || "").localeCompare(b.Rótulo || ""));

  APP_STATE.filteredStations = tempResult.slice(0, 150);
  document.getElementById("stationsCount").textContent = tempResult.length;

  let filterText = "Toda España";
  if (APP_STATE.selectedProvince !== "TODAS") {
    filterText = APP_STATE.selectedProvince;
    if (selectedMuni !== "TODOS") filterText += ` > ${selectedMuni}`;
  }
  document.getElementById("filterDetails").textContent = filterText;

  renderListView();
  renderStatsView();
  updateMapMarkers();
}

function renderListView() {
  const container = document.getElementById("stationsList");
  container.innerHTML = "";

  if (APP_STATE.filteredStations.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 48px; color: var(--text-muted);"><i class="ri-error-warning-line" style="font-size: 32px; display: block; margin-bottom: 8px;"></i><p style="font-weight: 700; font-size: 13px;">No hay resultados</p><p style="font-size: 11px; margin-top: 4px;">Modifica los filtros de búsqueda.</p></div>`;
    return;
  }

  const fuelKey = FUEL_KEYS[APP_STATE.selectedFuel].key;
  const prices = APP_STATE.filteredStations.map((st) =>
    parseFloat(st[fuelKey].replace(",", ".")),
  );
  const minVal = Math.min(...prices),
    maxVal = Math.max(...prices),
    range = maxVal - minVal;
  const fragment = document.createDocumentFragment();

  APP_STATE.filteredStations.forEach((st) => {
    const priceStr = st[fuelKey],
      priceNum = parseFloat(priceStr.replace(",", "."));
    const brandColorInfo = getBrandColorClass(st.Rótulo);

    let badgeColorClass = "price-cheap";
    if (range > 0) {
      const ratio = (priceNum - minVal) / range;
      if (ratio >= 0.25 && ratio <= 0.75) badgeColorClass = "price-medium";
      else if (ratio > 0.75) badgeColorClass = "price-expensive";
    }

    const isFavorite = APP_STATE.favorites.includes(st.IDEESS);
    const distanceText = st._distance ? `${st._distance.toFixed(1)} km` : "";

    const card = document.createElement("div");
    card.className = "station-card";
    card.innerHTML = `
            <div class="card-row-top">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="brand-badge ${brandColorInfo.bg}">${st.Rótulo.split(" ")[0]}</span>
                <span class="locality-badge">${st.Localidad || st.Municipio}</span>
              </div>
              <div class="card-actions-right">
                ${distanceText ? `<span class="gps-distance"><i class="ri-map-pin-line"></i> ${distanceText}</span>` : ""}
                <button onclick="toggleFavorite('${st.IDEESS}', event)" class="star-btn ${isFavorite ? "active" : ""}"><i class="${isFavorite ? "ri-star-fill" : "ri-star-line"}"></i></button>
              </div>
            </div>
            <div onclick="openDetailModal('${st.IDEESS}')" class="card-body">
              <h4 class="station-title">${st.Rótulo}</h4>
              <p class="station-address">${st.Dirección}</p>
            </div>
            <div class="card-row-bottom">
              <div class="fuel-info-block">
                <span class="fuel-label-sm">${FUEL_KEYS[APP_STATE.selectedFuel].label}</span>
                <span class="schedule-label-sm">${st.Horario || "Horario no especificado"}</span>
              </div>
              <div class="price-action-container">
                <div class="price-value-box">
                  <span class="price-text-main ${badgeColorClass}">${priceStr} <span class="price-unit-small">€/L</span></span>
                </div>
                <button onclick="openDetailModal('${st.IDEESS}')" class="view-detail-btn"><i class="ri-arrow-right-s-line"></i></button>
              </div>
            </div>`;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function renderStatsView() {
  if (APP_STATE.filteredStations.length === 0) return;
  const fuelKey = FUEL_KEYS[APP_STATE.selectedFuel].key;
  const prices = APP_STATE.filteredStations
    .map((st) => ({ price: parseFloat(st[fuelKey].replace(",", ".")), st: st }))
    .sort((a, b) => a.price - b.price);
  const minObj = prices[0],
    maxObj = prices[prices.length - 1];
  const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

  document.getElementById("statMinPrice").textContent =
    `${minObj.price.toFixed(3)} €/L`;
  document.getElementById("statMinStation").innerHTML =
    `<strong>${minObj.st.Rótulo}</strong> - ${minObj.st.Dirección}`;
  document.getElementById("statAvgPrice").textContent =
    `${avgPrice.toFixed(3)} €/L`;
  document.getElementById("statAvgDetails").textContent =
    `Media de las ${prices.length} estaciones filtradas.`;
  document.getElementById("statMaxPrice").textContent =
    `${maxObj.price.toFixed(3)} €/L`;
  document.getElementById("statMaxStation").innerHTML =
    `<strong>${maxObj.st.Rótulo}</strong> - ${maxObj.st.Dirección}`;

  const barRange = maxObj.price - minObj.price;
  document.getElementById("statBarMin").textContent =
    `${minObj.price.toFixed(3)} €/L`;
  document.getElementById("statBarAvg").textContent =
    `${avgPrice.toFixed(3)} €/L`;
  document.getElementById("statBarMax").textContent =
    `${maxObj.price.toFixed(3)} €/L`;

  if (barRange > 0) {
    document.getElementById("statBarMinPercent").style.width = "100%";
    document.getElementById("statBarAvgPercent").style.width =
      `${100 - ((avgPrice - minObj.price) / barRange) * 50}%`;
    document.getElementById("statBarMaxPercent").style.width = "30%";
  } else {
    document.getElementById("statBarMinPercent").style.width = "100%";
    document.getElementById("statBarAvgPercent").style.width = "100%";
    document.getElementById("statBarMaxPercent").style.width = "100%";
  }

  document.getElementById("savingsEstimate").textContent =
    `${((maxObj.price - minObj.price) * 50).toFixed(2)} €`;

  const topListContainer = document.getElementById("statsTopList");
  topListContainer.innerHTML = "";
  prices.slice(0, 5).forEach((item, index) => {
    topListContainer.insertAdjacentHTML(
      "beforeend",
      `
            <div class="top-station-item">
              <div class="top-station-left">
                <span class="top-num-badge">${index + 1}</span>
                <div>
                  <span class="top-station-name">${item.st.Rótulo}</span>
                  <span class="top-station-sub">${item.st.Dirección}</span>
                </div>
              </div>
              <span class="top-station-price">${item.price.toFixed(3)} €/L</span>
            </div>`,
    );
  });
}

function initMap() {
  const defaultCenter = [40.416775, -3.70379];
  APP_STATE.map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView(defaultCenter, 6);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
    },
  ).addTo(APP_STATE.map);

  APP_STATE.markerGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
  }).addTo(APP_STATE.map);
}

function updateMapMarkers() {
  if (!APP_STATE.map || !APP_STATE.markerGroup) return;

  APP_STATE.markerGroup.clearLayers();

  if (APP_STATE.filteredStations.length === 0) return;

  const fuelKey = FUEL_KEYS[APP_STATE.selectedFuel].key;
  const prices = APP_STATE.filteredStations.map((st) =>
    parseFloat(st[fuelKey].replace(",", ".")),
  );
  const minVal = Math.min(...prices),
    maxVal = Math.max(...prices),
    range = maxVal - minVal;

  let bounds = [];
  let markersToAdd = [];

  APP_STATE.filteredStations.forEach((st) => {
    const lat = parseFloat((st.Latitud || "0").replace(",", ".")),
      lng = parseFloat((st["Longitud (WGS84)"] || "0").replace(",", "."));
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

    const priceStr = st[fuelKey],
      priceNum = parseFloat(priceStr.replace(",", "."));
    let pinColor = "#10b981";
    if (range > 0) {
      const ratio = (priceNum - minVal) / range;
      if (ratio >= 0.25 && ratio <= 0.75) pinColor = "#f59e0b";
      else if (ratio > 0.75) pinColor = "#f43f5e";
    }

    const customIcon = L.divIcon({
      className: "leaflet-div-icon-price",
      html: `<div style="background-color: ${pinColor};" class="map-price-marker">${priceStr}</div>`,
      iconSize: [36, 18],
      iconAnchor: [18, 9],
    });

    const marker = L.marker([lat, lng], { icon: customIcon });
    marker.bindPopup(`
            <div style="font-size: 11px; padding: 4px; font-family: sans-serif;">
              <div style="font-weight: 800; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; gap: 8px;">
                <span>${st.Rótulo}</span><span style="color: #10b981;">${priceStr} €</span>
              </div>
              <p style="color: #666; margin-bottom: 6px;">${st.Dirección}</p>
              <button onclick="openDetailModal('${st.IDEESS}')" style="background-color: var(--brand-500); color: white; border: none; padding: 4px 8px; border-radius: 6px; width: 100%; cursor: pointer; font-weight: 700;">Detalles</button>
            </div>
          `);

    markersToAdd.push(marker);
    bounds.push([lat, lng]);
  });

  APP_STATE.markerGroup.addLayers(markersToAdd);

  if (bounds.length > 0 && APP_STATE.activeTab === "tab-map")
    APP_STATE.map.fitBounds(bounds, { padding: [30, 30] });
}

function renderFavoritesView() {
  const container = document.getElementById("favoritesList");
  container.innerHTML = "";

  if (APP_STATE.favorites.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 48px; color: var(--text-muted);"><i class="ri-star-line" style="font-size: 32px; display: block; margin-bottom: 8px;"></i><p style="font-weight: 700; font-size: 13px;">No tienes favoritas</p><p style="font-size: 11px; margin-top: 4px;">Pulsa en la estrella de un surtidor para guardarlo.</p></div>`;
    return;
  }

  const fuelKey = FUEL_KEYS[APP_STATE.selectedFuel].key;
  const fragment = document.createDocumentFragment();

  APP_STATE.favorites.forEach((id) => {
    const st = APP_STATE.gasStations.find((g) => g.IDEESS === id);
    if (!st) return;

    const priceStr = st[fuelKey] || "--",
      brandColorInfo = getBrandColorClass(st.Rótulo);
    const card = document.createElement("div");
    card.className = "station-card";
    card.style.borderColor = "var(--accent-amber-dark)";
    card.style.backgroundColor = "var(--accent-amber-bg)";

    card.innerHTML = `
            <div class="card-row-top">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="brand-badge ${brandColorInfo.bg}">${st.Rótulo.split(" ")[0]}</span>
                <span class="locality-badge">${st.Localidad || st.Municipio}</span>
              </div>
              <button onclick="toggleFavorite('${st.IDEESS}', event)" class="star-btn active"><i class="ri-star-fill"></i></button>
            </div>
            <div onclick="openDetailModal('${st.IDEESS}')" class="card-body">
              <h4 class="station-title">${st.Rótulo}</h4>
              <p class="station-address">${st.Dirección}</p>
            </div>
            <div class="card-row-bottom" style="border-top-color: rgba(245, 158, 11, 0.2)">
              <div class="fuel-info-block">
                <span class="fuel-label-sm" style="color: var(--accent-amber-text)">${FUEL_KEYS[APP_STATE.selectedFuel].label}</span>
                <span class="schedule-label-sm">${st.Horario || "Horario no provisto"}</span>
              </div>
              <div class="price-action-container">
                <span class="price-text-main" style="background-color: #ffffff; color: var(--accent-amber-text)">
                  ${priceStr} <span class="price-unit-small">€/L</span>
                </span>
                <button onclick="openDetailModal('${st.IDEESS}')" class="view-detail-btn" style="background-color: var(--accent-amber-dark)">
                  <i class="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>`;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function toggleFavorite(id, event) {
  if (event) event.stopPropagation();
  const index = APP_STATE.favorites.indexOf(id);
  if (index > -1) {
    APP_STATE.favorites.splice(index, 1);
    showToast("Eliminado de favoritas.", "ri-star-line", "text-slate-400");
  } else {
    APP_STATE.favorites.push(id);
    showToast("¡Estación guardada!", "ri-star-fill", "text-amber-400");
  }
  localStorage.setItem("gasoesp_favs", JSON.stringify(APP_STATE.favorites));
  if (APP_STATE.activeTab === "tab-favorites") renderFavoritesView();
  else renderListView();
}

function toggleFilterSheet(open) {
  const sheet = document.getElementById("filterSheet");
  open ? sheet.classList.add("active") : sheet.classList.remove("active");
}

function switchTab(tabId) {
  document
    .querySelectorAll(".spa-tab")
    .forEach((tab) => tab.classList.add("hidden"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(tabId).classList.remove("hidden");
  const navBtn = document.getElementById(`btn-${tabId}`);
  if (navBtn) navBtn.classList.add("active");
  APP_STATE.activeTab = tabId;

  if (tabId === "tab-map") {
    setTimeout(() => {
      APP_STATE.map.invalidateSize();
      updateMapMarkers();
    }, 100);
  } else if (tabId === "tab-favorites") renderFavoritesView();
  else if (tabId === "tab-list") renderListView();
}

function openDetailModal(id) {
  const st = APP_STATE.gasStations.find((g) => g.IDEESS === id);
  if (!st) return;

  document.getElementById("modalBrandBadge").textContent =
    st.Rótulo.split(" ")[0];
  document.getElementById("modalName").textContent = st.Rótulo;
  document.getElementById("modalAddress").textContent = st.Dirección;
  document.getElementById("modalHours").textContent =
    st.Horario || "No provisto";
  document.getElementById("modalLocality").textContent =
    `${st.Municipio} (${st.Provincia})`;

  const priceListContainer = document.getElementById("modalPricesList");
  priceListContainer.innerHTML = "";
  Object.keys(FUEL_KEYS).forEach((key) => {
    const item = FUEL_KEYS[key],
      val = st[item.key];
    if (val && parseFloat(val.replace(",", ".")) > 0) {
      priceListContainer.insertAdjacentHTML(
        "beforeend",
        `<div class="modal-price-row"><span class="modal-price-label">${item.label}</span><span class="modal-price-val">${val} €/L</span></div>`,
      );
    }
  });

  const lat = (st.Latitud || "0").replace(",", "."),
    lng = (st["Longitud (WGS84)"] || "0").replace(",", ".");
  document.getElementById("modalRouteBtn").href =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const favBtn = document.getElementById("modalFavBtn");
  const isFav = APP_STATE.favorites.includes(st.IDEESS);
  favBtn.className = isFav ? "modal-btn-fav scv-max" : "modal-btn-fav scv-avg";
  favBtn.style.color = isFav ? "#be123c" : "#b45309";
  favBtn.innerHTML = isFav
    ? `<i class="ri-star-fill"></i> <span>Quitar</span>`
    : `<i class="ri-star-line"></i> <span>Guardar</span>`;
  favBtn.onclick = () => {
    toggleFavorite(st.IDEESS);
    openDetailModal(st.IDEESS);
  };

  document.getElementById("detailModal").classList.add("active");
}

function closeDetailModal() {
  document.getElementById("detailModal").classList.remove("active");
}

function requestUserLocation() {
  const btnText = document.getElementById("gpsText"),
    btn = document.getElementById("gpsButton");
  if (!navigator.geolocation) {
    showToast("GPS no soportado.", "ri-error-warning-line", "text-rose-500");
    return;
  }
  btnText.textContent = "Buscando GPS...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      APP_STATE.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      btnText.textContent = "GPS Conectado";
      btn.className = "gps-btn-bottom success";
      showToast(
        "Ubicación fijada correctamente.",
        "ri-map-pin-line",
        "text-emerald-400",
      );
      document.getElementById("sortSelector").value = "closest";
      toggleFilterSheet(false);
      applyFilters();
    },
    (error) => {
      btnText.textContent = "Ubicación por GPS";
      showToast(
        "Error. Habilita el GPS.",
        "ri-error-warning-line",
        "text-rose-500",
      );
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
  );
}

function getBrandColorClass(brandName) {
  const name = (brandName || "").toUpperCase();
  if (name.includes("REPSOL")) return { bg: "bg-repsol" };
  if (name.includes("CEPSA")) return { bg: "bg-cepsa" };
  if (name.includes("BP")) return { bg: "bg-bp" };
  if (name.includes("SHELL")) return { bg: "bg-shell" };
  if (name.includes("GALP")) return { bg: "bg-galp" };
  if (
    name.includes("PLENOIL") ||
    name.includes("BALLENOIL") ||
    name.includes("PETROPRIX")
  )
    return { bg: "bg-lowcost" };
  return { bg: "bg-default" };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a =
    0.5 -
    c((lat2 - lat1) * p) / 2 +
    (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

function showLoading(show, message = "") {
  const overlay = document.getElementById("loadingOverlay");
  if (message) document.getElementById("loadingMessage").textContent = message;
  overlay.style.display = show ? "flex" : "none";
}

function showToast(message, icon = "ri-information-line", iconColorClass = "") {
  const toast = document.getElementById("toast");
  document.getElementById("toastMessage").textContent = message;
  document.getElementById("toastIcon").className = `${icon} ${iconColorClass}`;
  toast.classList.add("active");
  setTimeout(() => toast.classList.remove("active"), 3500);
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("gasoesp_theme", isDark ? "dark" : "light");
  document.getElementById("themeIcon").className = isDark
    ? "ri-sun-fill"
    : "ri-moon-fill";
  showToast(
    isDark ? "Modo oscuro activado" : "Modo claro activado",
    isDark ? "ri-moon-fill" : "ri-sun-fill",
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        console.log("Service Worker registrado con éxito:", registration.scope);
      })
      .catch((error) => {
        console.error("Fallo al registrar el Service Worker:", error);
      });
  });
}
