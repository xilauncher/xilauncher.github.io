document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initClock();
});

function initTheme() {
  const themeBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const savedTheme = localStorage.getItem("xilauncher_theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add("dark");
    themeIcon.className = "ri-sun-fill";
  }

  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("xilauncher_theme", isDark ? "dark" : "light");
    themeIcon.className = isDark ? "ri-sun-fill" : "ri-moon-fill";
  });
}

function initClock() {
  const clockElement = document.getElementById("clockText");
  const greetingElement = document.getElementById("greetingText");

  function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");

    clockElement.textContent = `${hours}:${minutes}`;

    let greeting = "Hola";
    if (hours >= 6 && hours < 12) {
      greeting = "Buenos días";
    } else if (hours >= 12 && hours < 20) {
      greeting = "Buenas tardes";
    } else {
      greeting = "Buenas noches";
    }
    greetingElement.textContent = `${greeting}, XiUser`;
  }

  updateTime();
  setInterval(updateTime, 1000 * 60);
}

let deferredPrompt;
const installBanner = document.getElementById("installBanner");
const installBtn = document.getElementById("installBtn");
const closeInstallBtn = document.getElementById("closeInstallBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();

  deferredPrompt = e;

  if (localStorage.getItem("xilauncher_hide_install") !== "true") {
    installBanner.classList.remove("hidden");
  }
});

installBtn.addEventListener("click", async () => {
  installBanner.classList.add("hidden");

  if (deferredPrompt) {
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Resultado de la instalación: ${outcome}`);

    deferredPrompt = null;
  }
});

closeInstallBtn.addEventListener("click", () => {
  installBanner.classList.add("hidden");
  localStorage.setItem("xilauncher_hide_install", "true");
});

window.addEventListener("appinstalled", () => {
  installBanner.classList.add("hidden");
  deferredPrompt = null;
  console.log("¡XiLauncher se ha instalado correctamente!");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("XiLauncher SW registrado:", reg.scope))
      .catch((err) => console.error("Error registrando SW del Hub:", err));
  });
}
