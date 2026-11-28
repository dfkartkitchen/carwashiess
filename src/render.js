// Car Washiess – vykreslení stránky z bloků (content/page.json) a nastavení webu (content/site.json).
// Stejný kód používá sestavení (build.js) i živý náhled v administraci (admin/admin.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DFKRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const list = (a) => (Array.isArray(a) ? a : []);

  // dočasná adresa webu na Netlify, po připojení domény změnit (viz README)
  const SITE_URL = 'https://carwashiess.netlify.app';

  // Text z administrace: buď prostý řetězec, nebo {text, color, font, size, bold, italic, underline}.
  // Nevyplněný vzhled = podle designu webu.
  const FONTS = {
    archivo: ['"Archivo",system-ui,sans-serif'],
    grotesk: ["'Space Grotesk','Helvetica Neue',Arial,sans-serif", 'grotesk'],
    inter: ["'Inter',system-ui,sans-serif", 'inter'],
    playfair: ["'Playfair Display',Georgia,serif", 'playfair'],
    cormorant: ["'Cormorant Garamond',Georgia,serif", 'cormorant'],
    lora: ["'Lora',Georgia,serif", 'lora'],
    montserrat: ["'Montserrat',system-ui,sans-serif", 'montserrat'],
    poppins: ["'Poppins',system-ui,sans-serif", 'poppins'],
    greatvibes: ["'Great Vibes',cursive", 'greatvibes'],
    dancing: ["'Dancing Script',cursive", 'dancing'],
  };
  const plain = (v) => (v && typeof v === 'object' ? String(v.text ?? '') : String(v ?? ''));
  // česká typografie: nezlomitelná mezera za jednopísmennými slovy (v, k, s, z, o, u, a, i),
  // mezi číslem a jednotkou, v tisících (1 399), za zkratkami (č., čl., odst.) a před pomlčkou
  const NB = '\u00A0';
  function typo(t) {
    let s = String(t ?? '');
    for (let k = 0; k < 2; k++) s = s.replace(/(^|[\s„“"(\[\u00A0])([kvszouaiKVSZOUAI])[ \t]+(?=\S)/g, '$1$2' + NB);
    return s
      .replace(/(\d)[ \t](?=\d{3}(?!\d))/g, '$1' + NB)
      .replace(/(\d)[ \t]+(?=(Kč|%|min|km|dní|let|měsíc|Sb\.)(?![\p{L}]))/gu, '$1' + NB)
      .replace(/(\d×)[ \t]+/g, '$1' + NB)
      .replace(/(^|[\s(])(č|čl|odst|písm|tel|např|tj|resp)\.[ \t]+(?=\S)/g, '$1$2.' + NB)
      .replace(/[ \t]+([–—])[ \t]/g, NB + '$1 ');
  }
  const ty = (v) => esc(typo(plain(v)));
  function look(v) {
    if (!v || typeof v !== 'object') return '';
    const css = [];
    if (v.color) css.push('color:' + v.color);
    if (FONTS[v.font]) css.push('font-family:' + FONTS[v.font][0]);
    if (+v.size > 0 && +v.size !== 1) css.push('font-size:' + (+v.size) + 'em');
    if (v.bold) css.push('font-weight:700');
    if (v.italic) css.push('font-style:italic');
    if (v.underline) css.push('text-decoration:underline;text-underline-offset:.15em');
    return css.join(';');
  }
  // vnitřní <cms-t>, aby se ho netýkala pravidla webu pro span/b
  const wrap = (v, inner) => { const css = look(v); return css ? `<cms-t style="${esc(css)}">${inner}</cms-t>` : inner; };
  const tx = (v) => wrap(v, ty(v).replace(/\n/g, '<br>'));
  const has = (v) => plain(v).trim() !== '';

  // časování kapitol úvodu: podíl délky videa (0–1), začátek a konec každé kapitoly
  const CHAPTER_TIMES = [[0.04, 0.22], [0.26, 0.61], [0.64, 0.80]];

  const ICONS = ['drops', 'spark', 'shield', 'clock', 'pin', 'check'];
  const icon = (name, cls) => `<svg class="${cls}" aria-hidden="true"><use href="#i-${ICONS.includes(name) ? name : 'check'}"/></svg>`;
  const arr = '<svg class="ic" aria-hidden="true"><use href="#i-arr"/></svg>';

  // barva pozadí bloku: void = vlastní černé pozadí s obrazem, dark = černé, light = světlé
  const THEME = { hero: 'void', services_video: 'void', people: 'void', compare: 'light', features: 'light', membership: 'dark', booking: 'dark', contact: 'dark' };
  const theme = (b) => THEME[b.type] || (b.theme === 'dark' ? 'dark' : 'light');
  const idAttr = (b, fallback) => (b.anchor || fallback ? ` id="${esc(b.anchor || fallback)}"` : '');
  // provozovatelé (jeden nebo víc podnikatelů pod značkou): „Jan Novák, IČO 123, a Petr Svoboda, IČO 456“
  const operators = (site) => {
    const ops = list(site.operators).filter((o) => plain(o.name));
    const one = (o) => `${plain(o.name)}${plain(o.ico) ? `, IČO ${plain(o.ico)}` : ''}`;
    return ops.length > 1 ? ops.slice(0, -1).map(one).join('; ') + ` a ${one(ops[ops.length - 1])}` : ops.map(one).join('');
  };
  const eyebrow = (v) => (has(v) ? `<div class="eyebrow">${tx(v)}</div>` : '');

  const R = {};

  R.hero = (b) => {
    const ch = list(b.chapters).slice(0, CHAPTER_TIMES.length);
    const chapters = ch.map((c, i) => `
    <div class="chapter c${i + 1}" data-from="${CHAPTER_TIMES[i][0]}" data-to="${CHAPTER_TIMES[i][1]}"><div class="n">${i + 1} ze ${ch.length}</div><h2>${tx(c.title)}</h2>${has(c.text) ? `<p>${tx(c.text)}</p>` : ''}</div>`).join('');
    const rail = ch.map((c) => `
      <li>${esc(plain(c.rail) || plain(c.title))}<i><b></b></i></li>`).join('');
    const meta = [b.meta_left, b.meta_right].filter(has).map(tx).join(' <i></i> ');
    return `<section class="hero"${idAttr(b, 'uvod')} aria-label="Úvod">
  <div class="stage" id="stage">
    <img class="poster" src="${esc(b.poster)}" alt="${esc(b.poster_alt)}" fetchpriority="high">
    <canvas id="seq" data-src="${esc(b.frames)}" data-count="${+b.frame_count || 181}" data-keys="${esc(b.frame_keys || '0,39,59,89,129,180')}" aria-hidden="true"></canvas>
    <div class="shade"></div>
    <div class="dim" id="dim"></div>

    <div class="intro" id="intro">
      <h1>${tx(b.headline)}</h1>
      ${has(b.intro) ? `<p>${tx(b.intro)}</p>` : ''}${has(b.intro_sub) ? `\n      <p class="sub">${tx(b.intro_sub)}</p>` : ''}
      ${has(b.scroll_hint) ? `<span class="scrollhint"><span></span>${tx(b.scroll_hint)}</span>` : ''}
    </div>
${chapters}

    <ol class="rail" id="rail" aria-hidden="true">${rail}
    </ol>

    <div class="veil" id="veil"></div>
    <div class="finale" id="finale">
      <h2>${tx(b.finale_title)}${has(b.finale_gold) ? ` <span class="gold">${tx(b.finale_gold)}</span>` : ''}</h2>
      ${has(b.finale_text) ? `<p>${tx(b.finale_text)}</p>` : ''}
      <div class="actions">${has(b.cta_primary) ? `
        <a class="btn" href="${esc(b.cta_primary_link || '#kontakt')}">${tx(b.cta_primary)} ${arr}</a>` : ''}${has(b.cta_secondary) ? `
        <a class="btn ghost" href="${esc(b.cta_secondary_link || '#sluzby')}">${tx(b.cta_secondary)}</a>` : ''}
      </div>
      ${meta ? `<p class="meta">${meta}</p>` : ''}
    </div>
  </div>
</section>`;
  };

  R.services_video = (b) => `<section class="svc-scroll"${idAttr(b)} data-js>
  <div class="svc-stage">
    <video class="svc-bg" muted loop playsinline preload="none"${b.poster ? ` poster="${esc(b.poster)}"` : ''}
      data-desktop="${esc(b.video)}" data-mobile="${esc(b.video_mobile)}" aria-hidden="true" tabindex="-1"></video>
    <div class="svc-shade"></div>
    <div class="svc-inner">
      <header class="svc-head">
        <div>
          ${eyebrow(b.eyebrow)}
          <h2 class="title">${tx(b.title)}</h2>
        </div>
        ${has(b.lead) ? `<p class="lede">${tx(b.lead)}</p>` : ''}
      </header>
      <div class="services">${list(b.services).map((s) => `
        <article class="svc">${s.image ? `<img class="svc-img" src="${esc(s.image)}" alt="${esc(s.image_alt)}" width="960" height="543" loading="lazy" decoding="async">` : ''}${icon(s.icon, 'svc-ic')}<h3>${tx(s.title)}</h3>${has(s.text) ? `<p>${tx(s.text)}</p>` : ''}</article>`).join('')}
      </div>
    </div>
  </div>
</section>`;

  R.compare = (b, ctx) => `<section class="block light compare"${idAttr(b)}${ctx.pad} aria-label="${esc(plain(b.ours_title))} a ${esc(plain(b.theirs_title))}">
  <div class="wrap cmp">
    <div class="cmp-col cmp-cw">
      <h3 class="cmp-h">${tx(b.ours_title)}</h3>
      <ul>${list(b.ours).map((x) => `
        <li>${icon('check', 'ic')}<span>${tx(x.text)}</span></li>`).join('')}
      </ul>
    </div>
    <div class="cmp-col cmp-vap">
      <h3 class="cmp-h">${tx(b.theirs_title)}</h3>
      <ul>${list(b.theirs).map((x) => `
        <li><svg class="ic" aria-hidden="true"><use href="#i-minus"/></svg><span>${tx(x.text)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>`;

  // vybraný tarif členství (výchozí): použije ho i souhrn v poptávce
  const plans = (b) => list(b && b.plans).filter((p) => +p.count > 0);
  const chosen = (b) => { const ps = plans(b); return ps.find((p) => +p.count === +b.default_plan) || ps[0]; };
  const planLabel = (b, p) => `${plain(b.plan_name) ? plain(b.plan_name) + ' · ' : ''}${+p.count}×${NB}měsíčně`;

  R.membership = (b, ctx) => {
    const ps = plans(b), cur = chosen(b) || {};
    return `<section class="block member"${idAttr(b)}${ctx.pad} data-js>
  <div class="wrap">
    <div class="sec-intro">
      <div>
        ${eyebrow(b.eyebrow)}
        <h2 class="title">${tx(b.title)}</h2>
      </div>
      ${has(b.lead) ? `<p class="lede">${tx(b.lead)}</p>` : ''}
    </div>
    <div class="m-grid">
      <div>
        <div class="m-q" id="freq-label">${tx(b.question)}</div>
        <div class="freq" role="group" aria-labelledby="freq-label" data-plan="${esc(plain(b.plan_name))}" data-per="${esc(plain(b.per_month))}">${ps.map((p) => `
          <button type="button" data-n="${+p.count}" data-price="${ty(p.price)}" data-note="${ty(p.note)}" data-desc="${ty(p.description)}" aria-pressed="${p === cur}"><b>${+p.count}×</b><small>${ty(p.price + ' Kč')}</small></button>`).join('')}
        </div>
        <div class="m-chosen">
          ${eyebrow(b.chosen_label)}
          <h3 id="rhythm-title">${+cur.count || ''}×${NB}měsíčně</h3>
          <p id="rhythm-desc">${ty(cur.description)}</p>
        </div>
      </div>
      <div class="price-card" aria-live="polite">
        <div class="price-card__top"><span>${tx(b.card_left)}</span><span>${tx(b.card_right)}</span></div>
        <div class="price"><strong id="price">${ty(cur.price)}</strong><em>Kč</em><small>${ty(b.per_month)}</small></div>
        <div class="price-note" id="price-note">${ty(cur.note)}</div>
        <ul class="checks">${list(b.checks).map((c) => `
          <li>${icon('check', 'ic')}${tx(c.text)}</li>`).join('')}
        </ul>
        ${has(b.button) ? `<a class="btn btn--block" href="${esc(b.button_link || '#kontakt')}">${tx(b.button)} ${arr}</a>` : ''}
      </div>
    </div>
    ${has(b.foot) || ctx.site.vat_note ? `<p class="m-foot">${[has(b.foot) ? tx(b.foot) : '', ctx.site.vat_note ? ty(ctx.site.vat_note) : ''].filter(Boolean).join(' ')}</p>` : ''}
  </div>
</section>`;
  };

  // rezervace termínu: kalendář Reservio (iframe) se načte až po kliknutí, do té doby žádná cizí doména
  R.booking = (b, ctx) => {
    const url = String(b.booking_url || '').trim(), ok = /^https:\/\/[^\s"<>]+$/.test(url);
    return `<section class="block booking"${idAttr(b)}${ctx.pad}>
  <div class="wrap">
    <div class="sec-intro">
      <div>
        ${eyebrow(b.eyebrow)}
        <h2 class="title">${tx(b.title)}</h2>
      </div>
      ${has(b.lead) ? `<p class="lede">${tx(b.lead)}</p>` : ''}
    </div>
    <div class="book-panel" data-src="${ok ? esc(url) : ''}">
      <div class="book-cover">
        <svg class="book-ic" aria-hidden="true"><use href="#i-clock"/></svg>
        <button class="btn book-open" type="button"${ok ? '' : ' disabled'}>${tx(b.button)} ${arr}</button>
        <p class="book-note">${ok ? `${tx(b.note)} ` : esc(url)}</p>
      </div>
    </div>
    ${ok ? `<p class="book-alt"><a href="${esc(url)}" target="_blank" rel="noopener">${tx(b.link_text)} ${arr}</a></p>` : ''}
  </div>
</section>`;
  };

  R.features = (b, ctx) => `<section class="block light why"${idAttr(b)}${ctx.pad}>
  <div class="wrap">
    ${eyebrow(b.eyebrow)}
    <h2 class="title">${tx(b.title)}</h2>
    <div class="why-grid">${list(b.items).map((it) => `
      <div>${icon(it.icon, 'why-ic')}<h3>${tx(it.title)}</h3>${has(it.text) ? `<p>${tx(it.text)}</p>` : ''}</div>`).join('')}
    </div>
  </div>
</section>`;

  R.people = (b) => `<section class="people-wrap"${idAttr(b)}>
  <div class="people">
    ${b.image ? `<img class="people__img" src="${esc(b.image)}"${b.image_large ? ` srcset="${esc(b.image)} 1200w, ${esc(b.image_large)} 2400w" sizes="(max-width:860px) 100vw, 1276px"` : ''} alt="${esc(b.image_alt)}" width="2400" height="1350" loading="lazy" decoding="async">` : ''}
    <div class="people__txt">
      ${eyebrow(b.eyebrow)}
      <h2 class="title">${tx(b.title)}</h2>
      ${has(b.text) ? `<p>${tx(b.text)}</p>` : ''}
    </div>
  </div>
</section>`;

  R.contact = (b, ctx) => {
    const site = ctx.site;
    const tel = String(site.phone || '').replace(/[^\d+]/g, '');
    const m = ctx.blocks.find((x) => x.type === 'membership'), p = m && chosen(m);
    const per = m ? plain(m.per_month) : '';
    return `<section class="block"${idAttr(b)}${ctx.pad}>
  <div class="wrap">
    <div class="form-panel">
      <div>
        ${eyebrow(b.eyebrow)}
        <h2 class="title">${tx(b.title)}</h2>${p ? `
        <div class="chosen">
          ${eyebrow(b.chosen_label)}
          <h3 id="sum-title">${esc(planLabel(m, p))}</h3>
          <p id="sum-price">${ty(p.price + ' Kč ' + per)}</p>
          ${has(b.edit_link) ? `<a class="edit-link" href="#${esc(m.anchor || '')}">${tx(b.edit_link)} ${arr}</a>` : ''}
        </div>` : ''}
        <dl class="facts">${site.phone ? `
          <div><dt>Telefon</dt><dd><a href="tel:${esc(tel)}">${esc(site.phone)}</a></dd></div>` : ''}${site.email ? `
          <div><dt>E-mail</dt><dd><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></dd></div>` : ''}
        </dl>
      </div>
      <form name="poptavka" method="POST" data-netlify="true" netlify-honeypot="web" novalidate data-ok="${esc(plain(b.success))}" data-err="${esc(plain(b.error))}">
        <input type="hidden" name="form-name" value="poptavka">
        <p class="hp"><label>Nevyplňujte <input name="web" tabindex="-1" autocomplete="off"></label></p>
        <label>Jméno<input name="jmeno" type="text" placeholder="Vaše jméno" autocomplete="name" required></label>
        <label>Telefon<input name="telefon" type="tel" placeholder="+420" autocomplete="tel" required></label>
        <label>Zpráva <small>volitelné</small><textarea name="zprava" placeholder="${esc(plain(b.message_placeholder) || 'Co bychom měli vědět o vašem autě?')}"></textarea></label>
        <input type="hidden" name="clenstvi" id="plan-field" value="${p ? esc(planLabel(m, p) + ' – ' + p.price + ' Kč ' + per) : ''}">
        <button class="btn btn--block" type="submit">${tx(b.button)} ${arr}</button>
        <p class="form-msg" role="status"></p>
        <p class="form-note">${has(b.form_note) ? tx(b.form_note) + ' ' : ''}Více v <a href="/ochrana-udaju/">Zásadách ochrany osobních údajů</a>.</p>
      </form>
    </div>
  </div>
</section>`;
  };

  // --- obecné bloky ---
  const cls = (b) => `block x-${b.type}${theme(b) === 'dark' ? ' dark' : ' light'}`;
  const head = (b) => (has(b.title) || has(b.lead) ? `
    <div class="head">${has(b.title) ? `
      <h2 class="title">${tx(b.title)}</h2>` : ''}${has(b.lead) ? `
      <p class="lede">${tx(b.lead)}</p>` : ''}
    </div>` : '');

  R.text_image = (b, ctx) => {
    const paras = plain(b.text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => `<p>${wrap(b.text, esc(typo(p)).replace(/\n/g, '<br>'))}</p>`).join('\n        ');
    const btn = has(b.button) ? `\n        <a class="btn" href="${esc(b.button_link || '#kontakt')}">${tx(b.button)} ${arr}</a>` : '';
    const img = b.image ? `\n      <figure><img src="${esc(b.image)}" alt="${esc(b.image_alt)}" loading="lazy"></figure>` : '';
    return `<section class="${cls(b)}${b.image_side === 'left' ? ' img-left' : ''}${b.image ? '' : ' no-img'}"${idAttr(b)}${ctx.pad}>
  <div class="wrap ti">
      <div class="ti-text">${has(b.title) ? `
        <h2 class="title">${tx(b.title)}</h2>` : ''}
        ${paras}${btn}
      </div>${img}
  </div>
</section>`;
  };

  R.gallery = (b, ctx) => `<section class="${cls(b)}"${idAttr(b)}${ctx.pad}>
  <div class="wrap">${head(b)}
    <div class="gal">${list(b.images).filter((g) => g.image).map((g) => `
      <figure><img src="${esc(g.image)}" alt="${esc(g.alt)}" loading="lazy">${has(g.caption) ? `<figcaption>${tx(g.caption)}</figcaption>` : ''}</figure>`).join('')}
    </div>
  </div>
</section>`;

  R.testimonials = (b, ctx) => `<section class="${cls(b)}"${idAttr(b)}${ctx.pad}>
  <div class="wrap">${head(b)}
    <div class="refs">${list(b.items).map((r) => `
      <figure class="ref">
        <blockquote>${tx(r.quote)}</blockquote>
        <figcaption>${r.photo ? `<img src="${esc(r.photo)}" alt="" loading="lazy">` : ''}<span><strong>${tx(r.name)}</strong>${has(r.role) ? `<span>${tx(r.role)}</span>` : ''}</span></figcaption>
      </figure>`).join('')}
    </div>
  </div>
</section>`;

  function renderFooter(site) {
    const social = [['Instagram', site.instagram], ['Facebook', site.facebook]].filter(([, u]) => u)
      .map(([n, u]) => `\n    <a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join('');
    return `<footer>
  <div class="legal-info">
    <span>© ${new Date().getFullYear()} ${esc(site.brand || 'Car Washiess')} · ${list(site.operators).filter((o) => plain(o.name)).length > 1 ? 'provozují' : 'provozuje'} ${ty(operators(site))}, ${ty(site.legal_address)}</span>${site.register_note || site.vat_note ? `
    <span>${ty([site.register_note, site.vat_note].filter(Boolean).join(' '))}</span>` : ''}
  </div>
  <nav aria-label="Právní informace">
    <a href="/ochrana-udaju/">Ochrana osobních údajů</a>
    <a href="/ochrana-udaju/#cookies">Cookies</a>${social}
  </nav>
</footer>`;
  }

  // vstup na web: zlatý ticket (jen na úvodní stránce)
  function renderLoader(site) {
    return `<div class="loader" id="loader" role="dialog" aria-label="Vstup na web">
  <button class="ticket" id="ticket" type="button" aria-label="Vstoupit na web ${esc(site.brand || 'Car Washiess')}"><span class="face front"><img src="${esc(site.ticket || '/img/ticket-2.webp')}" alt="" fetchpriority="high" decoding="sync"></span><span class="face back"></span></button>
  <button class="tap" type="button" tabindex="-1" aria-hidden="true"><span class="dot"></span><span class="t">${esc(site.ticket_tap || 'Ťukněte na ticket')}</span><span class="m">${esc(site.ticket_click || 'Klikněte na ticket')}</span></button>
</div>
<script>document.documentElement.classList.add('loading')</script>`;
  }

  // písma, která nejsou na webu načtená vždy (jen když je někdo v administraci vybere)
  function fontLinks(data) {
    const used = new Set();
    const walk = (o) => { if (o && typeof o === 'object') { if (typeof o.font === 'string') used.add(o.font); Object.values(o).forEach(walk); } };
    walk(data);
    return [...used].filter((f) => FONTS[f] && FONTS[f][1])
      .map((f) => `<link href="/fonts/${FONTS[f][1]}.css" rel="stylesheet">`).join('\n');
  }

  // opts.preview: každá sekce dostane data-block (živý náhled podle ní posouvá stránku)
  // opts.loader === false: bez vstupního ticketu (podstránky)
  function renderPage(template, page, site, opts = {}) {
    const blocks = list(page.blocks).filter((b) => R[b.type]);
    let main = '', prev = null;
    const sections = [];
    blocks.forEach((b, i) => {
      const th = theme(b);
      const pad = prev && th !== 'void' && prev === th ? ' style="padding-top:40px"' : '';
      let html = R[b.type](b, { i, pad, site, blocks });
      if (opts.preview) html = html.replace(/^<section /, `<section data-block="${i}" `);
      sections.push(html);
      main += (main ? '\n\n' : '') + html;
      prev = th;
    });

    const nav = blocks.filter((b) => has(b.menu) && b.anchor).map((b) => `
    <a href="#${esc(b.anchor)}">${esc(plain(b.menu))}</a>`).join('');
    const navcta = has(site.nav_cta) ? `<a class="btn" href="${esc(site.nav_cta_link || '#kontakt')}">${esc(plain(site.nav_cta))}</a>` : '';

    const parts = { blocks: main, nav, navcta, footer: renderFooter(site), loader: opts.loader === false ? '' : renderLoader(site) };
    let html = template;
    for (const [k, v] of Object.entries(parts)) html = html.replace(`<!--@${k}-->`, () => v);
    html = html
      .replace('{{seo_title}}', () => esc(site.seo_title))
      .replace('{{seo_description}}', () => esc(site.seo_description));
    const fonts = fontLinks(page);
    if (fonts) html = html.replace('</head>', () => fonts + '\n</head>');
    // opts.parts: i jednotlivé sekce zvlášť (živý náhled podle nich mění jen to, co se změnilo)
    return opts.parts ? { html, main, sections } : html;
  }

  // stránka Ochrana osobních údajů a cookies (content/legal.json); {email}, {phone}… se doplní z Kontaktů
  function richText(s, site) {
    const fill = (t) => t.replace(/\{(operators|legal_address|email|phone)\}/g, (m, k) => (k === 'operators' ? operators(site) : site[k] || ''));
    const inline = (t) => esc(typo(fill(t)))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+\w/g, (m) => `<a href="mailto:${m}">${m}</a>`)
      .replace(/(^|\s)(www\.[\w-]+\.[\w./-]+\w)/g, (m, a, u) => `${a}<a href="https://${u}" target="_blank" rel="noopener">${u}</a>`);
    return String(s || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
      const lines = p.split('\n');
      if (lines.every((l) => /^- /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('\n        ');
  }

  function renderLegal(template, page, site, legal, opts = {}) {
    const r = renderPage(template, page, site, { ...opts, parts: true, loader: false });
    const body = `<section class="block light legal" aria-labelledby="legal-h">
  <div class="wrap">
    <h1 id="legal-h">${esc(legal.title)}</h1>
    ${legal.valid_from ? `<p class="legal-date">Platné od ${esc(legal.valid_from)}</p>` : ''}
    ${legal.intro ? `<p class="legal-intro">${ty(legal.intro)}</p>` : ''}
    <nav class="legal-toc" aria-label="Obsah stránky"><ol>${list(legal.sections).map((x) => `<li><a href="#${esc(x.anchor)}">${esc(x.title)}</a></li>`).join('')}</ol></nav>${list(legal.sections).map((x) => `
    <section id="${esc(x.anchor)}">
      <h2>${esc(x.title)}</h2>
        ${richText(x.body, site)}
    </section>`).join('')}
  </div>
</section>`;
    const url = SITE_URL + '/ochrana-udaju/';
    const keep = list(legal.sections).map((x) => x.anchor).filter(Boolean).join('|') || '_';
    return r.html
      .replace(r.main, () => body)
      // odkazy menu a hlavičky vedou na úvodní stránku; kotvy obsahu zůstávají
      .replace(new RegExp(`href="#(?!(?:${keep})")`, 'g'), 'href="/#')
      .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(legal.title)} | ${esc(site.brand || 'Car Washiess')}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${esc(legal.intro || legal.title)}">`)
      .replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="${url}">`);
  }

  return { renderPage, renderLegal, plain, esc, typo, FONTS, CHAPTER_TIMES, SITE_URL };
});
