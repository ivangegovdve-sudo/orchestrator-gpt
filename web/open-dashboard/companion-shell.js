const sidebar = document.querySelector('.sidebar'), toggle = document.querySelector('.menu-toggle');
toggle?.addEventListener('click', () => { const open = sidebar.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { sidebar?.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false'); } });
for (const link of document.querySelectorAll('.sidebar a')) {
  if (new URL(link.href).pathname === location.pathname && !link.search) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
}
