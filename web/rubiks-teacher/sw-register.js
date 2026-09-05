if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/web/rubiks-teacher/sw.js', { scope: '/web/rubiks-teacher/' })
      .then((registration) => {
        /* `register()` resolving means the SCRIPT was accepted, not that the
         * app is available offline -- install runs afterwards and can still
         * fail. The previous version logged "registration successful" here and
         * nothing anywhere reported a failed precache, so the one signal a
         * developer had said "installed" whether or not it was.
         *
         * Report the outcome that was actually promised. */
        const worker = registration.installing || registration.waiting;
        if (!worker) return; // already active from an earlier visit

        worker.addEventListener('statechange', () => {
          if (worker.state === 'redundant') {
            console.error(
              'Cubeflow: service worker install FAILED - the app is NOT available offline.'
            );
          } else if (worker.state === 'activated') {
            console.log('Cubeflow: offline shell cached and active.');
          }
        });
      })
      .catch((err) => {
        console.error('Cubeflow: service worker registration failed:', err);
      });
  });
}
