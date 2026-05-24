let clockInterval;

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initClock();
  initNameModal();
  initDragAndDrop();
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

function updateGreetingAndClock() {
  const clockElement = document.getElementById("clockText");
  const greetingElement = document.getElementById("greetingText");

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

  const userName = localStorage.getItem("xilauncher_username") || "Usuario";
  greetingElement.textContent = `${greeting}, ${userName}`;
}

function initClock() {
  updateGreetingAndClock();
  const now = new Date();
  const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

  setTimeout(() => {
    updateGreetingAndClock();
    clockInterval = setInterval(updateGreetingAndClock, 60000);
  }, delay);
}

function initNameModal() {
  const editBtn = document.getElementById("editNameBtn");
  const modal = document.getElementById("nameModal");
  const cancelBtn = document.getElementById("cancelNameBtn");
  const saveBtn = document.getElementById("saveNameBtn");
  const nameInput = document.getElementById("nameInput");

  editBtn.addEventListener("click", () => {
    const currentName = localStorage.getItem("xilauncher_username");
    nameInput.value =
      currentName && currentName !== "Usuario" ? currentName : "";
    modal.classList.remove("hidden");
    setTimeout(() => nameInput.focus(), 100);
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  saveBtn.addEventListener("click", saveName);
  nameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveName();
  });

  function saveName() {
    const newName = nameInput.value.trim() || "Usuario";
    localStorage.setItem("xilauncher_username", newName);
    modal.classList.add("hidden");
    updateGreetingAndClock();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("XiLauncher SW registrado:", reg.scope))
      .catch((err) => console.error("Error registrando SW del Hub:", err));
  });
}

function initDragAndDrop() {
  const grid = document.getElementById("sortableGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".app-card"));

  const savedOrder = JSON.parse(localStorage.getItem("xilauncher_app_order"));
  if (savedOrder) {
    savedOrder.forEach((id) => {
      const card = grid.querySelector(`[data-id="${id}"]`);
      if (card) grid.appendChild(card);
    });
  }

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.id);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      saveOrder();
    });
  });

  grid.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector(".dragging");
    if (!draggingCard) return;

    const afterElement = getDragAfterElement(grid, e.clientX, e.clientY);

    if (afterElement == null) {
      grid.appendChild(draggingCard);
    } else {
      grid.insertBefore(draggingCard, afterElement);
    }
  });

  function getDragAfterElement(container, x, y) {
    const draggableElements = [
      ...container.querySelectorAll(".app-card:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const boxCenterX = box.left + box.width / 2;
        const boxCenterY = box.top + box.height / 2;

        const offset = Math.hypot(x - boxCenterX, y - boxCenterY);

        if (offset < closest.offset && y < box.bottom + 20) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.POSITIVE_INFINITY },
    ).element;
  }

  function saveOrder() {
    const currentCards = Array.from(grid.querySelectorAll(".app-card"));
    const orderArray = currentCards.map((card) => card.dataset.id);
    localStorage.setItem("xilauncher_app_order", JSON.stringify(orderArray));
  }
}

let deferredPrompt;
const installBanner = document.getElementById("installBanner");
const installBtn = document.getElementById("installBtn");
const closeInstallBtn = document.getElementById("closeInstallBtn");

if (installBanner && installBtn && closeInstallBtn) {
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
    console.log("App instalada con éxito");
  });
}
