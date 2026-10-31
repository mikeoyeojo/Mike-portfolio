// Everything on the page comes from /content/*.json, which you edit in /admin.
// No build step: the browser reads the latest published JSON on every visit.

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- helpers ---------- */
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Only allow http(s) links and site-relative paths (blocks javascript: etc.)
function safeUrl(u){
  u = String(u || '').trim();
  if(/^https?:\/\//i.test(u) || /^\/(?!\/)/.test(u) || /^assets\//i.test(u)) return u;
  return '';
}

// Blank line = new paragraph, single line break = <br>
function paragraphs(text){
  return String(text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
    .map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
}

function slugify(s){
  return String(s || 'project').toLowerCase().replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';
}

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
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

/* ---------- colour helpers (soft tints are derived from the colours chosen in the CMS) ---------- */
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
const toRGB = (h) => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = toRGB(a), B = toRGB(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

/* ---------- Design: colours, logo, fonts ---------- */
const FONT_URLS = {
  editorial: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap',
  studio:    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
};

function applyDesign(design){
  if(!design) return;
  const root = document.documentElement.style;
  const get = (k, d) => isHex(design[k]) ? design[k] : d;
  const bg = get('color_background', '#1B0019'), panel = get('color_panel', '#F7F2F8');
  const ink = get('color_ink', '#2D002B'), brand = get('color_brand', '#5B0057'), accent = get('color_accent', '#FFCE00');

  root.setProperty('--bg', bg);
  root.setProperty('--panel', panel);
  root.setProperty('--ink', ink);
  root.setProperty('--brand', brand);
  root.setProperty('--accent', accent);
  root.setProperty('--surface', mix(bg, '#ffffff', 0.07));
  root.setProperty('--surface-2', mix(bg, '#ffffff', 0.13));
  root.setProperty('--disc', mix(panel, brand, 0.12));
  const theme = document.querySelector('meta[name="theme-color"]');
  if(theme) theme.setAttribute('content', bg);

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
    <div class="stat"><span class="stat__num">${esc(x.number)}</span><span class="stat__label">${esc(x.label)}</span></div>`).join('');
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
  const setLink = (id, url) => { const el = $(id); if(url) el.href = url; else el.hidden = true; };
  setLink('whatsapp-link', safeUrl(s.whatsapp));
  setLink('linkedin-link', safeUrl(s.linkedin));
  setLink('behance-link', safeUrl(s.behance));
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
  const seen = {};
  projects = ((data && data.items) || []).map(p => {
    let slug = slugify(p.title);
    seen[slug] = (seen[slug] || 0) + 1;
    if(seen[slug] > 1) slug += '-' + seen[slug];
    return Object.assign({}, p, { slug });
  });
}

// How many images / videos a case study holds (shown on the card and in the popup)
function mediaCount(p){
  let images = 0, videos = 0;
  (p.blocks || []).forEach(b => {
    if(!b) return;
    if(b.type === 'image' && safeUrl(b.image)) images++;
    else if((b.type === 'grid' || b.type === 'gallery')) images += (b.images || []).filter(safeUrl).length;
    else if(b.type === 'video' && videoHTML(b.url)) videos++;
    else if(b.type === 'videos') videos += (b.items || []).filter(v => v && videoHTML(v.url)).length;
  });
  if(!(p.blocks || []).length && safeUrl(p.image)) images = 1;
  return { images, videos };
}

function countText(p){
  const c = mediaCount(p), parts = [];
  if(c.images) parts.push(plural(c.images, 'image'));
  if(c.videos) parts.push(plural(c.videos, 'video'));
  return parts.join(' · ');
}

function cardHTML(p){
  const img = safeUrl(p.image);
  const size = ['wide', 'tall', 'large'].includes(p.card_size) ? p.card_size : 'normal';
  const count = countText(p);
  return `
    <a class="pcard pcard--${size} reveal" href="#project-${esc(p.slug)}" aria-label="Open case study: ${esc(p.title)}">
      ${img ? `<img class="pcard__img" src="${esc(img)}" alt="" loading="lazy">` : ''}
      <div class="pcard__glass">
        <div>
          ${p.category ? `<span class="pcard__cat mono">${esc(p.category.toUpperCase())}</span>` : ''}
          <h3 class="pcard__title">${esc(p.title || 'Untitled project')}</h3>
          ${count ? `<span class="pcard__count">${esc(count)}</span>` : ''}
        </div>
        <span class="pcard__go" aria-hidden="true">↗</span>
      </div>
    </a>`;
}

function renderPortfolio(){
  const grid = $('portfolio-grid'), emptyNote = $('empty-note');
  if(!projects.length){ emptyNote.hidden = false; return; }
  grid.innerHTML = projects.map(cardHTML).join('');
  observeReveals();
}

function observeReveals(){
  const els = document.querySelectorAll('.reveal:not(.is-observed)');
  els.forEach(el => el.classList.add('is-observed'));
  if(!('IntersectionObserver' in window)){ els.forEach(el => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){ entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

/* ---------- Case study blocks ---------- */
function videoHTML(url){
  url = safeUrl(url);
  if(!url) return '';
  let m;
  if((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i))){
    return `<div class="ratio"><iframe src="https://www.youtube-nocookie.com/embed/${esc(m[1])}" title="Video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  if((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i))){
    return `<div class="ratio"><iframe src="https://player.vimeo.com/video/${esc(m[1])}" title="Video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  if(/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)){
    return `<div class="ratio"><video src="${esc(url)}" controls playsinline preload="metadata"></video></div>`;
  }
  return '';
}

function blockHTML(b){
  switch(b && b.type){
    case 'image': {
      const src = safeUrl(b.image); if(!src) return '';
      return `<figure class="cb cb--image"><img src="${esc(src)}" alt="${esc(b.caption || '')}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'grid': {
      const imgs = (b.images || []).map(safeUrl).filter(Boolean); if(!imgs.length) return '';
      const cols = b.columns === '3' ? 3 : 2;
      return `<div class="cb cb--grid cols-${cols}">${imgs.map(s => `<img src="${esc(s)}" alt="" loading="lazy">`).join('')}</div>`;
    }
    case 'gallery': {
      const imgs = (b.images || []).map(safeUrl).filter(Boolean); if(!imgs.length) return '';
      const cols = ['2', '3', '4'].includes(String(b.columns)) ? b.columns : '3';
      return `<div class="cb cb--gallery cols-${cols}">${imgs.map(s => `<img src="${esc(s)}" alt="" loading="lazy">`).join('')}</div>`;
    }
    case 'text': {
      const two = b.layout === 'two-columns';
      return `<div class="cb cb--text ${two ? 'two-columns' : ''}">${b.heading ? `<h3>${esc(b.heading)}</h3>` : ''}<div>${paragraphs(b.body)}</div></div>`;
    }
    case 'video': {
      const v = videoHTML(b.url); if(!v) return '';
      return `<figure class="cb cb--video">${v}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'videos': {
      const items = (b.items || []).map(v => ({ html: videoHTML(v && v.url), caption: v && v.caption })).filter(v => v.html);
      if(!items.length) return '';
      return `<div class="cb cb--videos-grid ${items.length === 1 ? 'single' : ''}">${items.map(v => `<figure>${v.html}${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`;
    }
    case 'quote':
      return `<figure class="cb cb--quote"><blockquote>&ldquo;${esc(b.quote)}&rdquo;</blockquote>${b.author ? `<cite>${esc(b.author)}</cite>` : ''}</figure>`;
    case 'spacer':
      return `<div class="cb cb--spacer ${['small','medium','large'].includes(b.size) ? b.size : 'medium'}" aria-hidden="true"></div>`;
    default: return '';
  }
}

function caseStudyHTML(p, index){
  const meta = [['Client', p.client], ['Year', p.year], ['Role', p.role], ['Tools', p.tools]].filter(m => m[1]);
  const link = safeUrl(p.link);
  const others = projects.filter((_, i) => i !== index).slice(0, 6);
  const c = mediaCount(p);
  // If no case-study blocks were added, still show the cover image so the popup is never empty.
  const blocks = (p.blocks && p.blocks.length) ? p.blocks.map(blockHTML).join('')
    : (safeUrl(p.image) ? blockHTML({ type: 'image', image: p.image }) : '');
  return `
    <header class="csx-head">
      ${p.category ? `<span class="csx-cat mono">${esc(p.category.toUpperCase())}</span>` : ''}
      <h2 class="csx-title" id="cs-title">${esc(p.title)}</h2>
      ${meta.length ? `<dl class="csx-meta">${meta.map(m => `<div><dt>${m[0]}</dt><dd>${esc(m[1])}</dd></div>`).join('')}</dl>` : ''}
      <div class="csx-overview">${paragraphs(p.overview || p.description)}</div>
      ${(c.images || c.videos) ? `<div class="csx-stats">${c.images ? `<span>${plural(c.images, 'image')}</span>` : ''}${c.videos ? `<span>${plural(c.videos, 'video')}</span>` : ''}</div>` : ''}
      ${link ? `<a class="btn btn--accent csx-visit" href="${esc(link)}" target="_blank" rel="noopener">Visit project ↗</a>` : ''}
    </header>
    <div class="csx-blocks">${blocks}</div>
    <footer class="csx-foot">
      ${others.length ? `<h4>More projects</h4><div class="csx-more">${others.map(o => `
        <a href="#project-${esc(o.slug)}">${safeUrl(o.image) ? `<img src="${esc(safeUrl(o.image))}" alt="" loading="lazy">` : ''}${esc(o.title)}</a>`).join('')}</div>` : ''}
      <div class="csx-cta">
        <p>Have a project like this in mind?</p>
        <a class="btn btn--dark" href="#contact" data-go-contact>Let's talk</a>
      </div>
    </footer>`;
}

/* ---------- Popup behaviour ---------- */
const cs = $('cs'), csPanel = $('cs-panel'), csScroll = $('cs-scroll');
let currentIndex = -1, lastFocus = null;
const INERT_SELECTOR = 'header.nav, main, footer.footer';

const isOpen = () => !cs.hidden;
const hashSlug = () => { const m = location.hash.match(/^#project-(.+)$/); return m ? decodeURIComponent(m[1]) : null; };

function showProject(slug){
  const index = projects.findIndex(p => p.slug === slug);
  if(index < 0){ hideModal(); return; }
  const wasOpen = isOpen();
  closeLb();
  currentIndex = index;
  csScroll.innerHTML = caseStudyHTML(projects[index], index);
  csScroll.scrollTop = 0;
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
}

function hideModal(){
  if(!isOpen()) return;
  closeLb();
  cs.hidden = true;
  currentIndex = -1;
  document.body.classList.remove('cs-open');
  document.body.style.paddingRight = '';
  document.querySelectorAll(INERT_SELECTOR).forEach(el => el.inert = false);
  document.title = $('page-title').dataset.base || document.title;
  if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
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
  syncFromHash(); // open a case study straight from a shared link
})();
