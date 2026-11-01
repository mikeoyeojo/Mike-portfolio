// Live preview inside the admin page: shows how your edits will look on the real site
// BEFORE you press Publish. It uses the same page-building code as the live site (/render.js)
// and the same stylesheet (/styles.css), so what you see here is what visitors will see.
(function(){
  window.__PREVIEW__ = true;
  const h = window.h || CMS.h;

  // Load the other content files once, so e.g. the colour preview can show your real page text
  const cache = {};
  ['settings', 'design', 'portfolio', 'clients', 'testimonials'].forEach(k => {
    fetch('/content/' + k + '.json?t=' + Date.now()).then(r => r.ok ? r.json() : null).then(j => { cache[k] = j; }).catch(() => {});
  });

  const plain = (v) => (v && typeof v.toJS === 'function') ? v.toJS() : v;

  // Swap saved image paths for the editor's version (so images you just uploaded show up before publishing)
  function withAssets(value, getAsset){
    if(typeof value === 'string'){
      if(/^\/?assets\//.test(value)){ try{ const a = getAsset(value); return a ? String(a) : value; }catch(e){ return value; } }
      return value;
    }
    if(Array.isArray(value)) return value.map(v => withAssets(v, getAsset));
    if(value && typeof value === 'object'){
      const out = {}; Object.keys(value).forEach(k => { out[k] = withAssets(value[k], getAsset); }); return out;
    }
    return value;
  }

  const html = (markup, design) => h('div', { className: 'pv', style: themeVars(design || cache.design), dangerouslySetInnerHTML: { __html: markup } });
  const label = (t) => `<p class="pv-label mono">${esc(t)}</p>`;
  const loading = () => html(label('Loading preview…'));

  /* ---- the home page sections, built from the text settings ---- */
  function homeHTML(s, design){
    s = s || {}; design = design || {};
    const showPhoto = s.show_hero_photo !== false;
    const photo = safeUrl(s.hero_photo) || '/assets/uploads/hero-cutout.webp';
    const logo = safeUrl(design.logo) || '/assets/uploads/logo.png';
    const nm = (s.full_name || '').trim();
    const stats = (s.stats || []).filter(x => x && (x.number || x.label));
    const words = (s.ticker_words || []).map(w => typeof w === 'string' ? w : (w && w.word)).filter(Boolean);
    const services = (s.services || []).filter(x => x && x.title);
    let seq = []; if(words.length){ while(seq.length < 6) seq = seq.concat(words); }
    return `
    <div class="pv-hero">
      <header class="nav" style="position:absolute"><div class="nav__pill">
        <nav class="nav__side"><a>${esc(s.nav_work_label || 'Work')}</a><a>${esc(s.nav_services_label || 'Services')}</a></nav>
        <span class="nav__logo"><img src="${esc(logo)}" alt="" height="38"></span>
        <nav class="nav__side nav__side--right"><a>${esc(s.nav_about_label || 'About')}</a><a>${esc(s.nav_contact_label || 'Contact')}</a></nav>
      </div></header>
      <section class="hero"><div class="hero__panel ${showPhoto ? '' : 'no-photo'}">
        <svg class="hero__burst" viewBox="0 0 100 100"><path d="M50 6V30M50 70V94M6 50H30M70 50H94M19 19L36 36M64 64L81 81M81 19L64 36M36 64L19 81" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>
        <p class="hero__label mono">${esc(s.hero_label)}</p>
        <h1 class="hero__title">${esc(s.hero_headline)}</h1>
        <div class="hero__row">
          <div class="hero__left"><p class="hero__hello">${esc(nm)}</p><p class="hero__intro">${esc(s.hero_intro)}</p></div>
          ${showPhoto ? `<figure class="hero__photo"><div class="hero__disc"></div><img src="${esc(photo)}" alt=""></figure>` : ''}
          <div class="hero__right"><span class="hero__stars">★★★★★</span><strong class="hero__badge-num">${esc(s.hero_badge_number)}</strong><span class="hero__badge-label">${esc(s.hero_badge_label)}</span></div>
        </div>
        <div class="hero__cta"><a class="btn btn--accent">${esc(s.hero_cta_primary)}</a><a class="btn btn--dark">${esc(s.hero_cta_secondary)}</a></div>
      </div></section>
    </div>
    ${stats.length ? `<section class="stats"><div class="stats__bar glass">${stats.map(x => `<div class="stat"><span class="stat__num">${esc(x.number)}</span><span class="stat__label">${esc(x.label)}</span></div>`).join('')}</div></section>` : ''}
    <section class="intro">
      <div class="intro__head"><h2 class="intro__title">${esc(s.intro_heading)}</h2><p class="intro__text">${esc(s.intro_text)}</p></div>
      <div class="intro__images">
        ${safeUrl(s.intro_image_wide) ? `<figure class="intro__wide"><img src="${esc(s.intro_image_wide)}" alt="">${s.intro_tag ? `<figcaption class="tag mono">${esc(s.intro_tag)}</figcaption>` : ''}</figure>` : ''}
        ${safeUrl(s.intro_image_tall) ? `<figure class="intro__tall"><img src="${esc(s.intro_image_tall)}" alt=""></figure>` : ''}
      </div>
    </section>
    ${seq.length ? `<section class="ticker"><div class="ticker__track" style="animation:none">${seq.map(w => `<span class="ticker__item"><span>${esc(w)}</span><i>✦</i></span>`).join('')}</div></section>` : ''}
    ${services.length ? `<section class="services"><div class="services__card">
      <div class="services__main"><h2 class="section-title">My <mark>Services</mark></h2><p class="services__intro">${esc(s.services_intro)}</p>
        <div class="svc-list">${services.map((x, i) => `<div class="svc ${i === 0 ? 'is-open' : ''}"><span class="svc__btn"><span class="svc__num">${String(i + 1).padStart(2, '0')}</span><span class="svc__title">${esc(x.title)}</span><span class="svc__arrow">→</span></span>${x.description ? `<p class="svc__desc">${esc(x.description)}</p>` : ''}</div>`).join('')}</div></div>
      ${safeUrl(s.services_image) ? `<figure class="services__img"><img src="${esc(s.services_image)}" alt=""></figure>` : ''}
      <div class="services__side">
        <div class="side-card glass"><p>${esc(s.services_note)}</p><span class="side-card__link">See how I work <span>↗</span></span></div>
        <div class="side-card side-card--accent"><p>${esc(s.services_cta_title)}</p><span class="side-card__link">${esc(s.services_cta_label)} <span>↗</span></span></div>
      </div></div></section>` : ''}
    <section class="contact ${showPhoto ? '' : 'no-photo'}">
      <div class="contact__text"><h2 class="contact__title">${esc(s.contact_heading)}</h2><p class="contact__lead">${esc(s.contact_lead)}</p>
        <span class="contact__email glass"><span>${esc(s.email)}</span><span class="contact__send">↗</span></span>
        <div class="contact__socials">${socialHTML(s, 'round')}</div></div>
      ${showPhoto ? `<figure class="contact__photo"><div class="contact__disc"></div><img src="${esc(photo)}" alt=""></figure>` : ''}
    </section>
    <footer class="footer" style="padding-top:60px"><div class="footer__card">
      <div class="footer__brand"><img class="footer__logo" src="${esc(logo)}" alt="" height="46"><p>${esc(s.footer_tagline)}</p></div>
      <div class="footer__col"><h3 class="mono">EXPLORE</h3><a>${esc(s.nav_work_label || 'Work')}</a><a>${esc(s.nav_services_label || 'Services')}</a><a>${esc(s.nav_about_label || 'About')}</a><a>${esc(s.nav_contact_label || 'Contact')}</a></div>
      <div class="footer__col"><h3 class="mono">CONNECT</h3><div class="footer__socials">${socialHTML(s, 'list')}</div><a>Email</a></div>
      <div class="footer__bottom mono"><span>${esc((s.site_name || '').toUpperCase())} © ${new Date().getFullYear()}</span><span>${esc(s.footer_note)}</span></div>
    </div></footer>`;
  }

  /* ---- Projects & case studies ---- */
  const ProjectsPreview = (props) => {
    const data = withAssets(plain(props.entry.get('data')) || {}, props.getAsset);
    const list = withSlugs(data.items);
    if(!list.length) return html(label('No projects yet'));
    return html(
      label('WORK GRID — how the cards look on your site') +
      `<div class="bento">${list.map(cardHTML).join('')}</div>` +
      label('CASE STUDIES — click a project to open its popup') +
      list.map((p, i) => `<details class="pv-cs"><summary>${esc(p.title || 'Untitled project')}</summary><div class="cs__panel pv-panel"><div class="cs__scroll">${caseStudyHTML(p, i, list)}</div></div></details>`).join('')
    );
  };

  /* ---- Text, sections & contact ---- */
  const SettingsPreview = (props) => {
    const s = withAssets(plain(props.entry.get('data')) || {}, props.getAsset);
    return html(homeHTML(s, cache.design || {}));
  };

  /* ---- Colours, logo & fonts ---- */
  const DesignPreview = (props) => {
    const d = withAssets(plain(props.entry.get('data')) || {}, props.getAsset);
    if(!cache.settings) return loading();
    const items = withSlugs(cache.portfolio && cache.portfolio.items).slice(0, 3);
    return html(
      label('COLOURS & LOGO — your home page with these settings') + homeHTML(cache.settings, d) +
      (items.length ? `<section class="work" style="padding-top:60px">${label('Project cards')}<div class="bento">${items.map(cardHTML).join('')}</div></section>` : ''),
      d
    );
  };

  const ClientsPreview = (props) => {
    const data = withAssets(plain(props.entry.get('data')) || {}, props.getAsset);
    const c = (data.clients || []).filter(x => safeUrl(x.logo));
    return html(label('TRUSTED BY — how client logos look') + (c.length ? `<div class="clients__row">${c.map(x => `<img src="${esc(x.logo)}" alt="${esc(x.name)}">`).join('')}</div>` : '<p class="empty-note mono">No client logos yet</p>'));
  };

  const TestimonialsPreview = (props) => {
    const data = plain(props.entry.get('data')) || {};
    const t = data.testimonials || [];
    return html(label('WHAT PEOPLE SAY — how testimonials look') + (t.length ? `<div class="testimonials">${t.map(x => `<blockquote class="testimonial"><p class="testimonial__quote">&ldquo;${esc(x.quote)}&rdquo;</p><footer class="testimonial__meta mono">${esc(x.name)}${x.role ? ' — ' + esc(x.role) : ''}</footer></blockquote>`).join('')}</div>` : '<p class="empty-note mono">No testimonials yet</p>'));
  };

  // Names match the file names in admin/config.yml
  CMS.registerPreviewTemplate('portfolio', ProjectsPreview);
  CMS.registerPreviewTemplate('general', SettingsPreview);
  CMS.registerPreviewTemplate('design', DesignPreview);
  CMS.registerPreviewTemplate('clients', ClientsPreview);
  CMS.registerPreviewTemplate('testimonials', TestimonialsPreview);

  CMS.registerPreviewStyle('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  CMS.registerPreviewStyle('/styles.css');
  CMS.registerPreviewStyle('/admin/preview.css');
})();
