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
  if (themeIcon) themeIcon.className = isDark ? "ri-sun-fill" : "ri-moon-fill";
};

document.addEventListener("DOMContentLoaded", () => {
  const scannerContainer = document.getElementById("scanner-container");
  const resultContainer = document.getElementById("result-container");
  const qrTextElement = document.getElementById("qr-text");
  const btnOpenLink = document.getElementById("btn-open-link");
  const btnCopy = document.getElementById("btn-copy");
  const btnScanAgain = document.getElementById("btn-scan-again");

  let html5QrcodeScanner;

  function startScanner() {
    scannerContainer.classList.remove("hidden");
    resultContainer.classList.add("hidden");

    html5QrcodeScanner = new Html5Qrcode("reader");

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrcodeScanner
      .start({ facingMode: "environment" }, config, onScanSuccess)
      .catch((err) => {
        alert(
          "Error al acceder a la cámara. Comprueba los permisos de tu navegador.",
        );
        console.error(err);
      });
  }

  function onScanSuccess(decodedText) {
    html5QrcodeScanner
      .stop()
      .then(() => {
        scannerContainer.classList.add("hidden");
        resultContainer.classList.remove("hidden");

        qrTextElement.textContent = decodedText;

        if (
          decodedText.startsWith("http://") ||
          decodedText.startsWith("https://")
        ) {
          btnOpenLink.href = decodedText;
          btnOpenLink.classList.remove("hidden");
        } else {
          btnOpenLink.classList.add("hidden");
        }
      })
      .catch((err) => console.error("Error parando el escáner", err));
  }

  btnCopy.addEventListener("click", () => {
    navigator.clipboard.writeText(qrTextElement.textContent).then(() => {
      const originalText = btnCopy.innerHTML;
      btnCopy.innerHTML = `<i class="ri-check-line"></i> ¡Copiado!`;
      setTimeout(() => {
        btnCopy.innerHTML = originalText;
      }, 2000);
    });
  });

  btnScanAgain.addEventListener("click", () => {
    startScanner();
  });

  startScanner();
});
