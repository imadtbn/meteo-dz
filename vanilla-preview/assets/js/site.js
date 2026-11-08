const root = document.documentElement;
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const toast = document.querySelector(".toast");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

function readTheme() {
  try { return localStorage.getItem("theme") === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

function setTheme(theme) {
  root.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch { /* Storage may be unavailable. */ }
  const button = document.querySelector('[data-action="theme"]');
  button?.setAttribute("aria-pressed", String(theme === "dark"));
}

root.dataset.theme = readTheme();
setTheme(root.dataset.theme);

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
  navigation?.classList.toggle("is-open", open);
});

navigation?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navigation.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "فتح القائمة");
  }
});

document.querySelector('[data-action="theme"]')?.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

document.querySelector('[data-action="share"]')?.addEventListener("click", async () => {
  const shareData = { title: document.title, text: "مرصد الأطلس — الطقس الجزائري", url: window.location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.url);
      showToast("تم نسخ رابط الصفحة.");
    } else showToast("المشاركة غير متاحة في هذا المتصفح.");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("تعذرت المشاركة؛ يمكنك نسخ رابط الصفحة من شريط العنوان.");
  }
});

document.querySelector('[data-action="install"]')?.addEventListener("click", () => {
  showToast("سيتم تفعيل التثبيت بعد ربط القالب ببيانات PWA والتحقق من نطاق GitHub Pages.");
});

document.querySelector("[data-current-year]")?.replaceChildren(String(new Date().getFullYear()));

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    const base = new URL("../", import.meta.url);
    // Preview does not register its own service worker or alter the production cache.
    void base;
  }, { once: true });
}
