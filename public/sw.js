// Service worker: shows push notifications and opens the right page when one is tapped.

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "IFGF Rides", {
      body: data.body,
      icon: "/icon",
      data: { href: data.href || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.href || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse an open IFGF Rides tab/app window if there is one.
      for (const win of windows) {
        if ("focus" in win) return win.navigate(url).then((w) => (w ?? win).focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
