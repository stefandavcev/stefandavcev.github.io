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
  }, 1200);

  const year = new Date().getFullYear();
  document.querySelectorAll('.js-current-year').forEach((element) => {
    element.textContent = year;
  });

  // Keep the compact desktop navigation consistent across static pages.
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sd-desktop-nav a').forEach((link) => {
    const linkPage = (link.getAttribute('href') || '').split('#')[0];
    if (linkPage === currentPage) link.setAttribute('aria-current', 'page');
  });

  // The template duplicates animated button captions visually. A single
  // aria-label keeps those controls concise for assistive technology.
  document.querySelectorAll('.btn-anim').forEach((button) => {
    if (button.hasAttribute('aria-label')) return;
    const caption = button.querySelector('.btn-caption');
    const animatedCaption = caption && caption.querySelector('.btn-anim__block');
    const label = (animatedCaption || caption)?.textContent.trim();
    if (label) {
      button.setAttribute('aria-label', label);
    }
  });

  document.querySelectorAll('i[class*="ph-"]').forEach((icon) => {
    icon.setAttribute('aria-hidden', 'true');
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

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  /* ---------------------------------------------------------------
     Project video playback
     One video plays at a time. Playback starts only when a project preview
     is actually visible, and follows the user's natural scroll position.
     --------------------------------------------------------------- */
  const projectVideos = Array.from(document.querySelectorAll('.sd-project-video'));
  let activeProjectVideo = null;
  let projectVideoFrame = 0;
  let projectVideoTimer = 0;

  const pauseProjectVideo = (video) => {
    if (!video.paused) video.pause();
  };

  const pauseOtherProjectVideos = (activeVideo = null) => {
    projectVideos.forEach((video) => {
      if (video !== activeVideo) pauseProjectVideo(video);
    });
  };

  const markProjectVideoReady = (video) => {
    const shell = video.closest('.sd-video-shell');
    if (shell) shell.classList.add('is-video-ready');
  };

  projectVideos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.autoplay = false;
    video.removeAttribute('autoplay');
    video.preload = 'metadata';

    video.addEventListener('playing', () => markProjectVideoReady(video));
    video.addEventListener('loadeddata', () => {
      if (video === activeProjectVideo && video.paused) {
        const retry = video.play();
        if (retry && typeof retry.catch === 'function') retry.catch(() => {});
      }
    });
  });

  const getProjectVisibility = (video) => {
    const target =
      video.closest('.mxd-project-item__media') ||
      video.closest('.sd-project-hero-image') ||
      video.closest('.sd-video-shell') ||
      video;

    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    const visibleWidth = Math.max(
      0,
      Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
    );
    const visibleHeight = Math.max(
      0,
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
    );
    const visibleArea = visibleWidth * visibleHeight;
    const viewportArea = Math.max(viewportWidth * viewportHeight, 1);

    if (visibleArea <= 0) {
      return { visible: false, score: -Infinity };
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceFromCenter =
      Math.abs(centerX - viewportWidth / 2) / Math.max(viewportWidth, 1) +
      Math.abs(centerY - viewportHeight / 2) / Math.max(viewportHeight, 1);

    const viewportCoverage = visibleArea / viewportArea;

    return {
      visible: viewportCoverage >= 0.025,
      score: viewportCoverage * 100 - distanceFromCenter * 6
    };
  };

  const playProjectVideo = (video) => {
    if (!video) return;

    if (activeProjectVideo !== video) {
      pauseOtherProjectVideos(video);
      activeProjectVideo = video;

      if (video.dataset.sdLoaded !== 'true') {
        video.dataset.sdLoaded = 'true';
        video.preload = 'auto';
        video.load();
      }

      try {
        video.currentTime = 0;
      } catch (error) {
        // Seeking may be unavailable until metadata has loaded.
      }
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // A later scroll/timer pass retries playback automatically.
      });
    }
  };

  const updateProjectVideoPlayback = () => {
    projectVideoFrame = 0;

    if (!projectVideos.length || document.hidden) {
      pauseOtherProjectVideos();
      activeProjectVideo = null;
      return;
    }

    let bestVideo = null;
    let bestScore = -Infinity;

    projectVideos.forEach((video) => {
      const visibility = getProjectVisibility(video);
      if (!visibility.visible) return;

      if (visibility.score > bestScore) {
        bestScore = visibility.score;
        bestVideo = video;
      }
    });

    if (!bestVideo) {
      pauseOtherProjectVideos();
      activeProjectVideo = null;
      return;
    }

    playProjectVideo(bestVideo);
  };

  const scheduleProjectVideoPlayback = () => {
    if (projectVideoFrame) return;
    projectVideoFrame = window.requestAnimationFrame(updateProjectVideoPlayback);
  };

  if (projectVideos.length) {
    window.addEventListener('scroll', scheduleProjectVideoPlayback, { passive: true });
    window.addEventListener('resize', scheduleProjectVideoPlayback, { passive: true });
    window.addEventListener('orientationchange', scheduleProjectVideoPlayback, { passive: true });
    window.addEventListener('wheel', scheduleProjectVideoPlayback, { passive: true });
    window.addEventListener('touchmove', scheduleProjectVideoPlayback, { passive: true });
    document.addEventListener('visibilitychange', scheduleProjectVideoPlayback);

    scheduleProjectVideoPlayback();
    window.setTimeout(scheduleProjectVideoPlayback, 300);
    window.setTimeout(scheduleProjectVideoPlayback, 900);

    // The desktop project section is transformed horizontally by another script.
    // This light timer keeps playback in sync even between native scroll events.
    projectVideoTimer = window.setInterval(scheduleProjectVideoPlayback, 250);
  }

  /* ---------------------------------------------------------------
     Mobile service-card stack
     Cards remain in normal document order but become sticky on phones. The
     next card visually covers and slightly compresses the previous one.
     --------------------------------------------------------------- */
  const mobileServicesQuery = window.matchMedia('(max-width: 767px)');
  const serviceCards = Array.from(document.querySelectorAll('.services-stack .stack-item'));
  let serviceObserver = null;
  let stackFrame = 0;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const resetServiceCards = () => {
    if (serviceObserver) {
      serviceObserver.disconnect();
      serviceObserver = null;
    }

    serviceCards.forEach((card) => {
      card.classList.remove('sd-mobile-reveal', 'is-in-view');
      card.style.removeProperty('--sd-reveal-delay');
      card.style.removeProperty('--sd-stack-index');
      card.style.removeProperty('--sd-stack-scale');
      card.style.removeProperty('--sd-stack-y');
      card.style.removeProperty('--sd-stack-brightness');
    });
  };

  const updateMobileServiceStack = () => {
    stackFrame = 0;
    if (!mobileServicesQuery.matches || !serviceCards.length) return;

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    serviceCards.forEach((card, index) => {
      const nextCard = serviceCards[index + 1];
      if (!nextCard) {
        card.style.setProperty('--sd-stack-scale', '1');
        card.style.setProperty('--sd-stack-y', '0rem');
        card.style.setProperty('--sd-stack-brightness', '1');
        return;
      }

      const nextRect = nextCard.getBoundingClientRect();
      const stickyTop = 72 + index * 8.5;
      const animationStart = viewportHeight * 0.88;
      const animationEnd = stickyTop + 105;
      const progress = clamp(
        (animationStart - nextRect.top) / Math.max(animationStart - animationEnd, 1),
        0,
        1
      );

      card.style.setProperty('--sd-stack-scale', (1 - progress * 0.038).toFixed(4));
      card.style.setProperty('--sd-stack-y', `${(-progress * 0.75).toFixed(3)}rem`);
      card.style.setProperty('--sd-stack-brightness', (1 - progress * 0.13).toFixed(3));
    });
  };

  const scheduleMobileServiceStack = () => {
    if (stackFrame) return;
    stackFrame = window.requestAnimationFrame(updateMobileServiceStack);
  };

  const setupServiceStack = () => {
    resetServiceCards();
    if (!serviceCards.length) return;

    if (!mobileServicesQuery.matches) {
      serviceCards.forEach((card) => card.classList.add('is-in-view'));
      return;
    }

    serviceCards.forEach((card, index) => {
      card.style.setProperty('--sd-stack-index', String(index));
      card.style.setProperty('--sd-reveal-delay', `${Math.min(index, 3) * 45}ms`);
      if (!reduceMotion) card.classList.add('sd-mobile-reveal');
    });

    if (reduceMotion) {
      serviceCards.forEach((card) => card.classList.add('is-in-view'));
    } else {
      serviceObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in-view');
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -5% 0px'
        }
      );

      serviceCards.forEach((card) => serviceObserver.observe(card));
    }

    scheduleMobileServiceStack();
  };

  setupServiceStack();

  window.addEventListener('scroll', scheduleMobileServiceStack, { passive: true });
  window.addEventListener('resize', scheduleMobileServiceStack, { passive: true });
  window.addEventListener('orientationchange', scheduleMobileServiceStack, { passive: true });

  if (typeof mobileServicesQuery.addEventListener === 'function') {
    mobileServicesQuery.addEventListener('change', setupServiceStack);
  } else if (typeof mobileServicesQuery.addListener === 'function') {
    mobileServicesQuery.addListener(setupServiceStack);
  }
})();
