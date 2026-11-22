// Activa los avisos push en este celular con Firebase Cloud Messaging.
// La configuración (pública por diseño) la pone tools/web/construir.js en window.GUARDIAS_CONFIG.
// Firebase se carga recién cuando el médico toca "Activar avisos".
(function () {
  'use strict';
  const C = window.GUARDIAS_CONFIG || {};
  const VERSION_FIREBASE = '10.14.1';
  const configurado = !!(C.firebase && C.firebase.apiKey && C.vapidKey);

  function cargar(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => mal(new Error('No se pudo cargar Firebase. Revisá la conexión y probá de nuevo.'));
      document.head.appendChild(s);
    });
  }

  window.GuardiasPush = {
    soportado: () => configurado && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    instalada: () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true,
    async activar() {
      if (!('Notification' in window)) throw new Error('Este navegador no permite avisos. En iPhone, abrí la app desde el ícono de la pantalla de inicio.');
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        throw new Error('No se dio permiso para las notificaciones. Para activarlas: Ajustes del celular → Notificaciones → Guardias UPA → Permitir. Después tocá de nuevo "Activar avisos".');
      }
      const registro = await navigator.serviceWorker.ready;
      if (!window.firebase) {
        await cargar('https://www.gstatic.com/firebasejs/' + VERSION_FIREBASE + '/firebase-app-compat.js');
        await cargar('https://www.gstatic.com/firebasejs/' + VERSION_FIREBASE + '/firebase-messaging-compat.js');
      }
      if (!firebase.apps.length) firebase.initializeApp(C.firebase);
      const token = await firebase.messaging().getToken({ vapidKey: C.vapidKey, serviceWorkerRegistration: registro });
      if (!token) throw new Error('No se pudo activar los avisos. Probá de nuevo.');
      const ua = navigator.userAgent || '';
      return { token: token, plataforma: /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'otro' };
    }
  };
})();
