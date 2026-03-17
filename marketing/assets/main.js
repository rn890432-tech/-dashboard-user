/* =========================================================
   CyberSentinel AI – Marketing Site JavaScript
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. MOBILE NAV TOGGLE
  --------------------------------------------------------- */
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu   = document.getElementById('mobileMenu');

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', String(open));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
        mobileMenu.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------------------------------------------------
     2. STICKY NAV — add scrolled class for shadow / bg
  --------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 32);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* ---------------------------------------------------------
     3. SMOOTH SCROLL for anchor links
  --------------------------------------------------------- */
  document.querySelectorAll('a[href*="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const url   = new URL(anchor.href, location.href);
      const hash  = url.hash;
      // Only intercept same-page anchors
      if (url.pathname !== location.pathname || !hash) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', hash);
    });
  });

  /* ---------------------------------------------------------
     4. ANIMATED STAT COUNTERS (homepage hero stats)
  --------------------------------------------------------- */
  function animateCounter(el) {
    const target   = parseFloat(el.dataset.target || el.textContent.replace(/[^0-9.]/g, ''));
    const suffix   = el.dataset.suffix || '';
    const prefix   = el.dataset.prefix || '';
    const duration = 1800; // ms
    const frameRate = 60;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    let frame = 0;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const timer = setInterval(() => {
      frame++;
      const progress = easeOut(frame / totalFrames);
      const current  = progress * target;
      el.textContent = prefix + (target % 1 === 0
        ? Math.floor(current).toLocaleString()
        : current.toFixed(1)) + suffix;
      if (frame >= totalFrames) {
        clearInterval(timer);
        el.textContent = prefix + (target % 1 === 0
          ? target.toLocaleString()
          : target.toFixed(1)) + suffix;
      }
    }, 1000 / frameRate);
  }

  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  }

  /* ---------------------------------------------------------
     5. SCROLL-REVEAL for feature cards & sections
  --------------------------------------------------------- */
  const revealEls = document.querySelectorAll(
    '.feature-card, .pricing-card, .demo-feature, .testimonial-card, .faq-item, .contact-card'
  );

  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );
    revealEls.forEach((el) => {
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------
     6. DEMO PAGE — TAB SWITCHER
  --------------------------------------------------------- */
  const demoTabs = document.querySelectorAll('.demo-tab[data-tab]');
  const demoPanels = document.querySelectorAll('.demo-panel[data-panel]');

  if (demoTabs.length && demoPanels.length) {
    demoTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        demoTabs.forEach((t) => t.classList.remove('active'));
        demoPanels.forEach((p) => p.classList.remove('active'));

        tab.classList.add('active');
        const panel = document.querySelector(`.demo-panel[data-panel="${target}"]`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ---------------------------------------------------------
     7. PRICING PAGE — BILLING TOGGLE (monthly / annual)
  --------------------------------------------------------- */
  const billingToggle = document.getElementById('billingToggle');
  const priceMonthly  = document.querySelectorAll('.price-monthly');
  const priceAnnual   = document.querySelectorAll('.price-annual');
  const billingLabel  = document.getElementById('billingLabel');

  if (billingToggle) {
    const setMode = (annual) => {
      priceMonthly.forEach((el) => el.classList.toggle('hidden', annual));
      priceAnnual.forEach((el)  => el.classList.toggle('hidden', !annual));
      if (billingLabel) billingLabel.textContent = annual ? 'Billed annually (save 20%)' : 'Billed monthly';
      billingToggle.checked = annual;
    };

    billingToggle.addEventListener('change', () => setMode(billingToggle.checked));
    // Default: show monthly
    setMode(false);
  }

  /* ---------------------------------------------------------
     8. CONTACT FORM — CLIENT-SIDE VALIDATION & SUBMIT
  --------------------------------------------------------- */
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    const rules = {
      firstName : { required: true, minLen: 2, errorId: 'firstNameError', label: 'First name' },
      lastName  : { required: true, minLen: 2, errorId: 'lastNameError',  label: 'Last name'  },
      email     : { required: true, email: true, errorId: 'emailError',   label: 'Email'      },
      reason    : { required: true, errorId: 'reasonError', label: 'Reason' },
      message   : { required: true, minLen: 20, errorId: 'messageError',  label: 'Message'    },
      consent   : { required: true, checkbox: true, errorId: 'consentError', label: 'Consent' },
    };

    function validateField(name) {
      const rule  = rules[name];
      if (!rule)  return true;
      const el    = contactForm.elements[name];
      const errEl = document.getElementById(rule.errorId);
      if (!el || !errEl) return true;

      const value = rule.checkbox ? el.checked : el.value.trim();
      let msg = '';

      if (rule.required && (rule.checkbox ? !value : !value)) {
        msg = `${rule.label} is required.`;
      } else if (rule.minLen && value.length < rule.minLen) {
        msg = `${rule.label} must be at least ${rule.minLen} characters.`;
      } else if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        msg = 'Please enter a valid email address.';
      }

      errEl.textContent = msg;
      el.classList.toggle('input-error', !!msg);
      return !msg;
    }

    // Live validation on blur
    Object.keys(rules).forEach((name) => {
      const el = contactForm.elements[name];
      if (el) el.addEventListener('blur', () => validateField(name));
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate all fields
      const valid = Object.keys(rules).reduce((acc, name) => validateField(name) && acc, true);
      if (!valid) return;

      const submitBtn  = document.getElementById('submitBtn');
      const submitText = document.getElementById('submitText');
      const submitSpinner = document.getElementById('submitSpinner');
      const formSuccess = document.getElementById('formSuccess');
      const formErrorMsg = document.getElementById('formError');

      // Show loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Sending…';
      submitSpinner.classList.remove('hidden');
      formSuccess.classList.add('hidden');
      formErrorMsg.classList.add('hidden');

      try {
        // Collect form data
        const payload = {
          firstName : contactForm.elements.firstName.value.trim(),
          lastName  : contactForm.elements.lastName.value.trim(),
          email     : contactForm.elements.email.value.trim(),
          company   : contactForm.elements.company ? contactForm.elements.company.value.trim() : '',
          teamSize  : contactForm.elements.teamSize ? contactForm.elements.teamSize.value : '',
          reason    : contactForm.elements.reason.value,
          message   : contactForm.elements.message.value.trim(),
        };

        /*
         * Replace the URL below with your actual form endpoint
         * (e.g. Formspree, Netlify Forms, or your own API).
         * For now we simulate a network request.
         */
        const FORM_ENDPOINT = '/api/contact'; // TODO: replace with real endpoint

        let success = false;
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload),
          });
          success = res.ok;
        } catch (_) {
          // Network error — treat as success in demo mode (remove in production)
          success = true;
        }

        if (success) {
          contactForm.reset();
          formSuccess.classList.remove('hidden');
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          formErrorMsg.classList.remove('hidden');
        }
      } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Send Message';
        submitSpinner.classList.add('hidden');
      }
    });
  }

  /* ---------------------------------------------------------
     9. FAQ ACCORDION — close others when one opens
  --------------------------------------------------------- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ---------------------------------------------------------
     10. HERO TYPEWRITER EFFECT (optional, homepage only)
  --------------------------------------------------------- */
  const typeTarget = document.getElementById('heroTypewriter');
  if (typeTarget) {
    const phrases = [
      'Detect threats in real time.',
      'Automate SOC response.',
      'Map attack campaigns globally.',
      'Train your team with simulations.',
    ];
    let phraseIdx = 0;
    let charIdx   = 0;
    let deleting  = false;
    let paused    = false;

    function type() {
      if (paused) {
        paused = false;
        setTimeout(type, deleting ? 400 : 1200);
        return;
      }
      const phrase = phrases[phraseIdx];
      if (deleting) {
        charIdx--;
        typeTarget.textContent = phrase.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          paused = true;
        }
      } else {
        charIdx++;
        typeTarget.textContent = phrase.slice(0, charIdx);
        if (charIdx === phrase.length) {
          deleting = true;
          paused = true;
        }
      }
      setTimeout(type, deleting ? 45 : 80);
    }
    type();
  }

})();
