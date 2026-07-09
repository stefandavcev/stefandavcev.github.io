(function(){
  // Failsafe for static hosting: the original template loader depends on several
  // animation libraries. Keep the visual intro, but never let a library error
  // leave the page covered.
  const revealPage = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('loaded');
    document.querySelectorAll('.loading__item, .loading__fade').forEach(el => {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
    });
  };
  window.setTimeout(revealPage, 4800);

  const year = new Date().getFullYear();
  document.querySelectorAll('.js-current-year').forEach(el => el.textContent = year);
  const params = new URLSearchParams(window.location.search);
  if(params.get('sent') === '1'){
    const notice = document.querySelector('.sd-form-success');
    if(notice){ notice.classList.add('is-visible'); notice.scrollIntoView({behavior:'smooth', block:'center'}); }
    history.replaceState({}, document.title, window.location.pathname);
  }
  document.querySelectorAll('a[target="_blank"]').forEach(a => a.rel = 'noopener noreferrer');
})();
