const CACHE_NAME = "qipei-v24";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 安装：预缓存核心资源
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// 激活：清理旧缓存
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求：页面走「联网优先」（保证总是最新版，断网时用缓存）；静态资源走「缓存优先」
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        if (sameOrigin && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./index.html", copy));
        }
        return res;
      }).catch(() =>
        caches.match("./index.html").then(hit => hit || caches.match("./"))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok && sameOrigin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
