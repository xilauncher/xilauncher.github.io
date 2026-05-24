const APP_STATE = {
  network: "urbano",
  view: "lineas",
  map: null,
  gtfsData: {
    urbano: null,
    consorcio: null,
    metro: null,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  showLoading(false);
});

function switchNetwork(network) {
  APP_STATE.network = network;

  document
    .querySelectorAll(".net-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`net-${network}`).classList.add("active");
  updateNetworkTheme(network);

  console.log(`Cambiado a red: ${network}`);
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

  if (view === "mapa") {
    if (!APP_STATE.map) {
      initMap();
    } else {
      setTimeout(() => APP_STATE.map.invalidateSize(), 100);
    }
  }
}

function updateNetworkTheme(network) {
  let colorVar = "var(--brand-600)";

  if (network === "urbano") colorVar = "var(--net-urbano)";
  else if (network === "consorcio") colorVar = "var(--net-consorcio)";
  else if (network === "metro") colorVar = "var(--net-metro)";

  document.documentElement.style.setProperty("--brand-600", colorVar);
}

function initMap() {
  const centerGranada = [37.1773, -3.5985];
  APP_STATE.map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView(centerGranada, 13);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 20 },
  ).addTo(APP_STATE.map);
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast("GPS no soportado.", "ri-error-warning-line");
    return;
  }
  showToast("Ubicándote...", "ri-map-pin-user-line");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      APP_STATE.map.setView([pos.coords.latitude, pos.coords.longitude], 16);
    },
    () => showToast("Error de GPS", "ri-error-warning-line"),
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
