// Everything on the page comes from /content/*.json, which you edit in /admin.
// No build step: the browser reads the latest published JSON on every visit.

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- helpers ---------- */
async function loadJSON(path){
  try{
    const res = await fetch(path + '?t=' + Date.now()); // cache-bust so edits show immediately
    if(!res.ok) return null;
    return await res.json();
  }catch(e){
    console.warn('Could not load', path, e);
    return null;
  }
}

const $ = (id) => document.getElementById(id);
function setText(id, value){
  const el = $(id);
  if(el && value !== undefined && value !== null && value !== '') el.textContent = value;
}

/* ---------- colour helpers (soft tints are derived from the colours chosen in the CMS) ---------- */
/* ---------- Design: colours, logo, fonts ---------- */
const FONT_URLS = {
  editorial: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap',
  studio:    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
};

function applyDesign(design){
  if(!design) return;
  const vars = themeVars(design);
  Object.keys(vars).forEach(k => document.documentElement.style.setProperty(k, vars[k]));
  const theme = document.querySelector('meta[name="theme-color"]');
  if(theme) theme.setAttribute('content', vars['--bg']);

  if(design.favicon && safeUrl(design.favicon)) $('favicon-link').href = design.favicon;

  const pairing = design.font_pairing || 'blueprint';
  document.body.classList.remove('font-blueprint', 'font-editorial', 'font-studio');
  document.body.classList.add('font-' + pairing);
  if(FONT_URLS[pairing] && !$('font-extra')){
    const l = document.createElement('link');
    l.id = 'font-extra'; l.rel = 'stylesheet'; l.href = FONT_URLS[pairing];
    document.head.appendChild(l);
  }
}

// Logo image if one is set, otherwise a text mark made from the site name
function renderMark(design, settings){
  const name = (settings && settings.site_name) || 'M—CD';
  const logo = design && design.logo && safeUrl(design.logo);
  if(logo){
    $('site-mark').innerHTML = `<img src="${esc(logo)}" alt="${esc(name)} logo" height="38">`;
    $('footer-logo').src = logo; $('footer-logo').hidden = false;
  }else if(design && 'logo' in design){
    $('site-mark').textContent = name;
    $('footer-logo').hidden = true;
  }
}

/* ---------- Text, sections & contact ---------- */
function applySettings(s){
  if(!s) return;

  if(s.site_name){
    $('page-title').textContent = (s.full_name ? s.full_name + ' — ' : '') + s.site_name;
    setText('footer-name', s.site_name.toUpperCase());
  }
  setText('footer-note', s.footer_note);
  setText('footer-tagline', s.footer_tagline);

  [['work','nav_work_label'], ['services','nav_services_label'], ['about','nav_about_label'], ['contact','nav_contact_label']]
    .forEach(([key, field]) => { if(s[field]) document.querySelectorAll(`[data-nav="${key}"]`).forEach(a => a.textContent = s[field]); });

  // Hero
  setText('hero-label', s.hero_label);
  setText('hero-headline', s.hero_headline);
  setText('hero-name', s.full_name);
  setText('hero-intro', s.hero_intro || s.about);
  setText('hero-badge-num', s.hero_badge_number);
  setText('hero-badge-label', s.hero_badge_label);
  setText('hero-cta-1', s.hero_cta_primary);
  setText('hero-cta-2', s.hero_cta_secondary);

  // Portrait: shown by default; a CMS switch hides it and a CMS image replaces it
  const photo = s.hero_photo && safeUrl(s.hero_photo);
  if(photo){ $('hero-photo-img').src = photo; $('contact-photo').src = photo; }
  const showPhoto = s.show_hero_photo !== false;
  $('hero-photo').hidden = !showPhoto;
  document.querySelector('.hero__panel').classList.toggle('no-photo', !showPhoto);
  document.querySelector('.contact__photo').hidden = !showPhoto;
  document.querySelector('.contact').classList.toggle('no-photo', !showPhoto);

  // Stats
  const stats = (s.stats || []).filter(x => x && (x.number || x.label));
  $('stats-bar').innerHTML = stats.map(x => `
    <div class="stat"><span class="stat__num" data-count>${esc(x.number)}</span><span class="stat__label"><span class="lbl-full">${esc(x.label)}</span><span class="lbl-short">${esc(x.short_label || x.label)}</span></span></div>`).join('');
  document.querySelector('.stats').hidden = !stats.length;

  // Intro
  setText('intro-heading', s.intro_heading);
  $('intro-text').textContent = s.intro_text || s.about || '';
  setText('intro-tag', s.intro_tag);
  const wide = safeUrl(s.intro_image_wide), tall = safeUrl(s.intro_image_tall);
  if(wide) $('intro-wide').src = wide;
  if(tall) $('intro-tall').src = tall;
  $('intro-wide-wrap').hidden = !wide; $('intro-tall-wrap').hidden = !tall;
  if(!wide || !tall) document.querySelector('.intro__images').style.gridTemplateColumns = '1fr';
  if(!wide && !tall) document.querySelector('.intro__images').hidden = true;
  setText('work-sub', s.work_sub);

  // Ticker
  const words = (s.ticker_words || []).map(w => typeof w === 'string' ? w : (w && w.word)).filter(Boolean);
  const tickerEl = document.querySelector('.ticker');
  if(words.length){
    let seq = []; while(seq.length < 8) seq = seq.concat(words);
    const half = seq.map(w => `<span class="ticker__item"><span>${esc(w)}</span><i>✦</i></span>`).join('');
    $('ticker-track').innerHTML = half + half;
    tickerEl.hidden = false;
  }else tickerEl.hidden = true;

  // Services
  const services = (s.services || []).filter(x => x && x.title);
  const svcSection = $('services');
  svcSection.hidden = !services.length;
  setText('services-intro', s.services_intro);
  $('svc-list').innerHTML = services.map((x, i) => `
    <div class="svc ${i === 0 ? 'is-open' : ''}">
      <button class="svc__btn" type="button" aria-expanded="${i === 0}">
        <span class="svc__num">${String(i + 1).padStart(2, '0')}</span><span class="svc__title">${esc(x.title)}</span><span class="svc__arrow" aria-hidden="true">→</span>
      </button>
      ${x.description ? `<p class="svc__desc">${esc(x.description)}</p>` : ''}
    </div>`).join('');
  const sImg = safeUrl(s.services_image);
  if(sImg) $('services-img').src = sImg;
  document.querySelector('.services__img').hidden = !sImg;
  if(!sImg) document.querySelector('.services__card').style.gridTemplateColumns = '1.4fr .8fr';
  if(s.services_note) $('services-note').textContent = s.services_note;
  setText('services-cta-title', s.services_cta_title);
  if(s.services_cta_label) $('services-cta-label').innerHTML = esc(s.services_cta_label) + ' <span aria-hidden="true">↗</span>';

  // Contact + links
  setText('contact-heading', s.contact_heading);
  setText('contact-lead', s.contact_lead);
  if(s.email){
    $('contact-email-text').textContent = s.email;
    $('contact-email').href = 'mailto:' + s.email;
    $('footer-email').href = 'mailto:' + s.email;
  }
  // Social icons (WhatsApp, Instagram, LinkedIn, Behance): any link left blank in the admin is simply not shown
  $('contact-socials').innerHTML = socialHTML(s, 'round');
  $('footer-socials').innerHTML = socialHTML(s, 'list');
}

$('hero-photo-img').addEventListener('error', () => {
  $('hero-photo').hidden = true;
  document.querySelector('.hero__panel').classList.add('no-photo');
});

// Services accordion
$('svc-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.svc__btn'); if(!btn) return;
  const item = btn.parentElement, open = !item.classList.contains('is-open');
  document.querySelectorAll('.svc').forEach(el => { el.classList.remove('is-open'); el.querySelector('.svc__btn').setAttribute('aria-expanded', 'false'); });
  if(open){ item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
});

// Mobile menu
const navToggle = $('nav-toggle'), navMenu = $('nav-menu');
function setMenu(open){
  navMenu.hidden = !open;
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
navToggle.addEventListener('click', () => setMenu(navMenu.hidden));
navMenu.addEventListener('click', (e) => { if(e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && !navMenu.hidden) setMenu(false); });

/* ---------- Clients & testimonials ---------- */
function applyClients(data){
  const section = $('clients-section');
  const clients = ((data && data.clients) || []).filter(c => safeUrl(c.logo));
  if(!clients.length){ section.hidden = true; return; }
  $('clients-row').innerHTML = clients.map(c => `<img src="${esc(safeUrl(c.logo))}" alt="${esc(c.name)}" title="${esc(c.name)}">`).join('');
  section.hidden = false;
}

function applyTestimonials(data){
  const section = $('testimonials-section');
  const items = (data && data.testimonials) || [];
  if(!items.length){ section.hidden = true; return; }
  $('testimonials-grid').innerHTML = items.map(t => `
    <blockquote class="testimonial reveal">
      <p class="testimonial__quote">&ldquo;${esc(t.quote)}&rdquo;</p>
      <footer class="testimonial__meta mono">${esc(t.name)}${t.role ? ' — ' + esc(t.role) : ''}</footer>
    </blockquote>`).join('');
  section.hidden = false;
  observeReveals();
}

/* ---------- Portfolio (glass bento grid) ---------- */
let projects = [];

function prepareProjects(data){
  projects = withSlugs(data && data.items);
}

function renderPortfolio(){
  const grid = $('portfolio-grid'), emptyNote = $('empty-note');
  if(!projects.length){ emptyNote.hidden = false; return; }
  grid.innerHTML = projects.map((p, i) => cardHTML(p, i)).join('');
  observeReveals();
}

const REDUCED = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Numbers in the stats bar count up when they scroll into view ("250+" -> 0 ... 250+)
function countUp(scope){
  scope.querySelectorAll('.stat__num[data-count]:not([data-counted])').forEach(el => {
    el.setAttribute('data-counted', '1');
    const m = el.textContent.trim().match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
    if(!m || REDUCED() || !window.requestAnimationFrame) return;
    const [, pre, num, post] = m, end = parseFloat(num), dec = (num.split('.')[1] || '').length, dur = 1500, t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = pre + (end * e).toFixed(dec) + post;
      if(k < 1) requestAnimationFrame(tick); else el.textContent = pre + num + post;
    };
    el.textContent = pre + (0).toFixed(dec) + post;
    requestAnimationFrame(tick);
  });
}

// Fades things in as they scroll into view. "root" is the scrolling box (the popup) or null for the page.
function observeReveals(scope, root){
  scope = scope || document;
  const els = scope.querySelectorAll('.reveal:not(.is-observed), .split:not(.is-observed)');
  els.forEach(el => el.classList.add('is-observed'));
  const show = (el) => { el.classList.add('is-visible'); countUp(el); };
  if(!('IntersectionObserver' in window)){ els.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){ show(entry.target); io.unobserve(entry.target); }
    });
  }, { root: root || null, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(el => io.observe(el));
}

// Headline words rise into place one after the other
function splitWords(el, baseMs){
  if(!el || el.classList.contains('split')) return;
  const text = el.textContent.trim(); if(!text) return;
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
  el.classList.add('split');
  el.style.setProperty('--base', (baseMs || 0) + 'ms');
}

// Which page elements fade/slide in, and from where
function setupReveals(){
  const list = [
    ['.work__head .section-title'], ['.work__sub', 'up', 120],
    ['.intro__text', 'up', 150], ['#intro-wide-wrap', 'left'], ['#intro-tall-wrap', 'right', 160],
    ['.stats__bar', 'zoom'],
    ['.services .section-title'], ['.services__intro', 'up', 100], ['.svc', 'up', 90], ['.services__img', 'zoom', 120], ['.side-card', 'up', 160],
    ['.clients__label'], ['.clients__row img', 'up', 70], ['.testimonials-wrap .section-title'],
    ['.contact__lead', 'up', 120], ['.contact__email', 'up', 240], ['.contact__socials .social', 'zoom', 80], ['.contact__photo', 'right', 150],
    ['.footer__card', 'up']
  ];
  list.forEach(([sel, dir, step]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      if(el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      if(dir && dir !== 'up') el.setAttribute('data-reveal', dir);
      if(step) el.style.setProperty('--d', (i * step) + (sel === '.contact__socials .social' ? 360 : 0));
    });
  });
}

// One light scroll handler: progress bar, menu state and (desktop only) a gentle photo drift.
// It only touches the few elements it needs, so scrolling stays smooth on phones.
function setupScrollEffects(){
  const nav = $('nav'), bar = $('progress');
  const photo = document.querySelector('.hero__photo img');
  const drift = !!(window.matchMedia && window.matchMedia('(min-width: 861px) and (pointer: fine)').matches) && !REDUCED();
  let ticking = false, scrolled = false, active = null;
  const setActive = (k) => {
    if(k === active) return;
    active = k;
    document.querySelectorAll('.nav [data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === k));
  };
  const update = () => {
    ticking = false;
    const y = window.scrollY || 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(4) + ')';
    const s = y > 24;
    if(s !== scrolled){ scrolled = s; nav.classList.toggle('is-scrolled', s); }
    if(y < 300) setActive('');
    if(drift && y < 1000 && photo) photo.style.translate = '0 ' + (-y * 0.04).toFixed(1) + 'px';
  };
  window.addEventListener('scroll', () => { if(!ticking){ ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  // Highlight the menu link of the section you are in (no per-frame measuring)
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if(en.isIntersecting && (window.scrollY || 0) >= 300) setActive(en.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['work', 'services', 'about', 'contact'].forEach(k => { const el = $(k); if(el) io.observe(el); });
  }
  update();
}

// Project cards tilt toward the mouse and carry a moving highlight
function setupTilt(){
  const grid = $('portfolio-grid');
  grid.addEventListener('pointermove', (e) => {
    if(e.pointerType !== 'mouse' || REDUCED()) return;
    const card = e.target.closest('.pcard'); if(!card) return;
    const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  });
  grid.addEventListener('pointerout', (e) => {
    const card = e.target.closest('.pcard');
    if(card && !card.contains(e.relatedTarget)){ card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
  });
}

/* ---------- Case study blocks ---------- */
/* ---------- Popup behaviour ---------- */
const cs = $('cs'), csPanel = $('cs-panel'), csScroll = $('cs-scroll');
let currentIndex = -1, lastFocus = null;
const INERT_SELECTOR = 'header.nav, main, footer.footer';

let closeTimer = null;
const isOpen = () => !cs.hidden && !cs.classList.contains('is-closing');
const hashSlug = () => { const m = location.hash.match(/^#project-(.+)$/); return m ? decodeURIComponent(m[1]) : null; };

function showProject(slug){
  const index = projects.findIndex(p => p.slug === slug);
  if(index < 0){ hideModal(); return; }
  if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; cs.classList.remove('is-closing'); }  // re-opened while still closing
  const wasOpen = isOpen();
  closeLb();
  currentIndex = index;
  csScroll.innerHTML = caseStudyHTML(projects[index], index, projects);
  csScroll.scrollTop = 0;
  csScroll.classList.remove('swap'); void csScroll.offsetWidth; csScroll.classList.add('swap');
  $('cs-prev').hidden = $('cs-next').hidden = projects.length < 2;
  document.title = projects[index].title + ' — ' + ($('page-title').dataset.base || document.title);
  if(!wasOpen){
    lastFocus = document.activeElement;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sbw > 0 ? sbw + 'px' : '';
    document.body.classList.add('cs-open');
    document.querySelectorAll(INERT_SELECTOR).forEach(el => el.inert = true);
    cs.hidden = false;
  }
  csPanel.focus({ preventScroll: true });
  observeReveals(csScroll, csScroll);   // images and text fade in as you scroll through the case study
}

function hideModal(){
  if(!isOpen()) return;
  closeLb();
  currentIndex = -1;
  document.body.classList.remove('cs-open');
  document.body.style.paddingRight = '';
  document.querySelectorAll(INERT_SELECTOR).forEach(el => el.inert = false);
  document.title = $('page-title').dataset.base || document.title;
  if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  if(REDUCED()){ cs.hidden = true; return; }
  cs.classList.add('is-closing');                       // smooth fade-out, then hide
  closeTimer = setTimeout(() => { cs.hidden = true; cs.classList.remove('is-closing'); closeTimer = null; }, 240);
}

function closeModal(){
  if(hashSlug() !== null) history.replaceState(null, '', location.pathname + location.search);
  hideModal();
}

function step(dir){
  if(currentIndex < 0 || projects.length < 2) return;
  const next = projects[(currentIndex + dir + projects.length) % projects.length];
  history.replaceState(null, '', '#project-' + next.slug);
  showProject(next.slug);
}

function syncFromHash(){
  const slug = hashSlug();
  if(slug) showProject(slug); else hideModal();
}

/* ---------- Image viewer (click any image in a case study) ---------- */
const lb = $('lb');
let lbImgs = [], lbIndex = 0;
const lbOpen = () => !lb.hidden;

function showLb(i){
  lbIndex = (i + lbImgs.length) % lbImgs.length;
  const el = lbImgs[lbIndex];
  const lbEl = $('lb-img'); lbEl.classList.remove('swap'); void lbEl.offsetWidth; lbEl.classList.add('swap');
  $('lb-img').src = el.currentSrc || el.src;
  $('lb-img').alt = el.alt || '';
  const cap = el.closest('figure') && el.closest('figure').querySelector('figcaption');
  $('lb-count').textContent = (lbIndex + 1) + ' / ' + lbImgs.length + (cap && cap.textContent ? ' — ' + cap.textContent : '');
  $('lb-prev').hidden = $('lb-next').hidden = lbImgs.length < 2;
}
function openLb(el){
  lbImgs = [...csScroll.querySelectorAll('.csx-blocks img')];
  const i = lbImgs.indexOf(el); if(i < 0) return;
  showLb(i);
  lb.hidden = false;
  cs.classList.add('lb-open');
  lb.querySelector('.lb__close').focus({ preventScroll: true });
}
function closeLb(){
  if(!lbOpen()) return;
  lb.hidden = true;
  cs.classList.remove('lb-open');
  $('lb-img').removeAttribute('src');
  csPanel.focus({ preventScroll: true });
}

csScroll.addEventListener('click', (e) => {
  const img = e.target.closest('.csx-blocks img');
  if(img) openLb(img);
});
lb.addEventListener('click', (e) => { if(e.target.closest('[data-lb-close]')) closeLb(); });
$('lb-prev').addEventListener('click', () => showLb(lbIndex - 1));
$('lb-next').addEventListener('click', () => showLb(lbIndex + 1));

cs.addEventListener('click', (e) => {
  if(e.target.closest('[data-close]')) { closeModal(); return; }
  if(e.target.closest('[data-go-contact]')) { closeModal(); } // then the link scrolls to #contact
});
$('cs-prev').addEventListener('click', () => step(-1));
$('cs-next').addEventListener('click', () => step(1));
window.addEventListener('hashchange', syncFromHash);

document.addEventListener('keydown', (e) => {
  if(!isOpen()) return;
  if(e.key === 'Escape'){ e.preventDefault(); if(lbOpen()) closeLb(); else closeModal(); return; }
  if(lbOpen() && e.key === 'ArrowLeft'){ showLb(lbIndex - 1); return; }
  if(lbOpen() && e.key === 'ArrowRight'){ showLb(lbIndex + 1); return; }
  if(e.key === 'Tab'){
    const root = lbOpen() ? lb : cs;
    const f = [...root.querySelectorAll('a[href], button, video[controls], iframe, [tabindex="0"]')]
      .filter(el => !el.hidden && el.offsetParent !== null);
    if(!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if(e.shiftKey && (document.activeElement === first || document.activeElement === csPanel)){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
});

/* ---------- init ---------- */
(async function init(){
  const titleEl = $('page-title');
  const [portfolio, settings, design, clients, testimonials] = await Promise.all([
    loadJSON('content/portfolio.json'),
    loadJSON('content/settings.json'),
    loadJSON('content/design.json'),
    loadJSON('content/clients.json'),
    loadJSON('content/testimonials.json')
  ]);
  applyDesign(design);
  applySettings(settings);
  renderMark(design, settings);
  titleEl.dataset.base = titleEl.textContent;
  prepareProjects(portfolio);
  renderPortfolio();
  applyClients(clients);
  applyTestimonials(testimonials);
  splitWords($('hero-headline'), 380);
  splitWords($('intro-heading'), 0);
  splitWords($('contact-heading'), 0);
  setupReveals();
  observeReveals();
  setupScrollEffects();
  setupTilt();
  syncFromHash(); // open a case study straight from a shared link
})();
