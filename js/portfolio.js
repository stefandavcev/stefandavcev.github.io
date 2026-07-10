(function () {
  'use strict';

  // Failsafe for static hosting: never leave the page covered by the loader.
  const revealPage = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('loaded');

    document.querySelectorAll('.loading__item, .loading__fade').forEach((element) => {
      element.style.opacity = '1';
      element.style.visibility = 'visible';
    });
  };

  window.setTimeout(revealPage, 4800);

  const year = new Date().getFullYear();
  document.querySelectorAll('.js-current-year').forEach((element) => {
    element.textContent = year;
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('sent') === '1') {
    const notice = document.querySelector('.sd-form-success');
    if (notice) {
      notice.classList.add('is-visible');
      notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    history.replaceState({}, document.title, window.location.pathname);
  }

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.rel = 'noopener noreferrer';
  });

  // Play only the visible featured-project preview. This avoids decoding two
  // 1080p videos at once and keeps mobile scrolling smooth.
  const projectVideos = Array.from(document.querySelectorAll('.sd-project-video'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  const pauseVideo = (video) => {
    if (!video.paused) video.pause();
  };

  const pauseOtherVideos = (activeVideo) => {
    projectVideos.forEach((video) => {
      if (video !== activeVideo) pauseVideo(video);
    });
  };

  projectVideos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
  });

  if (projectVideos.length && !reduceMotion && !saveData && 'IntersectionObserver' in window) {
    const visibility = new Map();

    const playMostVisible = () => {
      if (document.hidden) {
        projectVideos.forEach(pauseVideo);
        return;
      }

      let activeVideo = null;
      let activeRatio = 0;

      projectVideos.forEach((video) => {
        const ratio = visibility.get(video) || 0;
        if (ratio > activeRatio) {
          activeRatio = ratio;
          activeVideo = video;
        }
      });

      if (!activeVideo || activeRatio < 0.35) {
        projectVideos.forEach(pauseVideo);
        return;
      }

      pauseOtherVideos(activeVideo);
      const playPromise = activeVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // A browser setting may block autoplay; the poster remains visible.
        });
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      playMostVisible();
    }, {
      threshold: [0, 0.15, 0.35, 0.6, 0.9],
      rootMargin: '80px 0px'
    });

    projectVideos.forEach((video) => observer.observe(video));
    document.addEventListener('visibilitychange', playMostVisible);
  } else {
    projectVideos.forEach(pauseVideo);
  }
})();
