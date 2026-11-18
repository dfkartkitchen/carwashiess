/* Car Washiess – úpravy administrace Decap CMS (podle postupu DFK Studia):
   1) levá lišta ukazuje vždy jeden blok stránky a odkazy na nastavení a historii,
   2) náhled vpravo je skutečný web a ukazuje i neuložené změny. */

const REPO = 'dfkartkitchen/carwashiess';
const store = {
  get(k, d){ try { return localStorage.getItem(k) || d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
};

/* ---------- levá lišta ---------- */
(() => {
  const nav = document.getElementById('dfk-nav'), rule = document.getElementById('dfk-sec-style');
  const PANE = '[class*="-ControlPaneContainer"] > [class*="-ControlContainer"]';
  const ITEM = `${PANE} [class*="-SortableListItem"]:has(> label[for^="blocks-field-"])`;
  const entryName = () => (/#\/collections\/obsah\/entries\/(\w+)/.exec(location.hash) || [])[1];
  let current = store.get('dfk-block', 'all');   // 'all' = celá stránka, jinak pořadí bloku (0, 1, …)

  const items = () => [...document.querySelectorAll(ITEM)];
  const blockInfo = () => items().map(it => ({
    type: (it.querySelector(':scope > label') || {}).textContent?.trim() || 'Blok',
    title: (it.querySelector(':scope > [class*="-NestedObjectLabel"]') || {}).textContent?.trim() || ''
  }));

  function draw(){
    const page = entryName() === 'page';
    let blocks = [];
    if(page){ blocks = blockInfo(); store.set('dfk-blocks', JSON.stringify(blocks)); }
    else { try { blocks = JSON.parse(store.get('dfk-blocks', '[]')); } catch(e){} }
    const key = JSON.stringify([page, entryName(), current, blocks]);
    if(key === nav.dataset.key) return;
    nav.dataset.key = key;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const on = (cond) => cond ? ' class="on"' : '';
    nav.innerHTML = `
      <a class="dfk-mark" href="../" target="_blank" rel="noopener" title="Otevřít web v nové záložce"><img src="/img/logo-car-washiess.webp" alt="Car Washiess"><span>SPRÁVA WEBU</span></a>
      <p class="dfk-group">Stránka</p>
      <button type="button" data-sec="all"${on(page && current === 'all')}>Celá stránka <small>pořadí, přidání bloku</small></button>
      ${blocks.map((b, i) => `<button type="button" data-sec="${i}"${on(page && current === String(i))}>${esc(b.title || b.type)}<small>${esc(b.type)}</small></button>`).join('')}
      <p class="dfk-group">Nastavení</p>
      <button type="button" data-entry="site"${on(entryName() === 'site')}>Kontakty, patička a SEO</button>
      <button type="button" data-entry="legal"${on(entryName() === 'legal')}>Ochrana údajů a cookies</button>
      <p class="dfk-group">Historie</p>
      <a class="dfk-link" href="https://github.com/${REPO}/commits/main/content" target="_blank" rel="noopener">Seznam verzí obsahu ↗</a>
      <a class="dfk-link" href="historie.html" target="_blank" rel="noopener">Jak vrátit změnu zpět ↗</a>
      <p class="dfk-help">Změny vidíte hned v náhledu vpravo. Uložení vytvoří <b>koncept</b>, na web se dostane až po stavu <b>Připraveno</b> a kliknutí na <b>Publikovat</b>.</p>`;
  }

  function show(sec, fromClick){
    current = String(sec); store.set('dfk-block', current);
    if(current === 'all'){
      rule.textContent = '';
    } else {
      const n = +current + 1;
      // jen vybraný blok; skryje i lištu seznamu (Přidat / sbalit vše)
      rule.textContent = `${ITEM}:not(:nth-child(${n})){display:none}
        ${PANE}:has(label[for^="blocks-field-"]) > div > [class*="-TopBarContainer"],
        ${PANE} > [class*="-ControlTopbar"]:has(> label[for^="blocks-field-"]){display:none}`;
      const it = items()[+current];
      // rozbalit sbalený blok
      const first = it && it.querySelector('[class*="-ControlContainer"]');
      if(it && (!first || !first.offsetParent)){ const t = it.querySelector(':scope > [class*="-TopBar"] [class*="-TopBarButton"]'); if(t) t.click(); }
    }
    draw();
    if(fromClick){
      const pane = document.querySelector('[class*="-ControlPaneContainer"]');
      if(pane) pane.scrollTop = 0;
      if(window.dfkPreviewGoto) window.dfkPreviewGoto(current === 'all' ? 0 : +current);
    }
  }

  nav.addEventListener('click', e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.entry){ location.hash = '#/collections/obsah/entries/' + b.dataset.entry; return; }
    if(entryName() !== 'page'){ store.set('dfk-block', b.dataset.sec); location.hash = '#/collections/obsah/entries/page'; return; }
    show(b.dataset.sec, true);
    if(b.classList.contains('err')) reveal(+b.dataset.sec);
  });

  // povinné pole nechané prázdné může být ve skrytém bloku: označit ho v liště a přejít na něj
  let errKey = '';
  function invalid(){
    return items().map((it, i) => {
      const bad = [...it.querySelectorAll('[class*="ControlErrorsList"]')].find(ul => ul.textContent.trim());
      return bad && {sec: i, el: bad};
    }).filter(Boolean);
  }
  function reveal(sec){
    const hit = invalid().find(s => s.sec === sec); if(!hit) return;
    const item = hit.el.closest('[class*="-ListItem"]:not(:has(> label[for^="blocks-field-"]))');
    if(item && !item.querySelector('input:not([type=hidden]), textarea')?.offsetParent){
      const toggle = item.querySelector('[class*="-TopBarButton"]'); if(toggle) toggle.click();
    }
    setTimeout(() => {
      const field = hit.el.closest('[class*="-ControlContainer"]');
      (field || hit.el).scrollIntoView({block: 'center', behavior: 'smooth'});
    }, 150);
  }
  function errors(){
    const secs = invalid();
    nav.querySelectorAll('[data-sec]').forEach(b => b.classList.toggle('err', secs.some(s => String(s.sec) === b.dataset.sec)));
    const key = secs.map(s => s.sec).join();
    if(key && key !== errKey){
      const first = secs.find(s => String(s.sec) === current) || secs[0];
      if(current !== 'all' && String(first.sec) !== current) show(first.sec, true);
      reveal(first.sec);
    }
    errKey = key;
  }

  // lišta patří jen do editoru (ne na přihlášení, seznam ani pracovní plochu)
  let queued = false, wasPage = false;
  const sync = () => {
    const editing = !!document.querySelector('[class*="-EditorContainer"]');
    document.body.classList.toggle('dfk-editing', editing);
    const page = editing && entryName() === 'page';
    if(page && !wasPage && items().length) show(current);   // první otevření stránky: obnovit vybraný blok
    if(page && !items().length) return;
    wasPage = page && items().length > 0;
    if(!queued){ queued = true; requestAnimationFrame(() => { queued = false; if(editing){ draw(); errors(); } }); }
  };
  new MutationObserver(sync).observe(document.body, {childList: true, subtree: true});
  window.addEventListener('hashchange', () => { wasPage = false; sync(); });
  sync();
  window.dfkCurrentBlock = () => (entryName() === 'page' && current !== 'all' ? +current : null);
})();

/* ---------- živý náhled ---------- */
const DEVICES = {desktop: {w: 1280, h: 800, label: 'Počítač'}, mobile: {w: 390, h: 844, label: 'Mobil'}};
const BASE = new URL('preview/', location.href).href;
let SOURCES = null;   // šablona, vykreslování a zveřejněný obsah (pro soubor, který se zrovna neupravuje)
const sources = () => SOURCES || (SOURCES = Promise.all(['template.html', 'page.json', 'site.json', 'legal.json']
  .map(f => fetch(BASE + f, {cache: 'no-cache'}).then(r => (f.endsWith('.json') ? r.json() : r.text())))));

// v náhledu se nic neodesílá a odkazy nevedou pryč; #kotvy jen posunou stránku
const GUARD = `<script>(function(){
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a)return;var h=a.getAttribute('href')||'';
    if(h.charAt(0)==='#'){e.preventDefault();var t=h.length>1&&document.getElementById(h.slice(1));if(t)t.scrollIntoView();}
    else if(a.target!=='_blank'){e.preventDefault();}},true);
  window.addEventListener('submit',function(e){e.preventDefault();e.stopPropagation();},true);
})();<\/script><style>body::after{display:none}.loader{display:none!important}html.loading,html.loading body{overflow:visible!important}</style>`;

const Preview = createClass({
  getInitialState(){ return {device: store.get('dfk-device', 'desktop'), w: 0, h: 0}; },
  componentDidMount(){
    this.win = this.stage.ownerDocument.defaultView;
    this.onResize = () => this.measure();
    this.win.addEventListener('resize', this.onResize);
    this.measure();
    this.goto = window.dfkCurrentBlock ? window.dfkCurrentBlock() : null;
    window.dfkPreviewGoto = i => { this.goto = i; this.scrollTo(this.frame, i); };
    sources().then(([tpl, page, site, legal]) => { this.src = {tpl, page, site, legal}; this.update(); });
  },
  componentWillUnmount(){
    this.win.removeEventListener('resize', this.onResize);
    clearTimeout(this.timer);
    window.dfkPreviewGoto = null;
  },
  componentDidUpdate(){ this.measure(); clearTimeout(this.timer); this.timer = setTimeout(() => this.update(), 250); },
  measure(){
    if(!this.stage) return;
    const r = this.stage.getBoundingClientRect();
    if(Math.round(r.width) !== this.state.w || Math.round(r.height) !== this.state.h) this.setState({w: Math.round(r.width), h: Math.round(r.height)});
  },
  data(){
    const d = this.props.entry.getIn(['data']).toJS();
    // obrázky nahrané, ale ještě nezveřejněné, existují jen v prohlížeči
    const walk = o => {
      if(Array.isArray(o)) return o.map(walk);
      if(o && typeof o === 'object'){ for(const k of Object.keys(o)) o[k] = walk(o[k]); return o; }
      if(typeof o === 'string' && /^\/img\/uploads\//.test(o)){ const a = this.props.getAsset(o), url = a && String(a); return url || o; }
      return o;
    };
    return walk(d);
  },
  scrollTo(frame, i){
    const doc = frame && frame.contentDocument; if(!doc || i == null) return;
    const el = doc.querySelector(`[data-block="${i}"]`); if(!el) return;
    doc.documentElement.style.scrollBehavior = 'auto';
    frame.contentWindow.scrollTo(0, i === 0 ? 0 : el.getBoundingClientRect().top + frame.contentWindow.scrollY - 72);
  },
  update(){
    if(!this.src || !this.box) return;
    const editing = this.props.entry.get('slug');
    const live = this.data();
    if(editing === 'legal'){
      // podstránka: vždy celá znovu, pozice posunu zůstane
      const html = DFKRender.renderLegal(this.src.tpl, this.src.page, this.src.site, live).replace('</body>', () => GUARD + '\n</body>');
      if(!this.rendered || this.rendered.html !== html){ this.rendered = {html, shell: '', sections: []}; this.reload(html); }
      return;
    }
    const page = editing === 'site' ? this.src.page : live, site = editing === 'site' ? live : this.src.site;
    const r = DFKRender.renderPage(this.src.tpl, page, site, {preview: true, parts: true});
    const html = r.html.replace('</body>', () => GUARD + '\n</body>');
    const shell = html.replace(r.main, '');
    const prev = this.rendered; if(prev && prev.html === html) return;
    this.rendered = {html, shell, sections: r.sections};

    // posun na blok, který se právě změnil
    if(prev && editing === 'page'){
      const k = r.sections.findIndex((s, i) => s !== prev.sections[i]);
      if(k >= 0 && r.sections.length === prev.sections.length) this.goto = k;
    }
    if(editing === 'site' && this.goto == null) this.goto = r.sections.length - 1;

    // stejná kostra stránky: vyměnit jen změněné sekce, bez znovunačtení (video úvodu zůstane)
    if(prev && this.frame && !this.pending && prev.shell === shell && prev.sections.length === r.sections.length && this.patch(prev.sections, r.sections)) return;
    this.reload(html);
  },
  patch(before, after){
    const doc = this.frame.contentDocument; if(!doc) return false;
    const parse = s => { const t = doc.createElement('template'); t.innerHTML = s; return t.content.firstElementChild; };
    for(let i = 0; i < after.length; i++){
      if(after[i] === before[i]) continue;
      const old = doc.querySelector(`[data-block="${i}"]`), next = parse(after[i]);
      if(!old || !next || old.className.split(' ')[0] !== next.className.split(' ')[0]) return false;
      if(next.classList.contains('hero')){
        // skript webu drží odkazy na úvod, kapitoly, ukazatel a závěr: přepsat jen jejich obsah
        const a = old.querySelectorAll('.chapter'), b = next.querySelectorAll('.chapter');
        const ra = old.querySelectorAll('#rail li'), rb = next.querySelectorAll('#rail li');
        const same = (sel, at) => (old.querySelector(sel) || {}).getAttribute?.(at) === (next.querySelector(sel) || {}).getAttribute?.(at);
        if(a.length !== b.length || ra.length !== rb.length || !same('.poster', 'src') || !same('#seq', 'data-src') || !same('#seq', 'data-count')) return false;
        a.forEach((c, j) => { c.innerHTML = b[j].innerHTML; });
        ra.forEach((li, j) => { li.firstChild.nodeValue = rb[j].firstChild.nodeValue; });
        old.querySelector('.intro').innerHTML = next.querySelector('.intro').innerHTML;
        old.querySelector('.finale').innerHTML = next.querySelector('.finale').innerHTML;
      } else if(next.hasAttribute('data-js') || old.hasAttribute('data-js')){
        return false;   // sekce se skriptem webu (služby s videem, členství): načíst náhled znovu
      } else old.replaceWith(next);
    }
    this.frame.contentWindow.dispatchEvent(new Event('scroll'));
    return true;
  },
  reload(html){
    // nový rámeček se načte skrytě a vymění se až po obnovení pozice, takže náhled nebliká
    if(this.pending) this.pending.remove();
    const f = this.pending = this.box.ownerDocument.createElement('iframe');
    f.title = 'Náhled webu';
    f.className = 'pv-next';
    f.addEventListener('load', () => {
      if(this.pending !== f) return;
      this.pending = null;
      const old = this.frame, y = old && old.contentWindow ? old.contentWindow.scrollY : 0;
      if(this.goto != null){ this.scrollTo(f, this.goto); this.goto = null; }
      else { f.contentDocument.documentElement.style.scrollBehavior = 'auto'; f.contentWindow.scrollTo(0, y); }
      f.className = '';
      this.frame = f;
      if(old) old.remove();
    }, {once: true});
    f.srcdoc = html;
    this.box.appendChild(f);
  },
  setDevice(device){ store.set('dfk-device', device); this.setState({device}); },
  render(){
    const {device, w, h: ht} = this.state, dev = DEVICES[device];
    let style = {display: 'none'};
    if(w && ht){
      if(device === 'desktop'){
        const s = w / dev.w;
        style = {width: dev.w + 'px', height: (ht / s) + 'px', transform: `scale(${s})`, left: 0, top: 0};
      } else {
        const s = Math.min(1, (ht - 40) / dev.h, (w - 40) / dev.w);
        style = {width: dev.w + 'px', height: dev.h + 'px', transform: `scale(${s})`, left: ((w - dev.w * s) / 2) + 'px', top: '20px'};
      }
    }
    return h('div', {className: 'pv'},
      h('div', {className: 'pv-bar'},
        h('span', {className: 'pv-live'}, h('i'), 'Živý náhled'),
        h('div', {className: 'pv-seg'}, Object.keys(DEVICES).map(k =>
          h('button', {key: k, type: 'button', className: k === device ? 'on' : '', onClick: () => this.setDevice(k)}, DEVICES[k].label)))),
      h('div', {className: 'pv-stage', ref: el => { this.stage = el; }},
        // rámečky s webem vkládá update() přímo, React je nepřekresluje
        h('div', {className: 'pv-device pv-' + device, style, ref: el => { this.box = el; }})));
  }
});

CMS.registerPreviewTemplate('page', Preview);
CMS.registerPreviewTemplate('site', Preview);
CMS.registerPreviewTemplate('legal', Preview);
CMS.registerPreviewStyle(`
  html,body{margin:0;height:100%;overflow:hidden}
  .pv{position:fixed;inset:0;display:flex;flex-direction:column;background:#1A1C1C;font-family:Archivo,"Segoe UI",system-ui,sans-serif}
  .pv-bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:10px 72px 10px 16px;background:#0B0B0A;border-bottom:1px solid #2A2C2C;font-size:13px;color:#EEF5F4}
  .pv-live{display:inline-flex;align-items:center;gap:8px;font-weight:500;letter-spacing:.02em}
  .pv-live i{width:8px;height:8px;border-radius:50%;background:#3E9B57;box-shadow:0 0 0 3px rgba(62,155,87,.2)}
  .pv-seg{display:inline-flex;background:#1F2121;border-radius:999px;padding:3px}
  .pv-seg button{font:inherit;font-size:13px;border:0;background:transparent;color:#9FB4B6;padding:5px 14px;border-radius:999px;cursor:pointer}
  .pv-seg button.on{background:#C9A46A;color:#0B0B0A}
  .pv-stage{position:relative;flex:1;overflow:hidden}
  .pv-device{position:absolute;transform-origin:0 0;background:#000}
  .pv-mobile{border-radius:36px;overflow:hidden;box-shadow:0 0 0 10px #1A1A1A,0 20px 50px rgba(0,0,0,.35)}
  .pv-device iframe{position:absolute;inset:0;display:block;width:100%;height:100%;border:0}
  .pv-device iframe.pv-next{visibility:hidden}
`, {raw: true});
