if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/web/rubiks-teacher/sw.js', {
      scope: '/web/rubiks-teacher/'
    })
    .then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    })
    .catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
