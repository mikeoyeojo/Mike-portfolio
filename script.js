// Fetch portfolio + settings data (edited via /admin) and render them.
// Both files live in /content/ and are updated by the CMS as flat JSON —
// no build step needed, the browser just reads the latest committed version.

document.getElementById('year').textContent = new Date().getFullYear();

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

function renderSettings(settings){
  if(!settings) return;
  if(settings.tagline) document.getElementById('hero-tagline').textContent = settings.tagline;
  if(settings.about){
    document.getElementById('hero-about').textContent = settings.about;
    document.getElementById('about-lead').textContent = settings.about;
  }
  if(settings.email){
    const emailEl = document.getElementById('contact-email');
    emailEl.textContent = settings.email;
    emailEl.href = 'mailto:' + settings.email;
  }
  if(settings.linkedin) document.getElementById('linkedin-link').href = settings.linkedin;
  if(settings.behance) document.getElementById('behance-link').href = settings.behance;
}

function cardHTML(item){
  const img = item.image ? `<img src="${item.image}" alt="${item.title || ''}" loading="lazy">` : '';
  const linkHTML = item.link
    ? `<a class="card__link" href="${item.link}" target="_blank" rel="noopener">View project →</a>`
    : '';
  return `
    <article class="card reveal">
      <div class="card__img-wrap">${img}</div>
      <div class="card__body">
        ${item.category ? `<span class="card__cat mono">${item.category.toUpperCase()}</span>` : ''}
        <h3 class="card__title">${item.title || 'Untitled project'}</h3>
        ${item.description ? `<p class="card__desc">${item.description}</p>` : ''}
        ${linkHTML}
      </div>
    </article>`;
}

function renderPortfolio(data){
  const grid = document.getElementById('portfolio-grid');
  const emptyNote = document.getElementById('empty-note');
  const items = (data && data.items) || [];
  if(items.length === 0){
    emptyNote.hidden = false;
    return;
  }
  grid.innerHTML = items.map(cardHTML).join('');
  observeReveals();
}

function observeReveals(){
  const els = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

(async function init(){
  const [portfolio, settings] = await Promise.all([
    loadJSON('content/portfolio.json'),
    loadJSON('content/settings.json')
  ]);
  renderPortfolio(portfolio);
  renderSettings(settings);
})();
