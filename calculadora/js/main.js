document.addEventListener("DOMContentLoaded", () => {
  const distanciaInput = document.getElementById("distancia");
  const precioInput = document.getElementById("precio");
  const consumoSelect = document.getElementById("consumo");
  const consumoCustomGroup = document.getElementById("custom-consumo-group");
  const consumoCustomInput = document.getElementById("consumo-custom");
  const btnCalcular = document.getElementById("btn-calcular");
  const resultCard = document.getElementById("resultado-card");

  consumoSelect.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      consumoCustomGroup.classList.remove("hidden");
    } else {
      consumoCustomGroup.classList.add("hidden");
    }
  });

  btnCalcular.addEventListener("click", () => {
    const distancia = parseFloat(distanciaInput.value);
    const precio = parseFloat(precioInput.value);

    let litrosCienKm;
    if (consumoSelect.value === "custom") {
      litrosCienKm = parseFloat(consumoCustomInput.value);
    } else {
      litrosCienKm = parseFloat(consumoSelect.value);
    }

    if (isNaN(distancia) || isNaN(precio) || isNaN(litrosCienKm)) {
      alert("Por favor, rellena todos los campos con números válidos.");
      return;
    }

    const litrosNecesarios = (distancia / 100) * litrosCienKm;
    const costeTotal = litrosNecesarios * precio;
    const costeDoble = costeTotal * 2;

    document.getElementById("total-euros").textContent = costeTotal.toFixed(2);
    document.getElementById("total-litros").textContent =
      litrosNecesarios.toFixed(1);
    document.getElementById("total-doble").textContent = costeDoble.toFixed(2);

    resultCard.classList.remove("hidden");
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
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
