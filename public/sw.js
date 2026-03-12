self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // 今回は最低限の service worker。
  // 後でキャッシュ対応を足せるようにしているだけ。
});