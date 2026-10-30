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

function setText(id, value){
  const el = document.getElementById(id);
  if(el && value !== undefined && value !== null && value !== '') el.textContent = value;
}

/* ---------- colour helpers (derive soft tints from the colours chosen in the CMS) ---------- */
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
const toRGB = (h) => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = toRGB(a), B = toRGB(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

/* ---------- Design: colours, logo, fonts ---------- */
const FONT_URLS = {
  editorial: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap',
  studio:    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
};
let designState = null;

function applyDesign(design){
  if(!design) return;
  designState = design;
  const root = document.documentElement.style;

  if(isHex(design.color_background)) root.setProperty('--paper', design.color_background);
  if(isHex(design.color_ink)) root.setProperty('--ink', design.color_ink);
  if(isHex(design.color_brand)) root.setProperty('--brand', design.color_brand);
  if(isHex(design.color_accent)) root.setProperty('--amber', design.color_accent);
  if(isHex(design.color_line)){
    root.setProperty('--line', design.color_line);
    const [r, g, b] = toRGB(design.color_line);
    root.setProperty('--line-soft', `rgba(${r},${g},${b},0.35)`);
  }
  const paper = isHex(design.color_background) ? design.color_background : '#F8F3F8';
  const ink = isHex(design.color_ink) ? design.color_ink : '#2D002B';
  root.setProperty('--paper-2', mix(paper, ink, 0.1));
  const [pr, pg, pb] = toRGB(paper);
  root.setProperty('--paper-glass', `rgba(${pr},${pg},${pb},0.9)`);

  if(design.favicon && safeUrl(design.favicon)){
    document.getElementById('favicon-link').href = design.favicon;
  }

  const pairing = design.font_pairing || 'blueprint';
  document.body.classList.remove('font-blueprint', 'font-editorial', 'font-studio');
  document.body.classList.add('font-' + pairing);
  if(FONT_URLS[pairing] && !document.getElementById('font-extra')){
    const l = document.createElement('link');
    l.id = 'font-extra'; l.rel = 'stylesheet'; l.href = FONT_URLS[pairing];
    document.head.appendChild(l);
  }
}

// Logo image if one is set, otherwise a text mark made from the site name
function renderMark(design, settings){
  const mark = document.getElementById('site-mark');
  const logo = design && design.logo && safeUrl(design.logo);
  if(logo){
    mark.innerHTML = `<img src="${esc(logo)}" alt="${esc((settings && settings.site_name) || 'Logo')} logo" height="38">`;
  }else if(design){
    mark.textContent = (settings && settings.site_name) || 'M—CD';
  }
}

/* ---------- Text & contact ---------- */
function applySettings(settings){
  if(!settings) return;

  if(settings.site_name){
    document.getElementById('page-title').textContent =
      (settings.full_name ? settings.full_name + ' — ' : '') + settings.site_name;
    setText('footer-name', settings.site_name.toUpperCase());
  }
  setText('footer-note', settings.footer_note);
  setText('nav-work', settings.nav_work_label);
  setText('nav-about', settings.nav_about_label);
  setText('nav-contact', settings.nav_contact_label);
  setText('hero-label', settings.hero_label);

  if(settings.full_name){
    const parts = settings.full_name.trim().split(/\s+/);
    const last = parts.pop();
    document.getElementById('hero-name').innerHTML = (parts.length ? esc(parts.join(' ')) + '<br>' : '') + esc(last);
  }
  setText('hero-tagline', settings.tagline);
  setText('hero-about', settings.about);
  setText('about-lead', settings.about);

  // Front-page photo (hidden when none is set)
  const fig = document.getElementById('hero-photo');
  const photo = settings.hero_photo && safeUrl(settings.hero_photo);
  if(photo){
    document.getElementById('hero-photo-img').src = photo;
    fig.hidden = false;
    document.querySelector('.hero__frame').classList.remove('no-photo');
  }else{
    fig.hidden = true;
    document.querySelector('.hero__frame').classList.add('no-photo');
  }

  if(settings.email){
    const emailEl = document.getElementById('contact-email');
    emailEl.textContent = settings.email;
    emailEl.href = 'mailto:' + settings.email;
  }
  const wa = safeUrl(settings.whatsapp), li = safeUrl(settings.linkedin), be = safeUrl(settings.behance);
  const setLink = (id, url) => { const el = document.getElementById(id); if(url) el.href = url; else el.hidden = true; };
  setLink('whatsapp-link', wa); setLink('linkedin-link', li); setLink('behance-link', be);

  if(settings.stats && settings.stats.length){
    document.getElementById('about-stats').innerHTML = settings.stats.map(s => `
      <div class="stat">
        <span class="stat__num mono">${esc(s.number)}</span>
        <span class="stat__label">${esc(s.label)}</span>
      </div>`).join('');
  }
}

/* ---------- Clients & testimonials ---------- */
function applyClients(data){
  const section = document.getElementById('clients-section');
  const clients = ((data && data.clients) || []).filter(c => safeUrl(c.logo));
  if(!clients.length){ section.hidden = true; return; }
  document.getElementById('clients-row').innerHTML =
    clients.map(c => `<img src="${esc(safeUrl(c.logo))}" alt="${esc(c.name)}" title="${esc(c.name)}">`).join('');
  section.hidden = false;
}

function applyTestimonials(data){
  const section = document.getElementById('testimonials-section');
  const items = (data && data.testimonials) || [];
  if(!items.length){ section.hidden = true; return; }
  document.getElementById('testimonials-grid').innerHTML = items.map(t => `
    <blockquote class="testimonial reveal">
      <p class="testimonial__quote">&ldquo;${esc(t.quote)}&rdquo;</p>
      <footer class="testimonial__meta mono">${esc(t.name)}${t.role ? ' — ' + esc(t.role) : ''}</footer>
    </blockquote>`).join('');
  section.hidden = false;
  observeReveals();
}

/* ---------- Portfolio cards ---------- */
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

function cardHTML(p){
  const img = safeUrl(p.image);
  return `
    <a class="card reveal" href="#project-${esc(p.slug)}" aria-label="Open case study: ${esc(p.title)}">
      <div class="card__img-wrap">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</div>
      <div class="card__body">
        ${p.category ? `<span class="card__cat mono">${esc(p.category.toUpperCase())}</span>` : ''}
        <h3 class="card__title">${esc(p.title || 'Untitled project')}</h3>
        ${p.description ? `<p class="card__desc">${esc(p.description)}</p>` : ''}
        <span class="card__more">View case study →</span>
      </div>
    </a>`;
}

function renderPortfolio(){
  const grid = document.getElementById('portfolio-grid');
  const emptyNote = document.getElementById('empty-note');
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
  }, { threshold: 0.15 });
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
    case 'text': {
      const two = b.layout === 'two-columns';
      return `<div class="cb cb--text ${two ? 'two-columns' : ''}">${b.heading ? `<h3>${esc(b.heading)}</h3>` : ''}<div>${paragraphs(b.body)}</div></div>`;
    }
    case 'video': {
      const v = videoHTML(b.url); if(!v) return '';
      return `<figure class="cb cb--video">${v}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
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
  // If no case-study blocks were added, still show the cover image so the popup is never empty.
  const blocks = (p.blocks && p.blocks.length) ? p.blocks.map(blockHTML).join('')
    : (safeUrl(p.image) ? blockHTML({ type: 'image', image: p.image }) : '');
  return `
    <header class="csx-head">
      ${p.category ? `<span class="csx-cat mono">${esc(p.category.toUpperCase())}</span>` : ''}
      <h2 class="csx-title" id="cs-title">${esc(p.title)}</h2>
      ${meta.length ? `<dl class="csx-meta">${meta.map(m => `<div><dt>${m[0]}</dt><dd>${esc(m[1])}</dd></div>`).join('')}</dl>` : ''}
      <div class="csx-overview">${paragraphs(p.overview || p.description)}</div>
      ${link ? `<a class="btn btn--primary csx-visit" href="${esc(link)}" target="_blank" rel="noopener">Visit project ↗</a>` : ''}
    </header>
    <div class="csx-blocks">${blocks}</div>
    <footer class="csx-foot">
      ${others.length ? `<h4>More projects</h4><div class="csx-more">${others.map(o => `
        <a href="#project-${esc(o.slug)}">${safeUrl(o.image) ? `<img src="${esc(safeUrl(o.image))}" alt="" loading="lazy">` : ''}${esc(o.title)}</a>`).join('')}</div>` : ''}
      <div class="csx-cta">
        <p>Have a project like this in mind?</p>
        <a class="btn" href="#contact" data-go-contact>Let's talk</a>
      </div>
    </footer>`;
}

/* ---------- Popup behaviour ---------- */
const cs = document.getElementById('cs');
const csPanel = document.getElementById('cs-panel');
const csScroll = document.getElementById('cs-scroll');
let currentIndex = -1, lastFocus = null;

const isOpen = () => !cs.hidden;
const hashSlug = () => { const m = location.hash.match(/^#project-(.+)$/); return m ? decodeURIComponent(m[1]) : null; };

function showProject(slug){
  const index = projects.findIndex(p => p.slug === slug);
  if(index < 0){ hideModal(); return; }
  const wasOpen = isOpen();
  currentIndex = index;
  csScroll.innerHTML = caseStudyHTML(projects[index], index);
  csScroll.scrollTop = 0;
  document.getElementById('cs-prev').hidden = document.getElementById('cs-next').hidden = projects.length < 2;
  document.title = projects[index].title + ' — ' + (document.getElementById('page-title').dataset.base || document.title);
  if(!wasOpen){
    lastFocus = document.activeElement;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sbw > 0 ? sbw + 'px' : '';
    document.body.classList.add('cs-open');
    document.querySelectorAll('header.topbar, main, footer.footer').forEach(el => el.inert = true);
    cs.hidden = false;
  }
  csPanel.focus({ preventScroll: true });
}

function hideModal(){
  if(!isOpen()) return;
  cs.hidden = true;
  currentIndex = -1;
  document.body.classList.remove('cs-open');
  document.body.style.paddingRight = '';
  document.querySelectorAll('header.topbar, main, footer.footer').forEach(el => el.inert = false);
  document.title = document.getElementById('page-title').dataset.base || document.title;
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

cs.addEventListener('click', (e) => {
  if(e.target.closest('[data-close]')) { closeModal(); return; }
  if(e.target.closest('[data-go-contact]')) { closeModal(); } // then the link scrolls to #contact
});
document.getElementById('cs-prev').addEventListener('click', () => step(-1));
document.getElementById('cs-next').addEventListener('click', () => step(1));
window.addEventListener('hashchange', syncFromHash);

document.addEventListener('keydown', (e) => {
  if(!isOpen()) return;
  if(e.key === 'Escape'){ e.preventDefault(); closeModal(); return; }
  if(e.key === 'Tab'){
    const f = [...cs.querySelectorAll('a[href], button, video[controls], iframe, [tabindex="0"]')]
      .filter(el => !el.hidden && el.offsetParent !== null);
    if(!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if(e.shiftKey && (document.activeElement === first || document.activeElement === csPanel)){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
});

/* ---------- init ---------- */
(async function init(){
  const titleEl = document.getElementById('page-title');
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
