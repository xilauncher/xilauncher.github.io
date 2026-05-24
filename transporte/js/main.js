const APP_STATE = {
  network: "urbano",
  view: "lineas",
  map: null,
  mainMarkerGroup: null,
  routeMap: null,
  routeLayer: null,
  lineasGlobales: [],
  lineasFiltradas: [],
  paradasGlobales: [],
  paradasFiltradas: [],
  tiemposOffline: null,
  currentLineData: null,
  currentDir: "ida",
};

const FARE_DATA = {
  urbano: [
    {
      title: "Billete Ordinario",
      price: "1,60€",
      desc: "Pago directo al conductor o en máquinas. Sin transbordo.",
      color: "#D9281C",
    },
    {
      title: "Bus Búho (Nocturno)",
      price: "1,70€",
      desc: "Tarifa para líneas 111 y 121. Pago directo al conductor o con tarjeta urbana.",
      badge: "Nocturno",
      color: "#7c7c7c",
    },
    {
      title: "Credibús 5€",
      price: "0,54€",
      per_trip: true,
      desc: "Tarjeta recargable. Transbordo gratuito (60 min).",
      badge: "Recargable",
      color: "#D9281C",
    },
    {
      title: "Credibús 10€ / 20€",
      price: "0,53€",
      per_trip: true,
      desc: "Máximo ahorro urbano al recargar 10€ o 20€.",
      badge: "Más usado",
      color: "#D9281C",
    },
    {
      title: "Tarjeta Consorcio (Urbano)",
      price: "0,63€",
      per_trip: true,
      desc: "Válida tanto para Joven como para 0 saltos en la capital.",
      badge: "Intermodal",
      color: "#2757f5",
    },
    {
      title: "Bono Mensual",
      price: "24,60€",
      desc: "Viajes ilimitados durante 30 días en toda la red urbana.",
      badge: "Ilimitado",
      color: "#D9281C",
    },
    {
      title: "Bono Joven",
      price: "0,33€",
      per_trip: true,
      desc: "Para residentes en Granada (6-25 años).",
      badge: "Jóvenes",
      color: "#D9281C",
    },
    {
      title: "Bono Pensionista / PMR",
      price: "Gratis",
      desc: "Uso ilimitado para mayores de 65 años o personas con discapacidad.",
      badge: "Especial",
      color: "#10b981",
    },
    {
      title: "Transbordo",
      price: "Gratis",
      desc: "Permitido entre distintas líneas durante 60 min con cualquier bono.",
      color: "#475569",
    },
  ],
  metro: [
    {
      title: "Tarjeta Monedero",
      price: "0,49€",
      per_trip: true,
      desc: "Precio rebajado 2026 (Antes 0,82€). Saldo no caduca.",
      badge: "Mejor Precio",
      color: "#009a44",
    },
    {
      title: "Univiaje",
      price: "1,35€",
      desc: "Billete sencillo para un solo trayecto.",
      color: "#009a44",
    },
    {
      title: "Ida y Vuelta",
      price: "2,70€",
      desc: "Para realizar dos viajes (ida y retorno).",
      color: "#009a44",
    },
    {
      title: "Tarjeta Turística 1 Día",
      price: "4,50€",
      desc: "Viajes ilimitados durante 1 día completo.",
      badge: "Turista",
      color: "#009a44",
    },
    {
      title: "Tarjeta Turística 2 Días",
      price: "9,00€",
      desc: "Viajes ilimitados durante 2 días.",
      color: "#009a44",
    },
    {
      title: "Tarjeta Turística 3 Días",
      price: "13,00€",
      desc: "Viajes ilimitados durante 3 días.",
      color: "#009a44",
    },
    {
      title: "Tarjeta Turística 5 Días",
      price: "20,00€",
      desc: "Viajes ilimitados durante 5 días.",
      color: "#009a44",
    },
    {
      title: "Soporte Flexible (Cartón)",
      price: "0,30€",
      desc: "Coste de la tarjeta física. Reutilizable durante 1 año.",
      color: "#475569",
    },
    {
      title: "Soporte Rígido (PVC)",
      price: "1,80€",
      desc: "Tarjeta de plástico duradera. Reutilizable indefinidamente.",
      color: "#475569",
    },
  ],
  interurbano: [
    {
      title: "Billete Sencillo (0 Saltos)",
      price: "1,55€",
      desc: "Pago directo. Trayectos dentro de la misma zona.",
      color: "#2757f5",
    },
    {
      title: "Tarjeta Consorcio (0 Saltos)",
      price: "0,63€",
      per_trip: true,
      desc: "Precio bonificado. Trayectos sin cambio de zona.",
      badge: "Zona A",
      color: "#2757f5",
    },
    {
      title: "Billete Sencillo (1 Salto)",
      price: "1,60€",
      desc: "Pago directo. Cruce de 1 zona tarifaria.",
      color: "#2757f5",
    },
    {
      title: "Tarjeta Consorcio (1 Salto)",
      price: "0,64€",
      per_trip: true,
      desc: "Precio bonificado. Cruce de 1 zona.",
      badge: "Zona B",
      color: "#2757f5",
    },
    {
      title: "Billete Sencillo (2 Saltos)",
      price: "1,90€",
      desc: "Pago directo. Cruce de 2 zonas tarifarias.",
      color: "#2757f5",
    },
    {
      title: "Tarjeta Consorcio (2 Saltos)",
      price: "0,76€",
      per_trip: true,
      desc: "Precio bonificado. Cruce de 2 zonas.",
      badge: "Zona C",
      color: "#2757f5",
    },
    {
      title: "Billete Sencillo (3 Saltos)",
      price: "3,15€",
      desc: "Pago directo. Cruce de 3 zonas tarifarias.",
      color: "#2757f5",
    },
    {
      title: "Tarjeta Consorcio (3 Saltos)",
      price: "1,30€",
      per_trip: true,
      desc: "Precio bonificado. Cruce de 3 zonas.",
      badge: "Zona D",
      color: "#2757f5",
    },
  ],
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
  renderTarifas();
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
    setTimeout(() => {
      APP_STATE.map.invalidateSize();
      if (APP_STATE.map.getZoom() < 12)
        APP_STATE.map.setView([37.1773, -3.5985], 13);
    }, 100);
  }
  if (view === "tarifas") {
    renderTarifas();
  }
}

async function loadNetworkData(network) {
  showLoading(true, "Descargando datos...", network.toUpperCase());
  document.getElementById("searchLineas").value = "";
  document.getElementById("searchParadas").value = "";

  try {
    const [resLin, resPar, resOff] = await Promise.all([
      fetch(`data/${network}/lineas.json`),
      fetch(`data/${network}/paradas.json`),
      fetch(`data/${network}/tiempos_offline.json`),
    ]);

    APP_STATE.lineasGlobales = await resLin.json();
    APP_STATE.paradasGlobales = await resPar.json();
    APP_STATE.tiemposOffline = await resOff.json();
    APP_STATE.lineasFiltradas = APP_STATE.lineasGlobales;
    APP_STATE.paradasFiltradas = APP_STATE.paradasGlobales;

    renderLineas();
    renderParadas();
    renderMainMapStops();
  } catch (e) {
    console.error(e);
    showToast("Error de conexión local", "ri-wifi-off-line");
  } finally {
    showLoading(false);
  }
}

function filterLineas() {
  const q = document.getElementById("searchLineas").value.toLowerCase().trim();
  APP_STATE.lineasFiltradas = q
    ? APP_STATE.lineasGlobales.filter(
        (l) =>
          l.short_name.toLowerCase().includes(q) ||
          l.long_name.toLowerCase().includes(q),
      )
    : APP_STATE.lineasGlobales;
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
    card.innerHTML = `<div class="linea-badge" style="background-color: ${l.color}">${l.short_name}</div><div class="linea-info"><span class="linea-name">${l.long_name}</span><span class="linea-sub">Ver recorrido y horarios</span></div><i class="ri-arrow-right-s-line linea-arrow"></i>`;
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
    APP_STATE.currentLineData = await res.json();
    APP_STATE.currentDir = "ida";
    const info = APP_STATE.currentLineData.info;
    document.getElementById("lmHeader").style.background = info.color;
    document.getElementById("lmBadge").textContent = info.short_name;
    document.getElementById("lmBadge").style.color = info.color;
    document.getElementById("lmName").textContent = info.long_name;
    document.getElementById("lmDirVuelta").style.display =
      APP_STATE.currentLineData.vuelta.paradas.length > 0 ? "block" : "none";
    document.getElementById("lineDetailModal").classList.remove("hidden");
    switchLineTab("paradas");
    setTimeout(() => {
      APP_STATE.routeMap.invalidateSize();
      renderLineDirection();
    }, 200);
  } catch (e) {
    showToast("Error al abrir ruta", "ri-error-warning-line");
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
  if (APP_STATE.routeLayer)
    APP_STATE.routeMap.removeLayer(APP_STATE.routeLayer);
  const layerGroup = L.featureGroup();
  if (data.shape && data.shape.length > 0)
    layerGroup.addLayer(
      L.polyline(data.shape, { color: info.color, weight: 5, opacity: 0.8 }),
    );
  data.paradas.forEach((p) => {
    const dot = L.circleMarker([p.lat, p.lon], {
      radius: 6,
      fillColor: "white",
      color: info.color,
      weight: 2,
      fillOpacity: 1,
    });
    dot.bindPopup(
      `<div style="text-align:center;"><b style="font-size:12px;">${p.name}</b><br><button onclick="openStopModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')" style="margin-top:6px; background:var(--brand-600); color:white; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;">Ver Tiempos</button></div>`,
    );
    layerGroup.addLayer(dot);
  });
  APP_STATE.routeLayer = layerGroup;
  APP_STATE.routeMap.addLayer(APP_STATE.routeLayer);
  if (data.shape && data.shape.length > 0)
    APP_STATE.routeMap.fitBounds(APP_STATE.routeLayer.getBounds(), {
      padding: [20, 20],
    });
  document.getElementById("lmContentParadas").innerHTML = data.paradas
    .map((p) => {
      let transbordosHtml =
        p.transbordos && p.transbordos.length > 0
          ? `<div class="transbordos-container">` +
            p.transbordos
              .map(
                (t) =>
                  `<span class="transbordo-badge" style="background-color: ${t.color}">${t.short_name}</span>`,
              )
              .join("") +
            `</div>`
          : "";
      return `<div class="timeline-item" style="cursor:pointer;" onclick="openStopModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')"><div class="timeline-dot" style="border-color: ${info.color};"></div><span class="timeline-name">${p.name}</span><span class="timeline-id">Parada: ${p.id}</span>${transbordosHtml}</div>`;
    })
    .join("");
  const horariosBox = document.getElementById("lmContentHorarios");
  horariosBox.innerHTML = "";
  let hayHorarios = false;
  ["L-J", "V", "S", "D"].forEach((dia_key) => {
    if (
      data.horarios_cabecera[dia_key] &&
      data.horarios_cabecera[dia_key].length > 0
    ) {
      hayHorarios = true;
      let lbl = dia_key;
      if (lbl === "L-J") lbl = "Lunes a Jueves";
      else if (lbl === "V") lbl = "Viernes";
      else if (lbl === "S") lbl = "Sábados";
      else if (lbl === "D") lbl = "Domingos y Festivos";
      horariosBox.innerHTML += `<div class="sched-day-card"><div class="sched-day-header">${lbl}</div><div class="sched-grid">${data.horarios_cabecera[dia_key].map((t) => `<div class="sched-time">${t}</div>`).join("")}</div></div>`;
    }
  });
  if (!hayHorarios)
    horariosBox.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">No hay horarios registrados.</p>`;
}

function filterParadas() {
  const q = document.getElementById("searchParadas").value.toLowerCase().trim();
  APP_STATE.paradasFiltradas = q
    ? APP_STATE.paradasGlobales.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
      )
    : APP_STATE.paradasGlobales;
  renderParadas();
  renderMainMapStops();
}

function renderParadas() {
  const container = document.getElementById("paradasList");
  container.innerHTML = "";
  if (APP_STATE.paradasFiltradas.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); margin-top:20px;">No se encontraron paradas.</p>`;
    return;
  }
  const maxRender = APP_STATE.paradasFiltradas.slice(0, 50);
  const fragment = document.createDocumentFragment();
  maxRender.forEach((p) => {
    const card = document.createElement("div");
    card.className = "parada-card";
    card.onclick = () => openStopModal(p.id, p.name);
    card.innerHTML = `<div class="parada-icon"><i class="ri-map-pin-time-fill"></i></div><div class="parada-info"><span class="parada-name">${p.name}</span><span class="parada-id">P-${p.id}</span></div><i class="ri-arrow-right-s-line" style="color:var(--text-muted); font-size:20px;"></i>`;
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

function renderMainMapStops() {
  if (!APP_STATE.map || !APP_STATE.mainMarkerGroup) return;
  APP_STATE.mainMarkerGroup.clearLayers();
  const pinColor = `var(--net-${APP_STATE.network})`;
  let markersToAdd = [];
  APP_STATE.paradasFiltradas.forEach((p) => {
    if (!p.lat || !p.lon) return;
    const dot = L.circleMarker([p.lat, p.lon], {
      radius: 9,
      fillColor: pinColor,
      color: "white",
      weight: 2,
      fillOpacity: 1,
    });
    dot.bindPopup(
      `<div style="text-align:center; min-width: 120px;"><b style="font-size: 13px;">${p.name}</b><br><span style="font-size: 10px; color: var(--text-muted);">Parada: ${p.id}</span><br><button onclick="openStopModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')" style="margin-top:8px; background:var(--brand-600); color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold; width: 100%;">Tiempos Reales</button></div>`,
    );
    markersToAdd.push(dot);
  });
  APP_STATE.mainMarkerGroup.addLayers(markersToAdd);
}

async function openStopModal(stopId, stopName) {
  document.getElementById("smName").textContent = stopName;
  document.getElementById("smId").textContent = "Parada: " + stopId;
  const statusEl = document.getElementById("smStatus");
  const arrivalsEl = document.getElementById("smArrivals");

  statusEl.className = "status-badge";
  statusEl.innerHTML = `<i class="ri-loader-4-line spin"></i> Calculando...`;
  arrivalsEl.innerHTML = "";
  document.getElementById("stopDetailModal").classList.remove("hidden");

  let finalArrivals = [];
  const offlineData = APP_STATE.tiemposOffline[stopId] || {};
  const lineasEsperadas = Object.keys(offlineData);

  if (APP_STATE.network === "consorcio") {
    statusEl.className = "status-badge status-offline";
    statusEl.innerHTML = `<i class="ri-wifi-off-line"></i> Horarios Teóricos`;
    finalArrivals = calculateOfflineArrivals(stopId, lineasEsperadas);
  } else {
    let apiSuccess = false;
    let rtArray = [];
    const lineasConTiempoReal = new Set();

    try {
      const proxyUrl = "https://proxy.contacto-granago.workers.dev/?url=";
      const targetApi =
        APP_STATE.network === "metro"
          ? `https://movgr.apis.mianfg.me/metro/llegadas/${stopId}`
          : `https://movgr.apis.mianfg.me/bus/llegadas/${stopId}`;

      const res = await fetch(proxyUrl + encodeURIComponent(targetApi));
      if (res.ok) {
        const rtData = await res.json();
        rtArray = rtData.proximos || [];
        apiSuccess = true;
      }
    } catch (e) {
      console.warn("Fallo en API:", e);
    }

    if (apiSuccess && rtArray.length > 0) {
      rtArray.forEach((bus) => {
        let lineaId, dest, mins;

        if (APP_STATE.network === "metro") {
          lineaId = "1";
          dest = bus.direccion;
          mins = parseInt(bus.minutos || 0);
        } else {
          if (!bus.linea) return;
          lineaId = String(bus.linea.id).trim();
          dest = bus.destino;
          mins = parseInt(bus.minutos || 0);
        }

        const routeMatch = APP_STATE.lineasGlobales.find(
          (l) =>
            String(l.short_name).trim() === lineaId ||
            String(l.id).trim() === lineaId,
        );

        if (routeMatch) {
          lineasConTiempoReal.add(routeMatch.id);
          finalArrivals.push({
            shortName: routeMatch.short_name,
            color: routeMatch.color,
            dest: dest,
            time: mins === 0 ? "Inm." : mins.toString(),
            isRealTime: true,
            sortMins: mins,
          });
        }
      });
    }

    const now = new Date();
    const horaDecimal = now.getHours() + now.getMinutes() / 60;
    const permiteFallback = horaDecimal >= 7.5 && horaDecimal <= 23.5;

    const lineasPerdidas = lineasEsperadas.filter(
      (lineId) => !lineasConTiempoReal.has(lineId),
    );

    if (permiteFallback && lineasPerdidas.length > 0) {
      finalArrivals = finalArrivals.concat(
        calculateOfflineArrivals(stopId, lineasPerdidas),
      );
    }

    if (finalArrivals.length > 0) {
      statusEl.className =
        "status-badge " + (apiSuccess ? "status-rt" : "status-offline");
      statusEl.innerHTML = apiSuccess
        ? `<div class="rt-dot"></div> En directo`
        : `<i class="ri-wifi-off-line"></i> Horarios Teóricos`;
    }
  }

  const ahora = new Date();
  finalArrivals.forEach((a) => {
    if (!a.isRealTime) {
      const [h, m] = a.time.split(":").map(Number);
      let arrDate = new Date();
      arrDate.setHours(h, m, 0, 0);
      if (arrDate < ahora) arrDate.setDate(arrDate.getDate() + 1);
      a.sortMins = Math.round((arrDate.getTime() - ahora.getTime()) / 60000);
    }
  });

  finalArrivals.sort((a, b) => a.sortMins - b.sortMins);
  renderArrivals(finalArrivals.slice(0, 10), arrivalsEl);
}

function closeStopModal() {
  document.getElementById("stopDetailModal").classList.add("hidden");
}

function calculateOfflineArrivals(stopId, allowedLines = []) {
  const data = APP_STATE.tiemposOffline[stopId];
  if (!data) return [];

  const now = new Date();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();

  let dayType = "L-J";
  const d = now.getDay();
  if (d === 5) dayType = "V";
  else if (d === 6) dayType = "S";
  else if (d === 0) dayType = "D";

  let arrivals = [];
  for (const routeId in data) {
    if (allowedLines.includes(routeId) && data[routeId][dayType]) {
      const futureTimes = data[routeId][dayType]
        .filter((t) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m >= currentTotalMins;
        })
        .slice(0, 2);

      futureTimes.forEach((time) => {
        const routeInfo = APP_STATE.lineasGlobales.find(
          (l) => l.id === routeId,
        );
        const [h, m] = time.split(":").map(Number);
        const arrivalTotalMins = h * 60 + m;
        const diffMins = arrivalTotalMins - currentTotalMins;

        arrivals.push({
          shortName: routeInfo ? routeInfo.short_name : routeId,
          color: routeInfo ? routeInfo.color : "#94a3b8",
          dest: routeInfo ? routeInfo.long_name : "Dirección desconocida",
          time: time,
          diff: diffMins,
          isRealTime: false,
        });
      });
    }
  }
  return arrivals.sort((a, b) => a.diff - b.diff);
}

function renderArrivals(arrivals, container) {
  if (arrivals.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="ri-bus-wifi-line" style="font-size:32px;"></i><p style="margin-top:10px;">Fin de servicio por hoy.</p></div>`;
    return;
  }

  container.innerHTML = arrivals
    .map((a) => {
      let displayTime = a.time;
      let label = "min";
      if (a.isRealTime) {
        label = a.time === "Inm." ? "" : "min";
      } else {
        if (a.diff < 30) {
          displayTime = a.diff === 0 ? "Inm." : a.diff.toString();
          label = a.diff === 0 ? "" : "min";
        } else {
          label = "h";
        }
      }

      return `
      <div class="arrival-card">
        <div class="arrival-left">
          <div class="arrival-line" style="background-color: ${a.color}">${a.shortName}</div>
          <div class="arrival-dest">
            <strong>${a.dest}</strong>
            <span>${a.isRealTime ? "Tiempo Real" : "Horario programado"}</span>
          </div>
        </div>
        <div class="arrival-time ${a.isRealTime ? "time-rt" : "time-off"}">
          <strong>${displayTime}</strong>
          <span style="text-transform: lowercase;">${label}</span>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderTarifas() {
  const container = document.getElementById("tarifasList");
  container.innerHTML = "";

  const key =
    APP_STATE.network === "consorcio" ? "interurbano" : APP_STATE.network;
  const tarifas = FARE_DATA[key] || [];

  if (tarifas.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">No hay tarifas disponibles.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  tarifas.forEach((f) => {
    const card = document.createElement("div");
    card.className = "fare-card";
    card.innerHTML = `
      <div class="fare-line" style="background-color: ${f.color}"></div>
      <div class="fare-content">
        <div class="fare-header">
          <span class="fare-title">${f.title} ${f.badge ? `<span class="fare-badge">${f.badge}</span>` : ""}</span>
          <span class="fare-price">${f.price}</span>
        </div>
        <div class="fare-desc">${f.desc} ${f.per_trip ? '<br><small style="opacity:0.7">Precio por trayecto</small>' : ""}</div>
      </div>
    `;
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
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
  APP_STATE.mainMarkerGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 15,
    spiderfyOnMaxZoom: true,
  }).addTo(APP_STATE.map);
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
