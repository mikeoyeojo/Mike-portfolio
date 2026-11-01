// Shared page-building code: used by the live site (script.js) and the admin preview (admin/preview.js).
// Pure functions: they turn CMS data into HTML and never touch the page directly.

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Only allow http(s) links and site-relative paths (blocks javascript: etc.)
function safeUrl(u){
  u = String(u || '').trim();
  // In the admin preview, freshly uploaded (not yet published) images are blob:/data: URLs
  if(typeof window !== 'undefined' && window.__PREVIEW__ && /^(blob:|data:image\/(png|jpe?g|webp|gif|svg\+xml|avif);)/i.test(u)) return u;
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


const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
const toRGB = (h) => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = toRGB(a), B = toRGB(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };


const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

// Gives every project a unique link name (slug) from its title
function withSlugs(items){
  const seen = {};
  return (items || []).map(p => {
    let slug = slugify(p.title);
    seen[slug] = (seen[slug] || 0) + 1;
    if(seen[slug] > 1) slug += '-' + seen[slug];
    return Object.assign({}, p, { slug });
  });
}

// Colours chosen in the CMS -> the CSS variables the page uses (shared by the live site and the admin preview)
function themeVars(design){
  design = design || {};
  const get = (k, d) => isHex(design[k]) ? design[k] : d;
  const bg = get('color_background', '#1B0019'), panel = get('color_panel', '#F7F2F8');
  const ink = get('color_ink', '#2D002B'), brand = get('color_brand', '#5B0057'), accent = get('color_accent', '#FFCE00');
  return {
    '--bg': bg, '--panel': panel, '--ink': ink, '--brand': brand, '--accent': accent,
    '--surface': mix(bg, '#ffffff', 0.07), '--surface-2': mix(bg, '#ffffff', 0.13), '--disc': mix(panel, brand, 0.12)
  };
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

function cardHTML(p, i){
  const img = safeUrl(p.image);
  const size = ['wide', 'tall', 'large'].includes(p.card_size) ? p.card_size : 'normal';
  const count = countText(p);
  return `
    <a class="pcard pcard--${size} reveal" style="--d:${((i || 0) % 3) * 110}" href="#project-${esc(p.slug)}" aria-label="Open case study: ${esc(p.title)}">
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

function caseStudyHTML(p, index, projects){
  const meta = [['Client', p.client], ['Year', p.year], ['Role', p.role], ['Tools', p.tools]].filter(m => m[1]);
  const link = safeUrl(p.link);
  const others = projects.filter((_, i) => i !== index).slice(0, 6);
  const c = mediaCount(p);
  // If no case-study blocks were added, still show the cover image so the popup is never empty.
  const blocks = (p.blocks && p.blocks.length) ? p.blocks.map(blockHTML).filter(Boolean).map(x => `<div class="reveal">${x}</div>`).join('')
    : (safeUrl(p.image) ? `<div class="reveal">${blockHTML({ type: 'image', image: p.image })}</div>` : '');
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


/* ---------- Social links (icons + the links you set in the admin) ---------- */
// Brand icons from the open Simple Icons set (CC0), drawn on a 24x24 canvas
const SOCIAL_ICONS = {"whatsapp": "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z", "instagram": "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077", "linkedin": "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z", "behance": "M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z"};

// Turn whatever was typed in the admin into a proper link
function socialUrl(kind, value){
  let v = String(value || '').trim();
  if(!v) return '';
  if(kind === 'whatsapp' && /^\+?[\d\s().-]{7,}$/.test(v)) return 'https://wa.me/' + v.replace(/\D/g, '');   // a plain phone number works too
  if(kind === 'instagram' && !/^https?:\/\//i.test(v) && !/instagram\.com/i.test(v)) return 'https://instagram.com/' + v.replace(/^@/, '').replace(/\/+$/, '');
  if(!/^https?:\/\//i.test(v) && /^[\w.-]+\.[a-z]{2,}\//i.test(v)) v = 'https://' + v;           // "behance.net/you" -> https://behance.net/you
  return safeUrl(v);
}

function socialItems(s){
  s = s || {};
  return [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['behance', 'Behance']]
    .map(([key, label]) => ({ key, label, url: socialUrl(key, s[key]) }))
    .filter(x => x.url);
}

const socialIcon = (key) => `<svg class="social__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${SOCIAL_ICONS[key]}"/></svg>`;

// style "round": circular icon buttons. style "list": icon + name, one per line.
function socialHTML(s, style){
  const items = socialItems(s);
  if(!items.length) return '';
  return items.map((x, i) => `<a class="social social--${style}" style="--i:${i}" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="${esc(x.label)}" title="${esc(x.label)}">${socialIcon(x.key)}${style === 'list' ? `<span>${esc(x.label)}</span>` : ''}</a>`).join('');
}
