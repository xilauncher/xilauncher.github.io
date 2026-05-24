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

    const query = `
      [out:json];
      node["amenity"="${amenity}"](around:5000, ${lat}, ${lon});
      out center 15;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        showError("No se han encontrado resultados en 5km a la redonda.");
        return;
      }

      // Procesar y ordenar por distancia
      let places = data.elements.map((el) => {
        const placeLat = el.lat;
        const placeLon = el.lon;
        const distance = calculateDistance(lat, lon, placeLat, placeLon);

        let defaultName = "Servicio (Sin nombre)";
        if (amenity === "hospital") defaultName = "Centro Médico (Sin nombre)";
        if (amenity === "pharmacy") defaultName = "Farmacia (Sin nombre)";
        if (amenity === "police")
          defaultName = "Comisaría / Puesto (Sin nombre)";

        const name = el.tags.name || defaultName;

        return { name, lat: placeLat, lon: placeLon, distance };
      });

      places.sort((a, b) => a.distance - b.distance);

      renderResults(places.slice(0, 5));
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
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
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
