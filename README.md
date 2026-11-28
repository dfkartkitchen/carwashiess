# Car Washiess – web

Jednostránkový web Car Washiess (ruční mytí a detailing u zákazníka) se vstupním ticketem, scroll animací mytí a administrací (Decap CMS). Postaveno podle postupu DFK Studia (starter `dfkartkitchen/dfkstudio`).

> **Dočasná adresa:** web zatím běží na `https://carwashiess.netlify.app`. Po připojení vlastní domény ji změňte na **čtyřech místech**: `SITE_URL` v `build.js`, `SITE_URL` v `src/render.js` (stránka Ochrana údajů), `<link rel="canonical">` v `src/template.html` a `site_url` + `display_url` v `admin/config.yml`.

## Jak to funguje

- Stránka se skládá z **bloků** v `content/page.json`: úvod se scroll animací, služby s videem, srovnání, měsíční členství, výhody, O nás, poptávka. Navíc jde v administraci přidat text s obrázkem, galerii a reference.
- Kontakty, patička, SEO, tlačítko v horní liště a vstupní ticket jsou v `content/site.json`.
- `node build.js` z nich a ze šablony `src/template.html` sestaví hotový web do `dist/`. Vykreslení bloků je v `src/render.js` a používá ho i živý náhled v administraci.
- Netlify spouští sestavení automaticky po každé změně v GitHubu, tedy i po publikování v administraci.
- Administrace běží na `/admin/`. Uložení vytvoří koncept, publikování ho zapíše do GitHubu (editorial workflow).

```
content/           obsah webu (upravuje administrace)
src/template.html  vzhled (HTML + CSS + JS): ticket, scroll animace, služby, členství, formulář
src/render.js      vykreslení bloků (sestavení i živý náhled), časování kapitol CHAPTER_TIMES
admin/             administrace (Decap CMS): config.yml = pole formulářů,
                   admin.js + admin.css = levá lišta a živý náhled, historie.html = návod na vrácení změn
img/               obrázky, img/uploads/ = nahrané přes administraci
video/hero-3/      snímky scroll animace (181 snímků: desktop/, mobile/, fallback/)
video/sluzby/      video na pozadí sekce Služby (počítač a mobil)
fonts/             písmo Archivo (self-hosted), volitelná písma pro administraci
tools/             hero-frames.sh – snímky animace z videa
build.js           sestavení webu a kontrola před nasazením
netlify.toml       nastavení sestavení pro Netlify (Node 20, publish dist)
_headers           roční cache pro /video/*, /img/*, /fonts/files/*
```

## Vzhled

- Barvy: černá `#000`, zlatá `#C9A46A` a světlá zlatá `#ECD6A8` (`--gold`, `--gold-l` v `src/template.html`), světlé sekce `#EEF3F2`.
- Písmo: Archivo (variabilní, osa šířky `font-stretch` 62–125 %), soubory ve `fonts/files/`, deklarace ve `fonts/site.css`.
- Žádné cizí domény na veřejném webu (písma, obrázky i videa jsou na vlastní doméně). Výjimkou je jen administrace.

## Administrace

- Přihlášení: Netlify Identity + Git Gateway, registrace jen na pozvánku.
- Vlevo lišta s bloky stránky (vždy jeden blok), uprostřed formulář, vpravo **živý náhled** skutečného webu (Počítač / Mobil). Ukazuje i neuložené změny.
- U každého textu jde nastavit barvu, písmo, velikost a tučně / kurzívu / podtržení. Co nevyplníte, zůstane podle designu.
- **Ceny členství** se mění v bloku *Měsíční členství (ceník)* → Tarify. Souhrn v poptávce i skryté pole formuláře se z nich vyplní samy.
- **Koncepty a schvalování:** Uložit → koncept. V záložce Schvalování: Koncept → Ke kontrole → Připraveno → Publikovat. Na Netlify se ke každému konceptu sestaví zkušební verze.
- **Kontrola před nasazením:** na produkci se sestavení zastaví, když v textech zůstanou `[hranaté závorky]` nebo chybí soubor obrázku či videa. Web pak zůstane v poslední funkční verzi. Lokálně `node build.js` jen upozorní, `node build.js --strict` se chová jako produkce.
- **Historie:** odkazy v liště vedou na seznam verzí v GitHubu a na návod `admin/historie.html`.
- Před úpravou v administraci obnovte stránku (Ctrl+F5) a zkontrolujte záložku Schvalování, ať starý koncept nepřepíše novější změny.

## Lokální spuštění

```
node build.js && python3 -m http.server 8080 -d dist
```

Web je na http://localhost:8080, administrace na http://localhost:8080/admin/. Pro lokální test administrace přidejte `local_backend: true` jen do `dist/admin/config.yml` (ne do zdroje) a spusťte `MODE=git npx decap-server`.

## Scroll animace úvodu

Úvod se nepřehrává jako video, ale jako sekvence 181 snímků (AVIF) na plátně. Snímky se rozbalují jen v okně kolem aktuální pozice a ve velikosti, ve které se kreslí; smyčka běží jen při pohybu a mimo úvod stojí.

- `video/hero-3/desktop/` 1920 px, `mobile/` výřez `crop=1480:1080:220:0` (1080 px), `fallback/` klíčové snímky 1, 40, 60, 90, 130, 181 ve WebP.
- Výška úvodu `.hero` je 700vh, konec videa `VIDEO_END = 0.86` (v `src/template.html`).
- Kapitoly: `CHAPTER_TIMES = [[0.04,0.22],[0.26,0.61],[0.64,0.80]]` v `src/render.js` (podíl délky videa, 0–1).
- `video/hero-3/motion.json` je mapa pohybu: rychlé pasáže videa dostanou víc délky posunu (až 1,5×), klidné méně (nejméně 0,85×, aby závěr při rychlém posunu nepřeskakoval), takže obraz se při posouvání mění rovnoměrně. Vyrábí ji `tools/hero-frames.sh` spolu se snímky. Když chybí, animace běží rovnoměrně podle délky videa.
- Sousední snímky se při posouvání prolínají (na počítači 50 kroků mezi snímky, na mobilu 10). Po zastavení posunu (100 ms bez pohybu) animace dojede na celý snímek a ostrý snímek pro tu pozici se rozbalí přednostně, takže obraz je do zhruba 0,3 s ostrý, nikdy ne prolnutí dvou snímků. Dojezd se počítá podle času, na 60 Hz i 120 Hz displejích je stejně rychlý.
- Dvě vrstvy snímků: všech 181 snímků se po načtení jednou rozbalí v malém rozlišení (náhledy: mobil 360 px, počítač 480 px, asi 65–90 MB paměti), ostré snímky se rozbalují jen kolem aktuální pozice, při rychlém posunu až 16 dopředu. Při rychlém švihnutí se tak kreslí náhled místo starého snímku a po zastavení do zhruba 0,7 s doskočí ostrý.

Výměna animace (video 24 fps, min. 1920 × 1080):

```
sh tools/hero-frames.sh nove-video.mp4 video/hero-4
```

Pak v administraci v bloku **Úvod se scroll animací** změňte „Snímky animace“ na `/video/hero-4/` a nahrajte nový úvodní snímek. **Vždy použijte novou složku a nová jména souborů**, prohlížeče si snímky, obrázky i videa ukládají na rok.

## Nasazení

Postup (GitHub, Netlify, Identity, formulář, doména) je ve skillu DFK Studia, fáze 7–9. Netlify počítá kredity za každé nasazení: víc změn dávejte do jednoho commitu.
