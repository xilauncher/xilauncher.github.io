document.addEventListener("DOMContentLoaded", () => {
  const searchButtons = document.querySelectorAll(".search-btn");
  const resultsContainer = document.getElementById("results-container");

  searchButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      initSearch(type);
    });
  });

  function initSearch(amenityType) {
    resultsContainer.innerHTML = `<div class="status-msg"><i class="ri-loader-4-line ri-spin"></i> Obteniendo ubicación GPS...</div>`;
    searchButtons.forEach((b) => (b.disabled = true));

    if (!navigator.geolocation) {
      showError("Tu navegador no soporta la geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchNearbyServices(lat, lon, amenityType);
      },
      (error) => {
        showError("Permiso de ubicación denegado o no disponible.");
        searchButtons.forEach((b) => (b.disabled = false));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function fetchNearbyServices(lat, lon, amenity) {
    resultsContainer.innerHTML = `<div class="status-msg"><i class="ri-loader-4-line ri-spin"></i> Buscando servicios cercanos en la red...</div>`;

    let queryBody = `nwr["amenity"="${amenity}"](around:7000, ${lat}, ${lon});`;

    if (amenity === "hospital") {
      queryBody = `
        (
          nwr["amenity"~"hospital|clinic"](around:7000, ${lat}, ${lon});
          nwr["healthcare"~"hospital|clinic|centre"](around:7000, ${lat}, ${lon});
        );
      `;
    }

    const query = `
      [out:json];
      ${queryBody}
      out center;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        showError("No se han encontrado resultados en 7km a la redonda.");
        return;
      }

      let places = data.elements
        .map((el) => {
          const placeLat = el.lat || (el.center && el.center.lat);
          const placeLon = el.lon || (el.center && el.center.lon);

          if (!placeLat || !placeLon) return null;

          const distance = calculateDistance(lat, lon, placeLat, placeLon);

          let defaultName = "Servicio Médico";
          if (amenity === "pharmacy") defaultName = "Farmacia";
          if (amenity === "police") defaultName = "Comisaría / Puesto";

          const name = el.tags.name || defaultName;

          return { name, lat: placeLat, lon: placeLon, distance };
        })
        .filter((place) => place !== null);

      const uniquePlaces = [];
      const seenNames = new Set();

      for (const place of places) {
        const cleanName = place.name.toLowerCase().trim();
        if (!seenNames.has(cleanName)) {
          seenNames.add(cleanName);
          uniquePlaces.push(place);
        }
      }

      uniquePlaces.sort((a, b) => a.distance - b.distance);

      renderResults(uniquePlaces.slice(0, 6));
    } catch (err) {
      showError(
        "Error de conexión. Comprueba tu internet e inténtalo de nuevo.",
      );
    } finally {
      searchButtons.forEach((b) => (b.disabled = false));
    }
  }

  function renderResults(places) {
    resultsContainer.innerHTML = "";

    places.forEach((place) => {
      const distText =
        place.distance < 1
          ? `${Math.round(place.distance * 1000)} m`
          : `${place.distance.toFixed(2)} km`;

      const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;

      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-info">
          <h3>${place.name}</h3>
          <p><i class="ri-map-pin-line"></i> A ${distText} de ti</p>
        </div>
        <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" class="nav-btn">
          <i class="ri-direction-line"></i> Ir
        </a>
      `;
      resultsContainer.appendChild(card);
    });
  }

  function showError(msg) {
    resultsContainer.innerHTML = `<div class="status-msg" style="color: #ef4444;"><i class="ri-error-warning-line"></i> ${msg}</div>`;
    searchButtons.forEach((b) => (b.disabled = false));
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
});

const savedTheme = localStorage.getItem("xilauncher_theme");
const systemPrefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)",
).matches;
const themeIcon = document.getElementById("themeIcon");

if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
  document.documentElement.classList.add("dark");
  if (themeIcon) themeIcon.className = "ri-sun-fill";
} else {
  if (themeIcon) themeIcon.className = "ri-moon-fill";
}

window.toggleDarkMode = function () {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("xilauncher_theme", isDark ? "dark" : "light");

  if (themeIcon) {
    themeIcon.className = isDark ? "ri-sun-fill" : "ri-moon-fill";
  }
};
