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

  window.setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader && !loader.classList.contains('loaded')) revealPage();
  }, 4500);

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

  /*
   * Project video playback
   * ----------------------
   * The homepage uses a pinned/horizontally transformed project section.
   * IntersectionObserver can report stale ratios inside that animation, so
   * playback is selected from the videos' real on-screen rectangles instead.
   */
  const projectVideos = Array.from(document.querySelectorAll('.sd-project-video'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  const pauseVideo = (video) => {
    if (!video.paused) video.pause();
  };

  const markReady = (video) => {
    const shell = video.closest('.sd-video-shell');
    if (shell) shell.classList.add('is-video-ready');
  };

  projectVideos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');

    video.addEventListener('playing', () => markReady(video));
    video.addEventListener('canplay', () => {
      if (!video.paused) markReady(video);
    });
  });

  if (projectVideos.length && !reduceMotion && !saveData) {
    // Preload both small portfolio previews so the poster can switch to video
    // immediately when the corresponding card enters the viewport.
    projectVideos.forEach((video) => {
      video.preload = 'auto';
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
        video.load();
      }
    });

    let frameRequest = 0;

    const visibleScore = (video) => {
      const target =
        video.closest('.mxd-project-item__media') ||
        video.closest('.sd-project-hero-image') ||
        video.closest('.sd-video-shell') ||
        video;

      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      if (rect.width <= 0 || rect.height <= 0) return -Infinity;

      const visibleWidth = Math.max(
        0,
        Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
      );
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
      );

      const visibleArea = visibleWidth * visibleHeight;
      if (visibleArea <= 0) return -Infinity;

      const areaRatio = visibleArea / (rect.width * rect.height);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = Math.abs(centerX - viewportWidth / 2) / Math.max(viewportWidth, 1);
      const dy = Math.abs(centerY - viewportHeight / 2) / Math.max(viewportHeight, 1);

      // Prefer the largest visible area, then the item nearest the viewport centre.
      return areaRatio * 100 - (dx + dy) * 8;
    };

    const updatePlayback = () => {
      frameRequest = 0;

      if (document.hidden) {
        projectVideos.forEach(pauseVideo);
        return;
      }

      let activeVideo = null;
      let bestScore = -Infinity;

      projectVideos.forEach((video) => {
        const score = visibleScore(video);
        if (score > bestScore) {
          bestScore = score;
          activeVideo = video;
        }
      });

      if (!activeVideo || bestScore === -Infinity) {
        projectVideos.forEach(pauseVideo);
        return;
      }

      projectVideos.forEach((video) => {
        if (video !== activeVideo) pauseVideo(video);
      });

      if (activeVideo.networkState === HTMLMediaElement.NETWORK_EMPTY) {
        activeVideo.load();
      }

      const playPromise = activeVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // The sharp poster remains visible if a browser blocks autoplay.
        });
      }
    };

    const schedulePlaybackUpdate = () => {
      if (frameRequest) return;
      frameRequest = window.requestAnimationFrame(updatePlayback);
    };

    window.addEventListener('scroll', schedulePlaybackUpdate, { passive: true });
    window.addEventListener('resize', schedulePlaybackUpdate, { passive: true });
    window.addEventListener('orientationchange', schedulePlaybackUpdate, { passive: true });
    window.addEventListener('wheel', schedulePlaybackUpdate, { passive: true });
    window.addEventListener('touchmove', schedulePlaybackUpdate, { passive: true });
    document.addEventListener('visibilitychange', schedulePlaybackUpdate);

    schedulePlaybackUpdate();
    window.setTimeout(schedulePlaybackUpdate, 250);
    window.setTimeout(schedulePlaybackUpdate, 800);
    window.setTimeout(schedulePlaybackUpdate, 1600);

    // Small fallback for transforms driven by animation libraries between scroll events.
    window.setInterval(schedulePlaybackUpdate, 400);
  } else {
    projectVideos.forEach(pauseVideo);
  }
})();
