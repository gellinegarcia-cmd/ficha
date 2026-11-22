// Service worker de Guardias UPA (app instalable en GitHub Pages).
// 1) Guarda la "cáscara" de la app (HTML, íconos) para que abra rápido; nunca guarda datos.
// 2) Muestra los avisos push con sus botones. Un botón con "firma" ([La hice], [Sí], [No]) se
//    confirma acá mismo, sin abrir la app; los demás abren la pantalla indicada.
// __SERVIDOR__ y __VERSION__ los completa tools/web/construir.js.
const SERVIDOR = "https://script.google.com/macros/s/AKfycbz7o_6xHt-R5AtmpyQqwwa8rpPt6Ra7hLf6owNOt-jf-jNOuLDMMVgP7r4jcOh0w1dq/exec";
const CACHE = "guardias-upa-202611222008";
const ICONO = 'icon-192.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((n) => Promise.all(n.filter((x) => x !== CACHE).map((x) => caches.delete(x))))
    .then(() => self.clients.claim()));
});

// Red primero; si no hay señal, la última versión guardada. Solo lo del propio sitio y solo GET.
self.addEventListener('fetch', (event) => {
  const r = event.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  event.respondWith(fetch(r).then((resp) => {
    const copia = resp.clone();
    caches.open(CACHE).then((c) => c.put(r, copia));
    return resp;
  }).catch(() => caches.match(r).then((x) => x || caches.match('./'))));
});

function leerAviso(event) {
  let j = {};
  try { j = event.data ? event.data.json() : {}; } catch (e) { j = { cuerpo: event.data ? event.data.text() : '' }; }
  const d = j.data || j; // Firebase manda { data: {...} }
  let acciones = [];
  try { acciones = JSON.parse(d.acciones || '[]'); } catch (e) { acciones = []; }
  return { titulo: d.titulo || 'Guardias UPA', cuerpo: d.cuerpo || '', url: d.url || './', etiqueta: d.etiqueta || '', acciones: acciones };
}

self.addEventListener('push', (event) => {
  const a = leerAviso(event);
  event.waitUntil(self.registration.showNotification(a.titulo, {
    body: a.cuerpo, icon: ICONO, badge: ICONO, tag: a.etiqueta || undefined,
    data: { url: a.url, acciones: a.acciones },
    actions: a.acciones.map((x) => ({ action: x.accion, title: x.titulo }))
  }));
});

function abrir(url) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    const ventana = lista.find((c) => c.url.startsWith(self.registration.scope));
    if (ventana) return ventana.navigate(url).then((c) => (c || ventana).focus()).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  });
}

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  const datos = n.data || {};
  n.close();
  const accion = (datos.acciones || []).find((x) => x.accion === event.action);
  if (accion && accion.firma) {
    event.waitUntil(fetch(SERVIDOR, { method: 'POST', body: JSON.stringify({ f: 'accionAviso', args: [accion.firma] }) })
      .then((r) => r.json())
      .then((j) => {
        if (j.r && j.r.ok) return self.registration.showNotification('Guardias UPA', { body: j.r.texto, icon: ICONO, tag: 'resultado' });
        return abrir(datos.url || './');
      })
      .catch(() => abrir(datos.url || './')));
    return;
  }
  event.waitUntil(abrir((accion && accion.url) || datos.url || './'));
});
