/* Midnight Celestial Wedding Invitation
 * Dynamic Configuration-Driven Engine
 * All user data is loaded from and linked to config.json
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let config = {};
  let toastTimer = 0;
  let synthAudioPlaying = false;
  let synthAudioCtx = null;
  let synthOscillators = [];

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  async function loadConfig() {
    try {
      const response = await fetch(`config.json?_t=${Date.now()}`, { cache: 'no-cache' });
      if (response.ok) {
        config = await response.json();
      }
    } catch (error) {
      console.warn('Could not load config.json, using current DOM content.', error);
    }
  }

  function initLiveConfigWatcher() {
    if (window.location.protocol === 'file:') return;
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      let lastRaw = JSON.stringify(config);
      setInterval(async () => {
        try {
          const res = await fetch(`config.json?_t=${Date.now()}`);
          if (res.ok) {
            const fresh = await res.json();
            const freshRaw = JSON.stringify(fresh);
            if (lastRaw && freshRaw !== lastRaw) {
              lastRaw = freshRaw;
              config = fresh;
              applyConfig();
              console.info('[LiveUpdate] config.json changes applied automatically.');
            } else if (!lastRaw) {
              lastRaw = freshRaw;
            }
          }
        } catch (_) {}
      }, 1000);
    }
  }

  function applyConfig() {
    if (!config || Object.keys(config).length === 0) return;

    // 1. Bind all data-bind elements
    $$('[data-bind]').forEach((node) => {
      const path = node.getAttribute('data-bind');
      const value = getNestedValue(config, path);
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value.includes('\n')) {
          node.innerHTML = escapeHtml(value).replace(/\n/g, '<br>');
        } else {
          node.textContent = String(value);
        }
      }
    });

    // 2. Dynamic Document Meta
    const partnerOne = getNestedValue(config, 'couple.partnerOne') || 'Nilesh';
    const partnerTwo = getNestedValue(config, 'couple.partnerTwo') || 'Akansha';
    const partnerOneHi = getNestedValue(config, 'couple.partnerOneHindi') || 'निलेश';
    const partnerTwoHi = getNestedValue(config, 'couple.partnerTwoHindi') || 'आकांशा';
    const eventType = getNestedValue(config, 'event.eventType') || 'Ring Ceremony';
    const eventTypeHi = getNestedValue(config, 'event.eventTypeHindi') || 'शुभ सगाई समारोह';
    document.title = `${partnerOne} & ${partnerTwo} — ${eventType} | ${partnerOneHi} एवं ${partnerTwoHi} — ${eventTypeHi}`;

    const descMeta = $('meta[name="description"]');
    if (descMeta) {
      const dateStr = getNestedValue(config, 'event.dateDisplay') || '';
      const venueName = getNestedValue(config, 'venue.name') || '';
      const city = getNestedValue(config, 'venue.city') || '';
      descMeta.content = `${partnerOne} & ${partnerTwo} ${eventType} Invitation | ${partnerOneHi} एवं ${partnerTwoHi} ${eventTypeHi} - ${dateStr}, ${venueName}, ${city}.`;
    }

    // 3. Render Dynamic Schedule
    renderSchedule();

    // 4. Render Dynamic Patrika
    renderPatrika();

    // 5. Render Dynamic Venue Amenities
    renderAmenities();

    // 6. Update Directions & RSVP Links
    updateActionLinks();
  }

  /* Render Timeline Cards dynamically from config.event.schedule */
  function renderSchedule() {
    const listContainer = $('#timeline-cards-list');
    const schedule = getNestedValue(config, 'event.schedule');
    if (!listContainer || !Array.isArray(schedule) || schedule.length === 0) return;

    listContainer.innerHTML = '';
    schedule.forEach((item) => {
      const card = document.createElement('article');
      card.className = `timeline-card reveal ${item.isFeatured ? 'timeline-card--featured' : ''}`;
      
      const muhuratHtml = item.isFeatured && item.muhuratNoteHindi ? `
        <div class="muhurat-spotlight">
          <span class="muhurat-sparkle">★</span>
          <span class="muhurat-text-hi">${escapeHtml(item.muhuratNoteHindi)}</span>
          ${item.muhuratNoteEn ? `<span class="muhurat-text-en">${escapeHtml(item.muhuratNoteEn)}</span>` : ''}
        </div>` : '';

      card.innerHTML = `
        <div class="timeline-card__time-badge">
          <span class="time-digit">${escapeHtml(item.time || '')}</span>
          <small class="time-meridiem">${escapeHtml(item.period || '')}</small>
          <span class="time-label-hi">${escapeHtml(item.timeLabelHindi || '')}</span>
        </div>
        <div class="timeline-card__icon" aria-hidden="true">
          <span style="font-size: 1.4rem;">${item.symbol || '✦'}</span>
        </div>
        <div class="timeline-card__content">
          ${muhuratHtml}
          <p class="timeline-card__index">
            <span>${escapeHtml(item.indexHindi || '')}</span>
            <small>${escapeHtml(item.indexEn || '')}</small>
          </p>
          <h3 class="event-title-hi">${escapeHtml(item.titleHindi || '')}</h3>
          <p class="event-title-en">${escapeHtml(item.titleEn || '')}</p>
          <p class="event-desc-hi">${escapeHtml(item.descriptionHindi || '')}</p>
          <p class="event-desc-en">${escapeHtml(item.descriptionEn || '')}</p>
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  /* Render Patrika Lists dynamically from config.patrika */
  function renderPatrika() {
    const swgList = $('#swagatakankshi-list');
    const dshList = $('#darshanabhilashi-list');

    const swgData = getNestedValue(config, 'patrika.swagatakankshiList');
    if (swgList && Array.isArray(swgData)) {
      swgList.innerHTML = swgData.map((item) => `
        <li>
          <strong>${escapeHtml(item.nameHindi || '')}</strong>
          <small>${escapeHtml(item.nameEn || '')}</small>
        </li>
      `).join('');
    }

    const dshData = getNestedValue(config, 'patrika.darshanabhilashiList');
    if (dshList && Array.isArray(dshData)) {
      dshList.innerHTML = dshData.map((item) => `
        <li>
          <strong>${escapeHtml(item.nameHindi || '')}</strong>
          <small>${escapeHtml(item.nameEn || '')}</small>
        </li>
      `).join('');
    }
  }

  /* Render Venue Amenities dynamically from config.venue.amenities */
  function renderAmenities() {
    const container = $('#venue-amenities-container');
    const amenities = getNestedValue(config, 'venue.amenities');
    if (!container || !Array.isArray(amenities)) return;

    container.innerHTML = amenities.map((item) => `
      <span class="amenity-chip">${escapeHtml(item)}</span>
    `).join('');
  }

  /* Update Interactive Action Links */
  function updateActionLinks() {
    // 1. Google Maps
    const mapsLink = $('#directions-link');
    const mapsUrl = getNestedValue(config, 'venue.mapsUrl') ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getNestedValue(config, 'venue.mapsQuery') || 'Hotel Raj Palace, Katni')}`;
    if (mapsLink) mapsLink.href = mapsUrl;

    // 2. RSVP Call Button
    const callBtn = $('#rsvp-call-btn');
    const primaryPhone = getNestedValue(config, 'rsvp.contactPrimary') || '+91 9893224757';
    if (callBtn) {
      callBtn.href = `tel:${primaryPhone.replace(/\s+/g, '')}`;
      const callText = callBtn.querySelector('span');
      if (callText) callText.textContent = `कॉल करें / Call (${primaryPhone})`;
    }

    // 3. RSVP WhatsApp Button
    const waBtn = $('#rsvp-whatsapp-btn');
    const waNumber = getNestedValue(config, 'rsvp.whatsappNumber') || '919893224757';
    const waMsg = getNestedValue(config, 'rsvp.whatsappMessage') ||
      `Namaste, we have received the invitation for ${getNestedValue(config, 'couple.partnerOne') || 'Nilesh'} & ${getNestedValue(config, 'couple.partnerTwo') || 'Akansha'}.`;
    if (waBtn) {
      waBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;
    }
  }

  function showToast(message) {
    const toast = $('#site-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4000);
  }

  /* Intro Screen Dismissal & Music Start */
  function initIntro() {
    const intro = $('#intro');
    const button = $('#discover-button');
    if (!intro) return;

    function dismiss() {
      if (intro.classList.contains('is-leaving')) return;
      intro.classList.add('is-leaving');
      document.body.classList.remove('intro-active');
      window.setTimeout(() => {
        intro.hidden = true;
      }, 950);
      startMusic();
    }

    button?.addEventListener('click', dismiss);

    let dismissed = false;
    window.addEventListener('wheel', (e) => {
      if (!dismissed && e.deltaY > 25) {
        dismissed = true;
        dismiss();
      }
    }, { passive: true });

    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
      if (!dismissed && touchStartY - e.changedTouches[0].clientY > 45) {
        dismissed = true;
        dismiss();
      }
    }, { passive: true });
  }

  /* Sticky Navigation & Mobile Menu */
  function initNavigation() {
    const toggle = $('#menu-toggle');
    const mobileNav = $('#main-nav-mobile');
    const links = $$('.main-nav a, .mobile-nav a');

    if (toggle && mobileNav) {
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        mobileNav.hidden = open;
      });

      links.forEach((link) => {
        link.addEventListener('click', () => {
          toggle.setAttribute('aria-expanded', 'false');
          mobileNav.hidden = true;
        });
      });
    }

    const backToTop = $('#back-to-top');
    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* Scroll Reveal Animation */
  function initReveal() {
    if (prefersReducedMotion) {
      $$('.reveal').forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    $$('.reveal').forEach((el) => observer.observe(el));
  }

  /* Auspicious Muhurat Countdown linked to config */
  function initCountdown() {
    const targetIso = getNestedValue(config, 'event.dateTimeLocal') || '2026-11-11T12:00:00+05:30';
    const targetDate = new Date(targetIso);
    const daysEl = $('#countdown-days');
    const hoursEl = $('#countdown-hours');
    const minutesEl = $('#countdown-minutes');
    const secondsEl = $('#countdown-seconds');
    const statusEl = $('#countdown-status');

    function update() {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minutesEl) minutesEl.textContent = '00';
        if (secondsEl) secondsEl.textContent = '00';
        if (statusEl) statusEl.textContent = 'आज का पावन दिन • शुभ सगाई समारोह प्रारंभ / Today is the Auspicious Day!';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    update();
    window.setInterval(update, 1000);
  }

  /* Calendar Actions (Google Calendar & .ics download linked to config) */
  function initCalendar() {
    const googleLink = $('#calendar-link');
    const icsBtn = $('#download-ics');

    const partnerOne = getNestedValue(config, 'couple.partnerOne') || 'Nilesh';
    const partnerTwo = getNestedValue(config, 'couple.partnerTwo') || 'Akansha';
    const partnerOneHi = getNestedValue(config, 'couple.partnerOneHindi') || 'निलेश';
    const partnerTwoHi = getNestedValue(config, 'couple.partnerTwoHindi') || 'आकांशा';
    const familyLine = getNestedValue(config, 'family.familyLine') || 'Vishwakarma Family';
    const venueName = getNestedValue(config, 'venue.name') || 'Hotel Raj Palace';
    const venueAddress = getNestedValue(config, 'venue.address') || 'Katni';
    const rsvpPhone = getNestedValue(config, 'rsvp.contactPrimary') || '';

    const title = `${partnerOneHi} एवं ${partnerTwoHi} - शुभ सगाई समारोह | ${partnerOne} & ${partnerTwo} Ring Ceremony`;
    const location = `${venueName}, ${venueAddress}`;
    const details = `शुभ सगाई समारोह (Ring Ceremony & Engagement) of ${partnerOne} & ${partnerTwo} (${familyLine}). Shubh Muhurat at ${getNestedValue(config, 'event.shubhMuhurat') || '12:15 PM'}. R.S.V.P: ${rsvpPhone}`;
    const startIso = getNestedValue(config, 'event.startTimeIso') || '20261111T063000Z';
    const endIso = getNestedValue(config, 'event.endTimeIso') || '20261111T103000Z';

    if (googleLink) {
      const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
      googleLink.href = gUrl;
      googleLink.target = '_blank';
      googleLink.rel = 'noopener noreferrer';
    }

    if (icsBtn) {
      icsBtn.addEventListener('click', () => {
        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          `PRODID:-//${familyLine}//Ring Ceremony//EN`,
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `DTSTART:${startIso}`,
          `DTEND:${endIso}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${details}`,
          `LOCATION:${location}`,
          'STATUS:CONFIRMED',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${partnerOne}_${partnerTwo}_Ring_Ceremony.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('निमंत्रण कैलेंडर फ़ाइल डाउनलोड हो गई है (.ics)');
      });
    }
  }

  /* WhatsApp Share formatted from config */
  function initSharing() {
    const shareBtn = $('#share-whatsapp');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', () => {
      const partnerOneHi = getNestedValue(config, 'couple.partnerOneHindi') || 'निलेश';
      const partnerTwoHi = getNestedValue(config, 'couple.partnerTwoHindi') || 'आकांशा';
      const eventTypeHi = getNestedValue(config, 'event.eventTypeHindi') || 'शुभ सगाई समारोह';
      const familyClanHi = getNestedValue(config, 'family.familyLineHindi') || 'विश्वकर्मा परिवार';
      const dateHi = getNestedValue(config, 'event.dateDisplayHindi') || 'बुधवार, 11 नवम्बर 2026';
      const timeHi = getNestedValue(config, 'event.timeDisplayHindi') || 'दोपहर 12:00 बजे से';
      const muhuratHi = getNestedValue(config, 'event.shubhMuhuratHindi') || 'दोपहर 12:15 बजे';
      const venueNameHi = getNestedValue(config, 'venue.nameHindi') || 'होटल राज पैलेस';
      const venueAddrHi = getNestedValue(config, 'venue.addressHindi') || '';
      const rsvpPrimary = getNestedValue(config, 'rsvp.contactPrimary') || '';
      const rsvpSecondary = getNestedValue(config, 'rsvp.contactSecondary') || '';

      const url = window.location.href;
      const text = `॥ श्री गणेशाय नमः ॥\n\n*${partnerOneHi} एवं ${partnerTwoHi}*\n${eventTypeHi}\n(${familyClanHi})\n\nदिनांक: ${dateHi} (${timeHi})\nशुभ मुहूर्त: ${muhuratHi}\nस्थान: ${venueNameHi}, ${venueAddrHi}\n\nहम अत्यंत हर्ष और स्नेहपूर्वक आपको सपरिवार सादर आमंत्रित करते हैं।\n\nR.S.V.P: ${rsvpPrimary} / ${rsvpSecondary}\n\nडिजिटल निमंत्रण पत्र देखें:\n${url}`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });
  }

  /* Indian Classical Ambient Drone Synthesizer */
  function playIndianSynth() {
    try {
      if (!synthAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        synthAudioCtx = new AudioContext();
      }
      if (synthAudioCtx.state === 'suspended') {
        synthAudioCtx.resume();
      }

      const freqs = [138.59, 207.65, 277.18, 349.23];
      synthOscillators = [];

      const masterGain = synthAudioCtx.createGain();
      masterGain.gain.setValueAtTime(0.01, synthAudioCtx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.18, synthAudioCtx.currentTime + 3);
      masterGain.connect(synthAudioCtx.destination);

      freqs.forEach((freq, idx) => {
        const osc = synthAudioCtx.createOscillator();
        const gain = synthAudioCtx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, synthAudioCtx.currentTime);

        const lfo = synthAudioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.2 + idx * 0.1, synthAudioCtx.currentTime);
        const lfoGain = synthAudioCtx.createGain();
        lfoGain.gain.setValueAtTime(1.5, synthAudioCtx.currentTime);
        lfo.connect(osc.frequency);
        lfo.start();

        gain.gain.setValueAtTime(0.25, synthAudioCtx.currentTime);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();

        synthOscillators.push({ osc, gain, lfo, masterGain });
      });

      synthAudioPlaying = true;
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }
  }

  function stopIndianSynth() {
    if (synthAudioPlaying && synthOscillators.length > 0) {
      synthOscillators.forEach(({ osc, lfo, masterGain }) => {
        try {
          masterGain.gain.exponentialRampToValueAtTime(0.001, synthAudioCtx.currentTime + 1);
          window.setTimeout(() => {
            try { osc.stop(); lfo.stop(); } catch (_) {}
          }, 1100);
        } catch (_) {}
      });
      synthOscillators = [];
      synthAudioPlaying = false;
    }
  }

  /* Music Controller Helpers */
  function setMusicPlayingState(playing) {
    const button = $('#music-control');
    if (!button) return;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'संगीत रोकें / Pause Music' : 'शुभ संगीत सुनें / Play Music');
  }

  async function startMusic() {
    const button = $('#music-control');
    const audio = $('#background-music');
    if (button && button.getAttribute('aria-pressed') === 'true') return;

    let playedFile = false;
    if (audio && audio.src) {
      try {
        await audio.play();
        playedFile = true;
        setMusicPlayingState(true);
      } catch (_) {
        playedFile = false;
      }
    }

    if (!playedFile) {
      playIndianSynth();
      setMusicPlayingState(true);
      showToast('राजसी शहनाई एवं तानपुरा संगीत प्रारंभ / Playing Royal Ambient Melodies');
    }
  }

  function pauseMusic() {
    const audio = $('#background-music');
    if (audio && !audio.paused) {
      audio.pause();
    }
    stopIndianSynth();
    setMusicPlayingState(false);
  }

  function toggleMusic() {
    const button = $('#music-control');
    if (!button) return;
    const isPressed = button.getAttribute('aria-pressed') === 'true';
    if (isPressed) {
      pauseMusic();
    } else {
      startMusic();
    }
  }

  /* Music Controller */
  function initMusic() {
    const button = $('#music-control');
    if (!button) return;
    button.addEventListener('click', toggleMusic);
  }

  /* Guestbook linked to config.defaultBlessings */
  const STORAGE_KEY = 'midnight-celestial-blessings-v4';

  function readBlessings() {
    const defaultList = getNestedValue(config, 'defaultBlessings') || [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return defaultList;
    } catch (_) {
      return defaultList;
    }
  }

  function renderBlessings(list) {
    const container = $('#blessing-entries');
    const empty = $('#empty-blessings');
    const clear = $('#clear-blessings');
    if (!container) return;

    $$('.blessing-entry', container).forEach((n) => n.remove());

    if (empty) empty.hidden = list.length > 0;
    if (clear) clear.hidden = list.length === 0;

    list.slice().reverse().forEach((item) => {
      const card = document.createElement('article');
      card.className = 'blessing-entry';
      card.innerHTML = `
        <h4 class="blessing-entry__name">${escapeHtml(item.name || item.nameHindi || '')}</h4>
        <p class="blessing-entry__message">${escapeHtml(item.message || '')}</p>
        <span class="blessing-entry__date">${item.date ? new Date(item.date).toLocaleDateString('hi-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'शुभकामना'}</span>
      `;
      container.appendChild(card);
    });
  }

  function initGuestbook() {
    const form = $('#blessing-form');
    const nameField = $('#guest-name');
    const msgField = $('#guest-message');
    const counter = $('#character-count');
    const feedback = $('#form-feedback');
    const clearBtn = $('#clear-blessings');
    const wishChips = $$('.wish-chip');

    let blessings = readBlessings();
    renderBlessings(blessings);

    wishChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const wish = chip.getAttribute('data-wish');
        if (msgField && wish) {
          msgField.value = wish;
          if (counter) counter.textContent = `${wish.length} / 400`;
          msgField.focus();
        }
      });
    });

    if (msgField && counter) {
      msgField.addEventListener('input', () => {
        counter.textContent = `${msgField.value.length} / 400`;
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameField?.value.trim();
        const message = msgField?.value.trim();

        if (!name || !message) {
          if (feedback) feedback.textContent = 'कृपया अपना नाम और शुभकामना संदेश लिखें।';
          return;
        }

        blessings.push({ name, message, date: new Date().toISOString() });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(blessings));
          if (feedback) feedback.textContent = 'आपका आशीर्वचन सफलतापूर्वक सहेज लिया गया है। धन्यवाद!';
        } catch (_) {}

        renderBlessings(blessings);
        form.reset();
        if (counter) counter.textContent = '0 / 400';
        triggerStarburst(window.innerWidth * 0.5, Math.min(window.innerHeight * 0.7, 500), 16);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        blessings = [...(getNestedValue(config, 'defaultBlessings') || [])];
        renderBlessings(blessings);
        if (feedback) feedback.textContent = 'संदेश रीसेट कर दिए गए हैं।';
      });
    }
  }

  /* Starfield Background Canvas */
  function initStarfield() {
    const canvas = $('#starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars = [];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const count = Math.min(160, Math.floor((width * height) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.02 + 0.005
      }));
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((s) => {
        s.alpha += s.speed;
        const currentAlpha = Math.abs(Math.sin(s.alpha));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 225, 190, ${currentAlpha * 0.75})`;
        ctx.fill();
      });
      if (!prefersReducedMotion) {
        requestAnimationFrame(render);
      }
    }

    resize();
    render();
    window.addEventListener('resize', resize, { passive: true });
  }

  /* Starburst click effect */
  function triggerStarburst(x, y, count = 16) {
    if (prefersReducedMotion) return;
    const layer = document.createElement('div');
    Object.assign(layer.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: '999', pointerEvents: 'none'
    });

    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.2);
      const dist = 30 + Math.random() * 60;
      Object.assign(spark.style, {
        position: 'absolute', width: '3px', height: '3px', borderRadius: '50%',
        background: i % 2 === 0 ? '#F7E7BD' : '#D8BD83',
        boxShadow: '0 0 8px #F7E7BD',
        transform: 'translate(-50%, -50%)',
        transition: 'transform 800ms ease-out, opacity 800ms ease-out'
      });
      layer.appendChild(spark);
      requestAnimationFrame(() => {
        spark.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`;
        spark.style.opacity = '0';
      });
    }
    document.body.appendChild(layer);
    window.setTimeout(() => layer.remove(), 850);
  }

  /* Floating Floral Petals */
  function initPetals() {
    if (prefersReducedMotion) return;
    const container = $('#petals-container');
    if (!container) return;
    const colors = ['#D8BD83', '#F7E7BD', '#E8C4D0', '#F5D09A', '#FFFFFF'];
    const count = Math.min(16, Math.max(8, Math.floor(window.innerWidth / 90)));

    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      petal.className = 'petal';
      const size = Math.random() * 8 + 6;
      const left = Math.random() * 100;
      const duration = Math.random() * 10 + 12;
      const delay = Math.random() * -20;
      const col = colors[Math.floor(Math.random() * colors.length)];

      petal.style.cssText = `
        left: ${left}%;
        width: ${size}px;
        height: ${size * 1.5}px;
        background: ${col};
        opacity: ${Math.random() * 0.35 + 0.15};
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(petal);
    }
  }

  function initInteractiveClicks() {
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, input, textarea, form, nav')) return;
      triggerStarburst(e.clientX, e.clientY, 12);
    }, { passive: true });
  }

  async function init() {
    await loadConfig();
    applyConfig();
    initIntro();
    initNavigation();
    initReveal();
    initCountdown();
    initCalendar();
    initSharing();
    initMusic();
    initGuestbook();
    initStarfield();
    initPetals();
    initInteractiveClicks();
    initLiveConfigWatcher();
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
