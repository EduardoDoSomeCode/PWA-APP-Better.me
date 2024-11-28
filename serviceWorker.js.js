const betterMeAPP = "PWA-Better-me";
const assets = [
  "http://127.0.0.1:5500/serviceWorker.js",
  "/",
  "/index.html",
  "/css/styles.css",
  "/css/toastify.min.css",
  "/js/main.js",
  "/js/toastify.min.js",
  "/pages/404.html",
  "/pages/add-note.html",
  "/pages/add-todo.html",
  "/pages/habits.html",
  "/pages/home.html",
  "/pages/login.html",
  "/pages/user-management.html",
  "/img/fr.png",
  "/img/mx.png",
  "/img/us.png",

];

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(betterMeAPP).then(cache => {
      cache.addAll(assets);
    })
  );
});

self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request);
    })
  );
});
