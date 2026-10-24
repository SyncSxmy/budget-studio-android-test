'use strict';
const LEGACY_KEY='budget-studio-v1';
const KEY='budget-studio-v2';
function uid(){return (globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`)}
const THEMES=[{"id":"sage","label":"Salbei","description":"Natürlich & ruhig","accent":"#245846","background":"#e9f0e9"},{"id":"rose","label":"Pastell-Pink","description":"Sanft & freundlich","accent":"#e28bb0","background":"#fff7fb"},{"id":"gold","label":"Schwarz-Gold","description":"Elegant & klassisch","accent":"#d5b574","background":"#131719"},{"id":"blueblack","label":"Blau-Schwarz","description":"Kühl & kontrastreich","accent":"#58a6ff","background":"#0d1117"},{"id":"pinkblack","label":"Pink-Schwarz","description":"Kräftig & modern","accent":"#ff6fb3","background":"#130f14"},{"id":"lavender","label":"Lavendel","description":"Zartes Violett","accent":"#9a7dff","background":"#f7f4ff"},{"id":"ice","label":"Ice / Hellblau","description":"Hell & frisch","accent":"#54b9d9","background":"#f3fbff"},{"id":"motorsport","label":"AMG Style","description":"Anthrazit · Silber · Rot","accent":"#ed535d","background":"#101115"},{"id":"sportscar","label":"Porsche Style","description":"Schwarz · Kreide · Gold","accent":"#d1ad73","background":"#171716"},{"id":"appleclean","label":"Apple Clean","description":"Weiß · Grau · Blau","accent":"#3178df","background":"#f6f8fb"},{"id":"neoncyber","label":"Neon Cyber","description":"Schwarz · Türkis · Lila","accent":"#35e6d1","background":"#0b0c17"},{"id":"construction","label":"Baustellen Style","description":"Anthrazit · Gelb · Orange","accent":"#f4b42c","background":"#1c2025"}];
const blank=()=>({version:1,theme:'rose',accounts:[{id:uid(),name:'Girokonto',opening:0}],transactions:[],goals:[],debts:[],subscriptions:[],recurring:[]});
function dateToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function isDate(s){if(typeof s!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===d}
function normalizeData(d){if(!d||d.version!==1||!['accounts','transactions','goals','debts','subscriptions'].every(k=>Array.isArray(d[k])))return null;return {...d,recurring:Array.isArray(d.recurring)?d.recurring:[]}}
/* Budget Studio 0.7 — Branchenprofile, Materialrechner und Projektkalkulation.
   Bewusst ausschließlich lokal: keine Bank-/Steuer-/Cloud-Anbindung. */
const TRADES=[
 {id:'masonry',name:'Maurer / Hochbau',icon:'▦',description:'Mauerwerk, Putz, Beton'},
 {id:'civil',name:'Tiefbau',icon:'▱',description:'Aushub, Rohre, Bettung'},
 {id:'electrical',name:'Elektrotechnik',icon:'ϟ',description:'Kabel, Leerrohre, Leitungswege'},
 {id:'paint',name:'Maler / Lackierer',icon:'◩',description:'Anstrich, Tapeten'},
 {id:'tiling',name:'Fliesenleger',icon:'▤',description:'Fliesen, Kleber, Fugen'},
 {id:'drywall',name:'Trockenbau',icon:'▥',description:'Gipskarton, Profile, Dämmung'},
 {id:'concrete',name:'Betonbau',icon:'▧',description:'Beton, Bewehrung'},
 {id:'plumbing',name:'SHK / Sanitär',icon:'◉',description:'Rohrleitungen, Isolierung'},
 {id:'roofing',name:'Dachdecker',icon:'⌂',description:'Dachdeckung, Unterspannbahn'},
 {id:'landscape',name:'Garten- / Landschaftsbau',icon:'❖',description:'Pflaster, Schotter, Rasen'}
];
const TF=(key,label,defaultValue,unit='m')=>({key,label,defaultValue,unit});
const F={length:TF('length','Länge',5),height:TF('height','Höhe',2.5),width:TF('width','Breite',3),openings:TF('openings','Öffnungen / abzuziehende Fläche',0,'m²'),reserve:TF('reserve','Verschnitt / Reserve',5,'%')};
const simpleLine=(name,qty,unit,note='')=>[{name,qty,unit,note}];
const PRESETS={
 masonry:[
  {id:'blocks',name:'Mauersteine & Mörtel',hint:'Überschlag für eine einschalige Wand mit Rechtecksteinen und gleichmäßigen Lager-/Stoßfugen.',fields:[F.length,F.height,F.openings,TF('stoneL','Steinlänge',24,'cm'),TF('stoneH','Steinhöhe',24,'cm'),TF('wall','Wandstärke',24,'cm'),TF('joint','Fugenstärke',10,'mm'),F.reserve],compute:v=>{const area=v.length*v.height-v.openings,L=v.stoneL/100,H=v.stoneH/100,j=v.joint/1000,depth=v.wall/100;const qty=area/((L+j)*(H+j));const mortar=Math.max(0,area*depth*(1-L*H/((L+j)*(H+j)))*1000)*(1+v.reserve/100);return [{name:'Mauersteine',qty:Math.ceil(qty*(1+v.reserve/100)),unit:'Stk',note:'Ohne Verband, Eckausbildung, Sondersteine und Stürze'},{name:'Mörtel (Frischvolumen)',qty:mortar,unit:'l',note:'Nur geometrischer Überschlag, Trockenmörtel nach Herstellerangabe'}] }},
  {id:'plaster',name:'Innenputz',hint:'Putzbedarf auf Basis von Fläche, Schichtdicke und Verbrauch laut Datenblatt.',fields:[F.length,F.height,F.openings,TF('thickness','Putzdicke',10,'mm'),TF('consumption','Verbrauch pro m² und mm',1,'kg'),F.reserve],compute:v=>simpleLine('Putzmörtel', (v.length*v.height-v.openings)*v.thickness*v.consumption*(1+v.reserve/100),'kg','Verbrauch produktabhängig; Gebindegrößen separat berücksichtigen')},
  {id:'masonry-concrete',name:'Beton / Verguss',hint:'Volumen der Bauteile zuzüglich Reserve.',fields:[F.length,F.width,TF('height','Bauteildicke / Höhe',0.2,'m'),F.reserve],compute:v=>simpleLine('Betonvolumen',v.length*v.width*v.height*(1+v.reserve/100),'m³','Bewehrung, Verdichtung und Schalung nicht enthalten')}
 ],
 civil:[
  {id:'trench',name:'Graben / Aushub',hint:'Rechteckiger Graben; Böschungen, Verbau und Bodenlockerung separat beachten.',fields:[TF('length','Grabenlänge',20),TF('width','Grabenbreite',0.8),TF('height','Grabentiefe',1.2),F.reserve],compute:v=>simpleLine('Aushub (geometrisch)',v.length*v.width*v.height*(1+v.reserve/100),'m³','Keine Böschungswinkel, Auflockerung oder Arbeitsräume berücksichtigt')},
  {id:'civil-pipes',name:'Rohrbedarf',hint:'Leitungslänge zuzüglich Verschnitt; Formstücke gesondert.',fields:[TF('length','Trassenlänge',30),TF('count','Parallele Leitungen',1,'Stk'),F.reserve],compute:v=>simpleLine('Rohrlänge',v.length*v.count*(1+v.reserve/100),'m','Bögen, Muffen, Schächte und Gefälle nicht enthalten')},
  {id:'bedding',name:'Rohrbettung / Schotter',hint:'Volumen einer gleichmäßigen Bettungsschicht.',fields:[TF('length','Länge',20),TF('width','Breite',0.8),TF('height','Schichtdicke',0.15),F.reserve],compute:v=>simpleLine('Schüttvolumen',v.length*v.width*v.height*(1+v.reserve/100),'m³','Verdichtung/Schüttdichte und Rohrverdrängung separat prüfen')}
 ],
 electrical:[
  {id:'wire',name:'Kabelbedarf',hint:'Leitungswege inklusive Anzahl und Reserve; Verlegevorschriften fachlich prüfen.',fields:[TF('length','Länge je Kabelweg',15),TF('count','Anzahl Kabelwege',8,'Stk'),TF('ends','Zuschlag pro Kabelweg für Anschlüsse',0.5,'m'),F.reserve],compute:v=>simpleLine('Kabellänge',(v.length+v.ends)*v.count*(1+v.reserve/100),'m','Querschnitte, Schutz, Spannungsfall und Strombelastbarkeit nicht berechnet')},
  {id:'conduit',name:'Leerrohre',hint:'Gesamtlänge mehrerer Installationsstrecken.',fields:[TF('length','Länge je Strecke',12),TF('count','Anzahl Strecken',6,'Stk'),F.reserve],compute:v=>simpleLine('Leerrohrlänge',v.length*v.count*(1+v.reserve/100),'m','Bögen, Dosen und zugelassene Belegung nicht enthalten')}
 ],
 paint:[
  {id:'paint',name:'Wandfarbe',hint:'Fläche, Anstrichanzahl und Ergiebigkeit der Farbe.',fields:[F.length,F.height,F.openings,TF('coats','Anzahl Anstriche',2,'Stk'),TF('coverage','Ergiebigkeit je Liter',7,'m²/l'),F.reserve],compute:v=>simpleLine('Farbe',(v.length*v.height-v.openings)*v.coats/v.coverage*(1+v.reserve/100),'l','Untergrund und Deckkraft beeinflussen tatsächlichen Verbrauch')},
  {id:'wallpaper',name:'Tapetenrollen',hint:'Bahnenweise Berechnung ohne Musterrapport.',fields:[F.length,F.height,TF('rollW','Rollenbreite',0.53),TF('rollL','Rollenlänge',10.05),TF('cut','Zugabe je Bahn',0.1),F.reserve],compute:v=>{const strips=Math.ceil(v.length/v.rollW),perRoll=Math.floor(v.rollL/(v.height+v.cut));if(perRoll<1)throw Error('Rolle ist zu kurz für die benötigte Bahnlänge.');return simpleLine('Tapetenrollen',Math.ceil(strips/perRoll*(1+v.reserve/100)),'Rollen','Musterrapport, Ecken, Fenster und Türen separat berücksichtigen')}}
 ],
 tiling:[
  {id:'tiles',name:'Fliesenbedarf',hint:'Fläche und Format inklusive Verschnitt.',fields:[F.length,F.height,F.openings,TF('tileL','Fliesenlänge',30,'cm'),TF('tileW','Fliesenbreite',60,'cm'),F.reserve],compute:v=>simpleLine('Fliesen',Math.ceil((v.length*v.height-v.openings)/((v.tileL/100)*(v.tileW/100))*(1+v.reserve/100)),'Stk','Verlegemuster und Kartonrundung nicht berücksichtigt')},
  {id:'adhesive',name:'Fliesenkleber',hint:'Fläche und produktbezogener Verbrauch.',fields:[F.length,F.height,F.openings,TF('consumption','Verbrauch je m²',4,'kg'),F.reserve],compute:v=>simpleLine('Fliesenkleber',(v.length*v.height-v.openings)*v.consumption*(1+v.reserve/100),'kg','Zahnung und Untergrund beeinflussen den Verbrauch')},
  {id:'grout',name:'Fugenmörtel',hint:'Grobe Schätzung mit herstellerspezifischem m²-Verbrauch.',fields:[F.length,F.height,F.openings,TF('consumption','Verbrauch je m²',0.6,'kg'),F.reserve],compute:v=>simpleLine('Fugenmörtel',(v.length*v.height-v.openings)*v.consumption*(1+v.reserve/100),'kg','Format, Fugentiefe und Fugenbreite maßgeblich')}
 ],
 drywall:[
  {id:'gypsum',name:'Gipskartonplatten',hint:'Ein- oder beidseitige Beplankung einer Wand; Plattenformat frei wählbar.',fields:[F.length,F.height,F.openings,TF('sides','Beplankte Seiten',2,'Stk'),TF('layers','Lagen je Seite',1,'Stk'),TF('panelW','Plattenbreite',1.25),TF('panelH','Plattenhöhe',2.0),F.reserve],compute:v=>simpleLine('Gipskartonplatten',Math.ceil((v.length*v.height-v.openings)*v.sides*v.layers/(v.panelW*v.panelH)*(1+v.reserve/100)),'Stk','Zuschnitt und Brandschutzanforderungen gesondert prüfen')},
  {id:'drywall-studs',name:'CW-/UW-Profile',hint:'Grobe Profilmengen einer geraden Metallständerwand.',fields:[F.length,F.height,TF('spacing','Achsabstand der Ständer',0.625),F.reserve],compute:v=>[{name:'CW-Ständerprofile',qty:Math.ceil((Math.ceil(v.length/v.spacing)+1)*(1+v.reserve/100)),unit:'Stk',note:`Je Profil ${v.height.toLocaleString('de-DE')} m; Standardlängen prüfen`},{name:'UW-Profile',qty:v.length*2*(1+v.reserve/100),unit:'m',note:'Oberer und unterer Anschluss'}]}
 ],
 concrete:[
  {id:'slab',name:'Fundament / Bodenplatte',hint:'Rechteckiges Betonvolumen inklusive Reserve.',fields:[F.length,F.width,TF('height','Dicke',0.2),F.reserve],compute:v=>simpleLine('Betonvolumen',v.length*v.width*v.height*(1+v.reserve/100),'m³','Keine statische Dimensionierung oder Bewehrungsbemessung')},
  {id:'reinforcement',name:'Bewehrungsstahl (Gewicht)',hint:'Gewicht aus Länge und Durchmesser: theoretischer Stahlgewichtswert.',fields:[TF('length','Stablänge',6),TF('count','Anzahl Stäbe',20,'Stk'),TF('diameter','Durchmesser',12,'mm'),F.reserve],compute:v=>simpleLine('Bewehrungsstahl',v.length*v.count*v.diameter*v.diameter/162*(1+v.reserve/100),'kg','Faustformel d²/162 kg/m; Übergreifungen und Biegezugaben prüfen')}
 ],
 plumbing:[
  {id:'plumbing-pipes',name:'Wasser-/Heizungsrohre',hint:'Rohrmeter nach Leitungslänge und Anzahl.',fields:[TF('length','Länge je Strang',12),TF('count','Anzahl Stränge',4,'Stk'),F.reserve],compute:v=>simpleLine('Rohrlänge',v.length*v.count*(1+v.reserve/100),'m','Dimensionierung, Druckverluste und Armaturen nicht berechnet')},
  {id:'pipe-insulation',name:'Rohrisolierung',hint:'Meter Isolierung entlang von Rohrleitungen.',fields:[TF('length','Leitungslänge',50),F.reserve],compute:v=>simpleLine('Dämmschlauch',v.length*(1+v.reserve/100),'m','Erforderliche Dämmstärke und rechtliche Anforderungen gesondert prüfen')}
 ],
 roofing:[
  {id:'roof-tiles',name:'Dachziegel / Dachsteine',hint:'Bedarf aus realer Dachfläche und Deckwert.',fields:[TF('area','Tatsächliche Dachfläche',120,'m²'),TF('density','Bedarf je m²',10,'Stk'),F.reserve],compute:v=>simpleLine('Dachziegel',Math.ceil(v.area*v.density*(1+v.reserve/100)),'Stk','Lattabstand, First, Ortgang und Dachneigung fachlich prüfen')},
  {id:'roof-membrane',name:'Unterspannbahn',hint:'Dachfläche, Überlappungen über Reserve, Rollendeckfläche.',fields:[TF('area','Tatsächliche Dachfläche',120,'m²'),TF('rollArea','Nutzfläche je Rolle',50,'m²'),F.reserve],compute:v=>simpleLine('Unterspannbahn',Math.ceil(v.area*(1+v.reserve/100)/v.rollArea),'Rollen','Überdeckungen und Anschlüsse separat planen')}
 ],
 landscape:[
  {id:'paving',name:'Pflastersteine',hint:'Fläche, Steinformat und Reserve.',fields:[F.length,F.width,TF('stoneL','Steinlänge',20,'cm'),TF('stoneW','Steinbreite',10,'cm'),F.reserve],compute:v=>simpleLine('Pflastersteine',Math.ceil(v.length*v.width/((v.stoneL/100)*(v.stoneW/100))*(1+v.reserve/100)),'Stk','Fugenanteil nicht berücksichtigt')},
  {id:'subbase',name:'Schottertragschicht',hint:'Verdichtetes Sollvolumen der Tragschicht.',fields:[F.length,F.width,TF('height','Schichtstärke',0.25),F.reserve],compute:v=>simpleLine('Schotter (Sollvolumen)',v.length*v.width*v.height*(1+v.reserve/100),'m³','Liefermenge über Verdichtungsgrad/Schüttdichte separat ermitteln')},
  {id:'lawn',name:'Rollrasen',hint:'Zu belegende Fläche mit Verschnitt.',fields:[F.length,F.width,F.reserve],compute:v=>simpleLine('Rollrasen',v.length*v.width*(1+v.reserve/100),'m²','Rollenmaße, Randanschnitte und Untergrund nicht enthalten')}
 ]
};
const TRADE_IDS=new Set(TRADES.map(t=>t.id));
const MATERIAL_UNITS=['Stk','m','m²','m³','kg','l','Rollen','Säcke','Platten','Eimer'];
let selectedTrade=null,selectedCalculator=null,pendingCalc=null;
function tradeName(id){return TRADES.find(t=>t.id===id)?.name||'Eigenes Gewerk'}
function tradesOf(h=household()){return (Array.isArray(h?.trades)?h.trades:[]).filter(id=>TRADE_IDS.has(id))}
function customOf(){return Array.isArray(household()?.customCalculators)?household().customCalculators:[]}
function estimatesOf(){return Array.isArray(household()?.estimates)?household().estimates:[]}
function tradeCheckboxes(checked=[]){return TRADES.map(t=>`<label class="trade-check"><input type="checkbox" name="trades" value="${t.id}" ${checked.includes(t.id)?'checked':''}><span><b>${esc(t.name)}</b><small>${esc(t.description)}</small></span></label>`).join('')}
function businessDashboard(){
 const tx=state.transactions.filter(t=>t.date.slice(0,7)===selectedMonth),income=sum(tx.filter(t=>t.type==='income'),t=>money(t.amount)),expense=sum(tx.filter(t=>t.type==='expense'),t=>money(t.amount));
 const netTx=tx.filter(t=>Number.isFinite(t.netAmount)&&Number.isFinite(t.vatAmount));
 const inc=netTx.filter(t=>t.type==='income'),out=netTx.filter(t=>t.type==='expense');
 const balance=sum(state.accounts,a=>accountBalance(a.id)),trades=tradesOf(),est=estimatesOf();
 return `<div class="heading"><div><small>BUSINESS · ${esc(nameOfHousehold().toUpperCase())}</small><h2>Dein Geschäft <span class="heading-sparkle">✦</span></h2><p class="muted">Finanzen, Gewerke und Projekte auf einen Blick.</p></div><label class="month-label">Monat <input id="month-select" type="month" value="${selectedMonth}"></label></div>
 <div class="business-banner"><div><span class="business-eyebrow">GESCHÄFTSKONTO</span><strong>${eur(balance)}</strong><small>Gesamter Kontostand (brutto)</small></div><div class="business-banner-icon">▤</div></div>
 <div class="business-kpis"><div class="panel"><small>Einnahmen brutto</small><strong class="positive">${eur(income)}</strong></div><div class="panel"><small>Ausgaben brutto</small><strong class="negative">${eur(expense)}</strong></div><div class="panel"><small>Cashflow</small><strong>${eur(income-expense)}</strong></div><div class="panel"><small>Gespeicherte Kalkulationen</small><strong>${est.length}</strong></div></div>
 <div class="section-title"><h3>Deine Werkzeuge</h3><span>${trades.length} GEWERK(E)</span></div>
 ${trades.length?`<div class="trade-chip-row">${trades.map(id=>`<button class="trade-chip" data-trade="${esc(id)}">${esc(TRADES.find(t=>t.id===id)?.icon||'◈')} ${esc(tradeName(id))} ↗</button>`).join('')}</div>`:`<div class="notice-panel">Wähle deine Gewerke aus, damit du passende Materialrechner erhältst. <button data-open-view="trades" class="small-action">Gewerke auswählen</button></div>`}
 <div class="feature-grid"><button class="feature-link" data-open-view="planning"><span class="feature-icon">▥</span><span><b>Material berechnen</b><small>Rechner passend zu deinen Gewerken</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="estimates"><span class="feature-icon">▤</span><span><b>Projektkalkulationen</b><small>${est.length} Kalkulation(en) gespeichert</small></span><span class="feature-arrow">›</span></button></div>
 <div class="panel business-summary"><h3>Netto &amp; Umsatzsteuer · ${esc(selectedMonth)}</h3><p class="muted">Nur Buchungen mit Steueraufteilung. Steuerbeträge sind mathematisch, keine Steuererklärung.</p><div class="tax-summary-grid"><div><small>Netto-Einnahmen</small><strong>${eur(sum(inc,t=>t.netAmount))}</strong></div><div><small>Netto-Ausgaben</small><strong>${eur(sum(out,t=>t.netAmount))}</strong></div><div><small>USt in Einnahmen</small><strong>${eur(sum(inc,t=>t.vatAmount))}</strong></div><div><small>Steuer in Ausgaben</small><strong>${eur(sum(out,t=>t.vatAmount))}</strong></div></div><p class="muted">${tx.length-netTx.length} Buchung(en) noch ohne Steueraufteilung.</p></div>
 <div class="panel"><div class="row"><h3>Letzte Buchungen</h3><button class="small-action" data-open-view="transactions">Alle ansehen ›</button></div>${[...tx].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(t=>`<div class="item row"><span><b>${esc(t.category)}</b><br><small>${esc(t.date)}</small></span><b class="${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'−'}${eur(t.amount)}</b></div>`).join('')||'<p class="muted">Noch keine Buchungen in diesem Monat.</p>'}</div>
 <p class="muted">Materialschätzungen sind unverbindlich und verändern Kontostände nicht. Geschäftliche Buchungen bleiben getrennt von privaten Haushalten.</p>`;
}
function toolsHub(){const selected=tradesOf(),custom=customOf();return `<div class="heading"><div><small>BUSINESS-WERKZEUGE</small><h2>Gewerke &amp; Rechner</h2><p class="muted">Wähle dein Gewerk und berechne den Materialbedarf.</p></div></div><div class="notice-panel">Materialmengen sind <b>unverbindliche Überschläge</b>. Prüfe Maße, Bauweise, Herstellervorgaben sowie einschlägige Normen vor Bestellung und Ausführung.</div>
 <div class="feature-grid"><button class="feature-link" data-open-view="trades"><span class="feature-icon">⚙</span><span><b>Gewerke verwalten</b><small>Weitere Gewerke hinzufügen oder entfernen</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="customBuilder"><span class="feature-icon">＋</span><span><b>Eigenen Rechner erstellen</b><small>Verbrauchsfaktor selbst festlegen</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="estimates"><span class="feature-icon">▤</span><span><b>Gespeicherte Kalkulationen</b><small>Kosten und Materiallisten abrufen</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="financePlanning"><span class="feature-icon">▦</span><span><b>Finanzplanung</b><small>Fixkosten, Kalender, Ziele und Schulden</small></span><span class="feature-arrow">›</span></button></div>
 <div class="section-title"><h3>Deine Gewerke</h3><span>${selected.length}</span></div>${selected.length?`<div class="trade-grid">${selected.map(id=>{const t=TRADES.find(x=>x.id===id),num=PRESETS[id]?.length||0;return `<button class="trade-card" data-trade="${id}"><span class="trade-symbol">${t.icon}</span><b>${esc(t.name)}</b><small>${num} Standardrechner · ${esc(t.description)}</small><span class="trade-next">Rechner öffnen ›</span></button>`}).join('')}</div>`:`<div class="panel"><p class="muted">Noch keine Gewerke ausgewählt.</p><button data-open-view="trades" class="primary">Gewerke auswählen</button></div>`}
 ${custom.length?`<div class="section-title"><h3>Meine eigenen Rechner</h3><span>${custom.length}</span></div><div class="trade-grid">${custom.map(c=>`<button class="trade-card" data-custom-calc="${esc(c.id)}"><span class="trade-symbol">ƒ</span><b>${esc(c.name)}</b><small>${esc(c.materialName)} · ${esc(tradeName(c.trade))}</small><span class="trade-next">Rechner öffnen ›</span></button>`).join('')}</div>`:''}`}
function tradesView(){const chosen=tradesOf();return `<div class="heading"><div><small>FÜR DEIN UNTERNEHMEN</small><h2>Gewerke auswählen</h2><p class="muted">Du kannst mehrere Gewerke kombinieren und jederzeit ändern.</p></div></div><form class="panel stack" data-form="business-trades"><div class="trade-check-grid">${tradeCheckboxes(chosen)}</div><button class="primary" type="submit">Gewerke speichern</button></form><p class="muted">Vorhandene eigene Rechner und Kalkulationen bleiben auch beim Entfernen eines Gewerks gespeichert.</p>`}
function listTradeCalculators(){if(!selectedTrade||!TRADES.find(t=>t.id===selectedTrade)){selectedTrade=tradesOf()[0]||'masonry'}const trade=TRADES.find(t=>t.id===selectedTrade),presets=PRESETS[selectedTrade]||[],mine=customOf().filter(c=>c.trade===selectedTrade);
 return `<div class="heading"><div><small>GEWERK · ${esc(trade.name.toUpperCase())}</small><h2>Materialrechner</h2><p class="muted">${esc(trade.description)}</p></div></div><div class="trade-grid">${presets.map(p=>`<button class="trade-card" data-calc="${esc(p.id)}"><span class="trade-symbol">∑</span><b>${esc(p.name)}</b><small>${esc(p.hint)}</small><span class="trade-next">Berechnen ›</span></button>`).join('')}${mine.map(c=>`<button class="trade-card" data-custom-calc="${esc(c.id)}"><span class="trade-symbol">ƒ</span><b>${esc(c.name)}</b><small>Eigener Rechner · ${esc(c.materialName)}</small><span class="trade-next">Berechnen ›</span></button>`).join('')}</div><div class="panel"><b>Fehlt ein Rechner?</b><p class="muted">Du kannst eine eigene Verbrauchsformel auf Basis von Länge, Fläche, Volumen oder Stückzahl anlegen.</p><button data-open-view="customBuilder">＋ Eigenen Rechner erstellen</button></div>`}
function findCalculator(){if(!selectedCalculator)return null;if(selectedCalculator.startsWith('custom:')){const c=customOf().find(x=>'custom:'+x.id===selectedCalculator);return c?{id:selectedCalculator,name:c.name,hint:c.note||'Eigener Materialrechner',fields:customFields(c),compute:v=>calculateCustom(c,v),custom:c}:null}return (PRESETS[selectedTrade]||[]).find(p=>p.id===selectedCalculator)||null}
function customFields(c){const dim={length:[TF('length','Länge',5)],area:[F.length,F.height,F.openings],volume:[F.length,F.width,F.height],count:[TF('count','Stückzahl',10,'Stk')]};return [...(dim[c.basis]||dim.length),TF('reserve','Zusätzliche Reserve',c.waste,'%')]}
function calculateCustom(c,v){const basis=c.basis==='length'?v.length:c.basis==='area'?v.length*v.height-v.openings:c.basis==='volume'?v.length*v.width*v.height:v.count;const qty=basis*c.factor*(1+v.reserve/100);return simpleLine(c.materialName,c.roundWhole?Math.ceil(qty):qty,c.unit,`Eigener Faktor: ${c.factor} ${c.unit} je ${({'length':'m','area':'m²','volume':'m³','count':'Stk'})[c.basis]}`)}
function calculatorPage(){const p=findCalculator();if(!p)return '<div class="panel">Rechner nicht gefunden. <button data-open-view="planning">Zu den Werkzeugen</button></div>';
 pendingCalc=null;
 return `<div class="heading"><div><small>${esc(tradeName(selectedTrade).toUpperCase())} · MATERIALBEDARF</small><h2>${esc(p.name)}</h2><p class="muted">${esc(p.hint)}</p></div></div><form id="material-form" class="panel form" data-form="material-calc"><label>Projekt / Baustelle<input name="projectName" required maxlength="80" placeholder="z. B. Garage – Außenwand"></label>${p.fields.map(f=>`<label>${esc(f.label)} (${esc(f.unit)})<input type="number" name="${esc(f.key)}" min="0" step="any" value="${f.defaultValue}" required inputmode="decimal"></label>`).join('')}<button class="primary wide" type="submit">Materialbedarf berechnen</button></form><div id="calc-output" aria-live="polite"></div>${p.custom?`<div class="panel"><button data-delete-custom="${esc(p.custom.id)}">Eigenen Rechner löschen</button></div>`:''}`;
}
function computeCalculator(p,form){const v={};for(const f of p.fields){const input=form.elements.namedItem(f.key);if(!input||String(input.value).trim()==='')throw Error(`Bitte „${f.label}“ ausfüllen.`);const raw=Number(input.value);if(!Number.isFinite(raw)||raw<0||raw>1e7)throw Error(`Bitte „${f.label}“ prüfen.`);v[f.key]=raw;}
 const positive=['length','height','width','count','stoneL','stoneH','wall','joint','thickness','consumption','sides','layers','panelW','panelH','spacing','tileL','tileW','coats','coverage','rollW','rollL','rollArea','area','density','diameter'];for(const k of positive)if(k in v&&v[k]<=0)throw Error('Längen, Maße, Verbrauchswerte und Anzahlen müssen größer als 0 sein.');
 if('reserve'in v&&v.reserve>100)throw Error('Reserve kann maximal 100 % betragen.');if('openings'in v&&v.openings>=v.length*(v.height||1))throw Error('Öffnungsfläche muss kleiner als die Gesamtfläche sein.');
 const lines=p.compute(v);if(!Array.isArray(lines)||!lines.length||lines.length>20)throw Error('Ungültiges Rechenergebnis.');return {inputs:v,lines:lines.map(l=>{if(!Number.isFinite(l.qty)||l.qty<0||l.qty>1e12)throw Error('Das Ergebnis ist ungültig. Bitte Eingaben prüfen.');return {...l,qty:l.unit==='Stk'||l.unit==='Rollen'||l.unit==='Platten'||l.unit==='Säcke'||l.unit==='Eimer'?Math.ceil(l.qty):Math.ceil(l.qty*100)/100,unitPrice:0}})};
}
function showCalcResult(){if(!pendingCalc)return;const p=pendingCalc;const outlet=document.querySelector('#calc-output');if(!outlet)return;outlet.innerHTML=`<div class="section-title"><h3>Berechneter Materialbedarf</h3><span>ERGEBNIS</span></div><div class="panel"><div class="calc-result-list">${p.lines.map((l,i)=>`<div class="calc-result-line"><div><small>POSITION ${i+1}</small><strong>${esc(l.name)}</strong><span>${esc(l.note||'')}</span></div><div class="calc-result-qty">${Number(l.qty).toLocaleString('de-DE',{maximumFractionDigits:2})} ${esc(l.unit)}</div></div>`).join('')}</div><p class="muted">Mengen gerundet; Beschaffungseinheiten und Herstellerangaben separat prüfen.</p></div>
 <form data-form="estimate" class="panel form"><h3 class="wide">Kostenkalkulation (optional)</h3>${p.lines.map((l,i)=>`<label>Netto-Einzelpreis: ${esc(l.name)} (${esc(l.unit)})<input name="price${i}" type="number" min="0" step="0.01" inputmode="decimal" value="0" required></label>`).join('')}<label>Zusätzliche Kosten / Arbeit netto (€)<input name="labor" type="number" min="0" step="0.01" value="0" required></label><label>Angebotspreis netto (€)<input name="quote" type="number" min="0" step="0.01" value="0" required></label><label>USt für Angebotsvorschau<select name="vat"><option value="19">19 %</option><option value="7">7 %</option><option value="0">0 %</option></select></label><div id="estimate-preview" class="wide calc-preview" aria-live="polite">Netto-Materialkosten: ${eur(0)} · Gesamtkosten: ${eur(0)}</div><button class="primary wide" type="submit">Projektkalkulation speichern</button></form>`;
}
function updateEstimatePreview(){const form=app.querySelector('form[data-form="estimate"]'),out=app.querySelector('#estimate-preview');if(!form||!out||!pendingCalc)return;const costs=pendingCalc.lines.map((l,i)=>l.qty*money(form.elements.namedItem('price'+i)?.value));const material=round2(sum(costs,x=>x)),additional=money(form.elements.namedItem('labor')?.value),quote=money(form.elements.namedItem('quote')?.value),vat=money(form.elements.namedItem('vat')?.value);out.textContent=`Material netto: ${eur(material)} · Kosten gesamt netto: ${eur(material+additional)} · Angebot brutto: ${eur(quote*(1+vat/100))} · Kalkulierte Differenz netto: ${eur(quote-material-additional)}`;}
function saveEstimate(form){if(!pendingCalc)return alert('Bitte erst eine Menge berechnen.');if(estimatesOf().length>=500)return alert('Maximal 500 Projektkalkulationen pro Geschäftshaushalt.');const lines=pendingCalc.lines.map((l,i)=>({...l,unitPrice:money(form.elements.namedItem('price'+i)?.value)}));const labor=money(form.elements.namedItem('labor')?.value),quote=money(form.elements.namedItem('quote')?.value),vat=money(form.elements.namedItem('vat')?.value);
 if([...lines.map(l=>l.unitPrice),labor,quote].some(v=>!Number.isFinite(v)||v<0||v>1e9))return alert('Bitte die Preise prüfen.');
 const total=round2(sum(lines,l=>l.qty*l.unitPrice)+labor);
 const e={id:uid(),date:dateToday(),projectName:pendingCalc.projectName,trade:selectedTrade,calculatorName:pendingCalc.name,lines,inputs:pendingCalc.inputs,additionalCost:round2(labor),quoteNet:round2(quote),quoteVatRate:vat,totalNet:total};
 const h=household();if(!Array.isArray(h.estimates))h.estimates=[];h.estimates.push(e);if(!save()){h.estimates.pop();return}pendingCalc=null;setView('estimates');}
function estimatesView(){const items=[...estimatesOf()].reverse();return `<div class="heading"><div><small>UNVERBINDLICHE VORKALKULATION</small><h2>Deine Projekte</h2><p class="muted">Materialmengen und geplante Kosten – nicht automatisch als Buchung erfasst.</p></div></div><div class="feature-grid"><button class="feature-link" data-open-view="planning"><span class="feature-icon">∑</span><span><b>Neue Kalkulation</b><small>Materialrechner auswählen</small></span><span class="feature-arrow">›</span></button></div>${items.length?items.map(e=>`<div class="panel estimate-card"><div class="row"><div><small>${esc(e.date)} · ${esc(tradeName(e.trade))}</small><h3>${esc(e.projectName)}</h3><p class="muted">${esc(e.calculatorName)}</p></div><button class="small-action" data-delete-estimate="${esc(e.id)}">Löschen</button></div><div class="estimate-lines">${e.lines.map(l=>`<div class="row"><span>${esc(l.name)} <small>(${Number(l.qty).toLocaleString('de-DE',{maximumFractionDigits:2})} ${esc(l.unit)})</small></span><b>${eur(l.qty*l.unitPrice)}</b></div>`).join('')}</div><div class="estimate-totals"><div class="row"><span>Material &amp; Zusatzkosten netto</span><b>${eur(e.totalNet)}</b></div><div class="row"><span>Angebot netto</span><b>${eur(e.quoteNet)}</b></div><div class="row"><span>Angebot brutto (${e.quoteVatRate} %)</span><b>${eur(e.quoteNet*(1+e.quoteVatRate/100))}</b></div><div class="row"><span>Rechnerische Differenz netto</span><strong class="${e.quoteNet-e.totalNet>=0?'positive':'negative'}">${eur(e.quoteNet-e.totalNet)}</strong></div></div></div>`).join(''):'<div class="panel"><p class="muted">Noch keine Projekte gespeichert. Öffne einen Materialrechner, berechne Mengen und speichere die Kalkulation.</p></div>'}<p class="muted">Die Differenz ist kein tatsächlicher Gewinn: Gemeinkosten, Arbeitszeiten, Steuern, Risiko und sonstige Aufwände müssen vollständig kalkuliert werden. Preise werden von dir eingetragen; es werden keine Händlerpreise abgerufen.</p>`;}
function customBuilder(){return `<div class="heading"><div><small>DEIN EIGENES WERKZEUG</small><h2>Materialrechner erstellen</h2><p class="muted">Lege Material, Berechnungsbasis und Verbrauch je Einheit fest. Keine Programmierung nötig.</p></div></div><div class="notice-panel">Formel: <b>Grundmenge × Verbrauchsfaktor × (1 + Reserve / 100)</b>. Die Grundmenge ergibt sich aus Länge, Fläche, Volumen oder Stückzahl.</div>
 <form class="panel form" data-form="custom-calculator">${field('name','Name des Rechners','text','maxlength="60" placeholder="z. B. Kalksandstein-Kleber"')}${options('trade','Gewerk',TRADES.filter(t=>tradesOf().includes(t.id)).map(t=>[t.id,t.name]).length?TRADES.filter(t=>tradesOf().includes(t.id)).map(t=>[t.id,t.name]):TRADES.map(t=>[t.id,t.name]))}${options('basis','Berechnungsbasis',[['area','Fläche: Länge × Höhe minus Öffnungen (m²)'],['length','Länge (m)'],['volume','Volumen: Länge × Breite × Höhe (m³)'],['count','Anzahl (Stk)']])}${field('materialName','Materialbezeichnung','text','maxlength="60" placeholder="z. B. Klebemörtel"')}${options('unit','Materialeinheit',MATERIAL_UNITS.map(x=>[x,x]))}${field('factor','Material je Einheit der Berechnungsbasis','number','min="0.000001" step="any" value="1"')}${field('waste','Standard-Reserve (%)','number','min="0" max="100" step="0.1" value="5"')}<label class="custom-check"><input name="roundWhole" type="checkbox" value="yes"> Ergebnis auf ganze Einheiten aufrunden</label><label class="wide">Hinweis (optional)<input name="note" maxlength="160" placeholder="z. B. Verbrauch laut Datenblatt"></label><button class="primary wide" type="submit">Eigenen Rechner speichern</button></form>
 ${customOf().length?`<div class="panel"><h3>Gespeicherte eigene Rechner</h3>${customOf().map(c=>`<div class="item row"><div><b>${esc(c.name)}</b><p class="muted">${esc(c.materialName)} · ${esc(tradeName(c.trade))}</p></div><button data-delete-custom="${esc(c.id)}">Löschen</button></div>`).join('')}</div>`:''}`}
function saveCustomCalculator(form){const x=Object.fromEntries(new FormData(form).entries()),name=String(x.name||'').trim(),materialName=String(x.materialName||'').trim(),factor=Number(x.factor),waste=Number(x.waste);
 if(!name||name.length>60||!materialName||materialName.length>60||!TRADE_IDS.has(x.trade)||!['length','area','volume','count'].includes(x.basis)||!MATERIAL_UNITS.includes(x.unit)||!(factor>0)||factor>1e7||!Number.isFinite(factor)||!Number.isFinite(waste)||waste<0||waste>100)return alert('Bitte die Angaben zum eigenen Rechner prüfen.');
 const h=household();if(!Array.isArray(h.customCalculators))h.customCalculators=[];if(h.customCalculators.length>=100)return alert('Maximal 100 eigene Rechner pro Firma.');
 const c={id:uid(),name,trade:x.trade,basis:x.basis,materialName,unit:x.unit,factor,waste,roundWhole:x.roundWhole==='yes',note:String(x.note||'').trim().slice(0,160)};
 h.customCalculators.push(c);if(!save()){h.customCalculators.pop();return}selectedTrade=x.trade;selectedCalculator='custom:'+c.id;setView('calculator');}


function loadWorkspace(){try{const raw=localStorage.getItem(KEY);if(raw){const v=JSON.parse(raw);if(validWorkspace(v))return v;throw Error('Invalid workspace')}}catch(e){console.error('Budget Studio: Sicherung unlesbar',e);return null}
let old;try{old=normalizeData(JSON.parse(localStorage.getItem(LEGACY_KEY)))}catch{}return {version:2,activeId:null,households:[{id:uid(),name:'Mein Haushalt',kind:'personal',members:[],data:old||blank()}]}}
// An existing 0.6 workspace means the first household selection has already been completed.
// On an upgrade from 0.5 (no v2 key), show the selection once to confirm the migrated household.
let hasSavedWorkspace=false;
try{hasSavedWorkspace=localStorage.getItem(KEY)!==null}catch{}
let firstSetupPending=false;try{firstSetupPending=!hasSavedWorkspace&&!localStorage.getItem(LEGACY_KEY)}catch{}
let workspace=loadWorkspace(),storageLocked=!workspace;
if(!workspace)workspace={version:2,activeId:null,households:[{id:uid(),name:'Wiederherstellung erforderlich',kind:'personal',members:[],data:blank()}]};
if(!workspace.activeId||!workspace.households.some(h=>h.id===workspace.activeId))workspace.activeId=workspace.households[0].id;
let bankImportDraft=null, editingTxId=null, reconcileAccountId=null;
let state=workspace.households.find(h=>h.id===workspace.activeId).data,view='dashboard',selectedMonth=dateToday().slice(0,7),choosing=storageLocked||!hasSavedWorkspace||workspace.households.length>1;
const app=document.querySelector('#app'),picker=document.querySelector('#household-screen');
function preferredMonth(){const now=dateToday().slice(0,7);if(state.transactions.some(t=>t.date.slice(0,7)===now))return now;return state.transactions.map(t=>t.date.slice(0,7)).filter(x=>/^\d{4}-(0[1-9]|1[0-2])$/.test(x)).sort().at(-1)||now}
selectedMonth=preferredMonth();
function household(){return workspace.households.find(h=>h.id===workspace.activeId)}
const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=(arr,fn)=>arr.reduce((a,x)=>a+fn(x),0);const money=x=>Number.isFinite(Number(x))?Number(x):0;
const round2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function businessHousehold(){return household()?.kind==='business'}
function calculateTax(value,mode,rate){const input=round2(value),r=Number(rate);if(!(input>0)||!['gross','net'].includes(mode)||![0,7,19].includes(r))return null;const gross=mode==='gross'?input:round2(input*(1+r/100));const net=mode==='net'?input:round2(gross/(1+r/100));return {net,gross,vat:round2(gross-net),rate:r,mode}}

function save(){if(storageLocked){alert('Der Datenspeicher konnte nicht gelesen werden. Bitte zunächst Browserdaten sichern und prüfen.');return false}try{localStorage.setItem(KEY,JSON.stringify(workspace));return true}catch(e){alert('Speichern nicht möglich (Speicherplatz?). Bitte Datensicherung erstellen.');return false}}
function nameOfHousehold(){return household()?.name||'Mein Haushalt'}
function householdPicker(){
 document.body.classList.toggle('choosing-household',choosing);
 if(!choosing){picker.hidden=true;return}
 picker.hidden=false;
 picker.innerHTML=`<div class="picker-inner"><div class="picker-logo">◈</div><small>DEINE FINANZEN. DEIN PLAN.</small><h1>Budget Studio</h1><p class="muted">Willkommen zurück! Wähle deinen Haushalt.</p>${storageLocked?'<div class="picker-warning">Achtung: Gespeicherte Haushaltsdaten sind beschädigt. Keine neuen Daten erfassen. Bitte Sicherung wiederherstellen.</div>':''}<div class="household-choices">${workspace.households.map(h=>`<button class="household-choice" data-select-household="${esc(h.id)}"><span class="household-avatar">${h.kind==='business'?'▤':h.kind==='shared'?'⌂':'◉'}</span><span class="choice-detail"><strong>${esc(h.name)}</strong><small>${h.kind==='business'?'Geschäft / Firma':h.kind==='shared'?'Gemeinsamer Haushalt':'Privater Haushalt'}</small></span><span class="choice-chevron">›</span></button>`).join('')}</div><form id="create-household" class="create-household"><label>Neuer Haushalt <input name="name" maxlength="60" placeholder="z. B. Familie" required></label><label>Art <select name="kind"><option value="shared">Gemeinsam</option><option value="personal">Privat</option><option value="business">Geschäft / Firma</option></select></label><fieldset class="picker-trades" id="picker-trades" hidden><legend>Gewerke auswählen (mehrere möglich)</legend><div class="picker-trade-grid">${tradeCheckboxes()}</div></fieldset><button class="primary" type="submit">＋ Haushalt erstellen</button></form><p class="picker-footnote">Alle Haushalte werden nur auf diesem Gerät gespeichert. Keine Cloud-Synchronisierung.</p></div>`;
}
function openPicker(){choosing=true;householdPicker()}
function resumeSingleHousehold(){
 bankImportDraft=null;
 if(storageLocked||workspace.households.length!==1){openPicker();return}
 workspace.activeId=workspace.households[0].id;
 state=household().data;selectedMonth=preferredMonth();
 choosing=false;view='dashboard';
 applyRecurring();householdPicker();render();
}
function selectHousehold(id){bankImportDraft=null;editingTxId=null;reconcileAccountId=null;selectedTrade=null;selectedCalculator=null;pendingCalc=null;const h=workspace.households.find(x=>x.id===id);if(!h)return;firstSetupPending=false;workspace.activeId=id;state=h.data;selectedMonth=preferredMonth();save();applyRecurring();choosing=false;view='dashboard';householdPicker();render()}

function setView(v){if(v!=='calculator')pendingCalc=null;if(!['dashboard','transactions','accounts','planning','more','goals','debts','subscriptions','recurring','payments','calendar','settings','bankImport','subscriptionFinder','financePlanning','transactionEdit','reconcile','trades','calculators','calculator','customBuilder','estimates'].includes(v))return;view=v;render()}
const CATEGORY_SUGGESTIONS=['Lebensmittel','Wohnen / Miete','Strom / Gas','Internet / Mobilfunk','Versicherungen','Auto / Tanken','ÖPNV','Gesundheit','Kinder / Familie','Shopping','Freizeit','Restaurant / Lieferdienst','Abonnements','Gehalt / Lohn','Weitere Einnahmen','Überweisung','Sparen / Rücklage','Gebühren','Sonstiges','Unkategorisiert'];
function categoryDatalist(){return `<datalist id="category-suggestions">${CATEGORY_SUGGESTIONS.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>`}
function importGroups(){const m=new Map();for(const t of state.transactions){if(!['document','csv'].includes(t.importedFrom))continue;const batch=t.importBatch||'legacy:'+t.importedFrom+':'+t.accountId;const key=batch+'|'+t.accountId;let g=m.get(key);if(!g){g={key,batch,accountId:t.accountId,source:t.importedFrom,count:0,income:0,expense:0,filename:t.importFileName||'',legacy:!t.importBatch};m.set(key,g)}g.count++;if(t.type==='income')g.income+=money(t.amount);else g.expense+=money(t.amount)}return [...m.values()].reverse()}
function accountBalance(id){return money(state.accounts.find(a=>a.id===id)?.opening)+sum(state.transactions.filter(t=>t.accountId===id),t=>t.type==='income'?money(t.amount):-money(t.amount))}
function form(fields,type,label){return `<form class="panel form" data-form="${type}">${fields}<button class="primary wide" type="submit">${label}</button></form>`}
const field=(name,label,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" ${extra} required></label>`;
const options=(name,label,items)=>`<label>${label}<select name="${name}">${items.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></label>`;
function list(arr,fn){return `<div class="panel">${arr.length?arr.map(fn).join(''):'<p class="muted">Noch keine Einträge vorhanden.</p>'}</div>`}
function removeButton(type,id){return `<button data-delete="${type}" data-id="${esc(id)}" aria-label="Eintrag löschen">Löschen</button>`}
function dashboard(){
if(businessHousehold())return businessDashboard();
const month=selectedMonth,tx=state.transactions.filter(t=>t.date.slice(0,7)===month),income=sum(tx.filter(t=>t.type==='income'),t=>money(t.amount)),expense=sum(tx.filter(t=>t.type==='expense'),t=>money(t.amount)),balance=sum(state.accounts,a=>accountBalance(a.id));
const byCat={};tx.filter(t=>t.type==='expense').forEach(t=>byCat[t.category]=(byCat[t.category]||0)+money(t.amount));
const classified=tx.filter(t=>Number.isFinite(t.netAmount)&&Number.isFinite(t.vatAmount)&&[0,7,19].includes(t.vatRate));
const taxSales=classified.filter(t=>t.type==='income'),taxPurchases=classified.filter(t=>t.type==='expense');
const businessPanel=businessHousehold()?`<div class="panel business-summary"><h3>Geschäftliche Netto-/Brutto-Übersicht</h3><p class="muted">Nur Buchungen mit erfasster Steueraufteilung · ${esc(month)}</p><div class="tax-summary-grid"><div><small>Netto-Einnahmen</small><strong>${eur(sum(taxSales,t=>t.netAmount))}</strong></div><div><small>Netto-Ausgaben</small><strong>${eur(sum(taxPurchases,t=>t.netAmount))}</strong></div><div><small>USt auf Einnahmen</small><strong>${eur(sum(taxSales,t=>t.vatAmount))}</strong></div><div><small>Steueranteil in Ausgaben</small><strong>${eur(sum(taxPurchases,t=>t.vatAmount))}</strong></div></div><p class="muted">${tx.length-classified.length} Buchung(en) ohne Steueraufteilung. Steueranteile sind nur rechnerisch – keine Aussage zur tatsächlichen Umsatzsteuerpflicht oder Vorsteuerabzugsberechtigung.</p></div>`:'';
const total=sum(Object.values(byCat),v=>v);const savingsRate=income>0?Math.round(Math.max(0,(income-expense)/income)*100):0;let cursor=new Date(month+'-01T12:00:00');const history=[];
for(let i=5;i>=0;i--){let d=new Date(cursor.getFullYear(),cursor.getMonth()-i,1),key=d.toLocaleDateString('sv-SE').slice(0,7),entries=state.transactions.filter(t=>t.date.slice(0,7)===key);history.push({label:d.toLocaleDateString('de-DE',{month:'short'}),income:sum(entries.filter(t=>t.type==='income'),t=>money(t.amount)),expense:sum(entries.filter(t=>t.type==='expense'),t=>money(t.amount))})}
const max=Math.max(1,...history.flatMap(h=>[h.income,h.expense]));
return `<div class="heading"><div><small>${esc(nameOfHousehold().toUpperCase())}</small><h2>Dein Dashboard <span class="heading-sparkle">✦</span></h2><p class="muted">Alles Wichtige auf einen Blick.</p></div><label class="month-label">Monat <input id="month-select" type="month" value="${month}"></label></div>
 ${state.transactions.filter(t=>t.importedFrom==='document').length>=5&&!state.transactions.some(t=>t.importedFrom==='document'&&t.type==='income')?'<div class="import-danger"><b>⚠ PDF-Buchungen ohne Einnahmen</b><p>Der Import könnte Gutschriften ausgelassen haben. Ausgaben und Kontostand können falsch sein! <button class="small-action" data-open-view="transactions">Buchungen prüfen</button></p></div>':''}
 <div class="grid"><div class="panel metric hero-metric"><span>VERFÜGBARES VERMÖGEN</span><strong>${eur(balance)}</strong><div class="hero-foot">Alle Konten zusammen <span>↗</span></div></div><div class="panel metric income-metric"><span>↙ Einnahmen</span><strong>${eur(income)}</strong></div><div class="panel metric expense-metric"><span>↗ Ausgaben</span><strong>${eur(expense)}</strong></div><div class="panel metric surplus-metric"><span>Monatsüberschuss</span><strong class="${income-expense<0?'negative':'positive'}">${eur(income-expense)}</strong><div class="metric-note">${income>0?`${savingsRate}% vom Einkommen übrig`:"Noch keine Einnahmen"}</div></div></div>
${businessPanel}
${state.transactions.some(t=>t.importedFrom)?`<div class="notice-panel"><b>PDF-/Kontoauszug-Import:</b> Monatliche Auswertungen zeigen nur den oben gewählten Monat <b>${esc(selectedMonth)}</b>. Der angezeigte Kontostand ist Anfangsbestand plus alle erfassten Buchungen. Wenn Buchungen oder der richtige Anfangsbestand fehlen, ist er kein verlässlicher Banksaldo. <button class="small-action" data-open-view="transactions">Importierte Buchungen prüfen</button></div>`:''}
 <div class="section-title"><h3>Deine Auswertung</h3><span>LIVE</span></div>
<div class="panel chart-panel"><h3>Entwicklung der letzten 6 Monate</h3><div class="trend">${history.map(h=>`<div class="trend-col"><div class="trend-bars"><span title="Einnahmen ${eur(h.income)}" style="height:${Math.max(2,100*h.income/max)}%;background:var(--accent)"></span><span title="Ausgaben ${eur(h.expense)}" style="height:${Math.max(2,100*h.expense/max)}%;background:var(--warn)"></span></div><small>${h.label}</small></div>`).join('')}</div><p class="muted">■ Einnahmen (Akzentfarbe) &nbsp; ■ Ausgaben (Koralle). Nur erfasste Buchungen.</p></div>
<div class="panel chart-panel"><h3>Ausgaben nach Kategorie</h3><div class="category-layout"><div class="donut" style="--donut:${total>0?'conic-gradient('+Object.values(byCat).map((v,i,arr)=>{let start=sum(arr.slice(0,i),x=>x)/total*100,end=start+v/total*100;return `var(--chart${i%6}) ${start}% ${end}%`}).join(',')+')':'var(--soft) 0 100%'}"><div><small>Ausgaben</small><strong>${eur(total)}</strong></div></div><div class="category-list">${Object.entries(byCat).map(([k,v],i)=>`<div class="row"><span><i class="dot" style="background:var(--chart${i%6})"></i>${esc(k)}</span><b>${eur(v)}</b></div>`).join('')||'<p class="muted">Noch keine Ausgaben in diesem Monat.</p>'}</div></div></div>
<p class="muted">Kontostände berücksichtigen alle Buchungen. Sparziele, Schulden und Abos sind separate manuelle Tracker.</p>`}
function transactionEdit(){
 const t=state.transactions.find(x=>x.id===editingTxId);if(!t)return `<div class="panel">Buchung nicht gefunden. <button data-open-view="transactions">Zurück</button></div>`;
 const opts=(name,current,choices)=>`<label>${name}<select name="${name==='Art'?'type':'accountId'}">${choices.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
 return `<button class="planning-back" data-open-view="transactions">‹ Zurück zu Buchungen</button><h2>Buchung bearbeiten</h2><div class="notice-panel">${t.importedFrom?'Diese Buchung wurde aus einem Kontoauszug übernommen. Änderungen werden im Dashboard und im Kontostand berücksichtigt. Der ursprüngliche Import-Schlüssel bleibt zur Vermeidung von Doppelimporten erhalten.':'Hier kannst du Datum, Betrag, Kategorie und Zuordnung ändern.'}</div>
 <form class="panel form" data-form="edit-transaction">
 ${opts('Art',t.type,[['income','Einnahme'],['expense','Ausgabe']])}
 <label>Betrag (€)<input name="amount" type="number" min="0.01" step="0.01" value="${money(t.amount)}" required></label>
 <label>Datum<input name="date" type="date" value="${esc(t.date)}" required></label>
 <label>Kategorie<input name="category" maxlength="60" list="category-suggestions" value="${esc(t.category||'Unkategorisiert')}" required></label>${categoryDatalist()}
 ${opts('Konto',t.accountId,state.accounts.map(a=>[a.id,a.name]))}
 <label>Beschreibung<input name="note" maxlength="120" value="${esc(t.note||'')}" required></label>
 <button type="submit" class="primary wide">Änderungen speichern</button></form>${businessHousehold()&&Number.isFinite(t.netAmount)?'<p class="muted">Bei einer Änderung eines Geschäftsbetrags wird die alte Steueraufteilung entfernt. Bitte danach neu prüfen.</p>':''}`;
}
function transactions(){
 const vat=businessHousehold()?`<div class="tax-heading">Steueraufteilung für Geschäftsbuchungen</div>${options('entryMode','Eingegebener Betrag ist',[['gross','Brutto (inkl. USt)'],['net','Netto (ohne USt)']])}${options('vatRate','Umsatzsteuersatz',[['19','19 %'],['7','7 %'],['0','0 %']])}<div id="tax-preview" class="tax-preview" aria-live="polite">Netto, Steueranteil und Brutto werden bei Eingabe berechnet.</div>`:'';
 const tx=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
 const imported=tx.filter(t=>t.importedFrom).length;
 const documents=tx.filter(t=>t.importedFrom==='document');const potentialMissing=documents.length>=5&&!documents.some(t=>t.type==='income');
 return `<h2>Buchungen</h2>${potentialMissing?'<div class="import-danger"><b>⚠ PDF-Import: Keine Einnahmen erkannt!</b><p>Mindestens fünf PDF-/Foto-Buchungen wurden importiert, aber keine als Einnahme. Prüfe dein Original und korrigiere fehlende Gutschriften. Du kannst den Import unter Konten → Kontoauszug importieren zurücknehmen.</p></div>':''}${imported?`<div class="notice-panel">${imported} importierte Bankbuchung(en) vorhanden. <b>Bei PDF-Importen bitte fehlende Gutschriften und Kategorien prüfen.</b> Nur Buchungen aus dem ausgewählten Monat erscheinen in den Monatsdiagrammen. <button data-open-view="dashboard" class="small-action">Dashboard ansehen</button></div>`:''}${businessHousehold()?'<p class="muted">Geschäftsbuchungen: Für eine neue Buchung kann Netto oder Brutto gewählt werden.</p>':''}
 ${form(options('type','Art',[['expense','Ausgabe'],['income','Einnahme']])+field('amount','Betrag (€)','number','min="0.01" step="0.01"')+vat+field('date','Datum','date',`value="${dateToday()}"`)+`<label>Kategorie<input name="category" maxlength="60" list="category-suggestions" required></label>`+categoryDatalist()+options('accountId','Konto',state.accounts.map(a=>[a.id,a.name]))+field('note','Beschreibung','text','maxlength="120"'),'transactions','Buchung hinzufügen')}
 <div class="panel tx-filter-panel"><label>Buchungen durchsuchen<input id="tx-filter" type="search" placeholder="z. B. Miete, Lohn, Händler, Kategorie" aria-label="Buchungen durchsuchen"></label><span class="muted" id="tx-filter-count">${tx.length} Buchung(en)</span></div>
 ${list(tx,t=>`<div class="item transaction-entry" data-tx-entry data-search="${esc((t.category+' '+t.note+' '+(t.merchant||'')+' '+t.date+' '+(state.accounts.find(a=>a.id===t.accountId)?.name||'')).toLowerCase())}"><div class="row"><div><b>${esc(t.category||'Unkategorisiert')}</b><div class="muted">${esc(t.date)} · ${esc(t.note)} · ${esc(state.accounts.find(a=>a.id===t.accountId)?.name||'Gelöschtes Konto')}</div>${t.importedFrom?`<small class="tx-origin">Kontoauszug${t.corrected?' · nachbearbeitet':' · bitte prüfen'}</small>`:''}${businessHousehold()?`<div class="muted tax-line">${Number.isFinite(t.netAmount)&&Number.isFinite(t.vatAmount)?`Netto ${eur(t.netAmount)} · USt ${t.vatRate}%: ${eur(t.vatAmount)} · Brutto ${eur(t.amount)}`:'Steueraufteilung nicht hinterlegt'}</div>`:''}</div><b class="${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'−'}${eur(t.amount)}</b></div><div class="tx-actions"><button type="button" class="small-action" data-edit-tx="${esc(t.id)}">Bearbeiten / Kategorie</button>${removeButton('transactions',t.id)}</div></div>`)}`;
}

function accounts(){return `<h2>Konten</h2><div class="panel bank-info"><b>Bankkonten &amp; Kreditkarten</b><p class="muted">Bankbewegungen kommen aus importierten Kontoauszügen. Prüfe Einnahmen, Ausgaben und den Anfangssaldo, bevor du dem Kontostand vertraust.</p><button data-open-view="bankImport" class="primary" type="button">Kontoauszug importieren</button></div><div class="notice-panel"><b>Warum kann ein Konto negativ sein?</b> Wenn die App bei 0 € beginnt, der Bankauszug aber erst später einsetzt, fehlen der tatsächliche Anfangsbestand und vielleicht ältere Eingänge. Das ist nicht automatisch dein echter Kontostand. <b>Fehlende Buchungen zuerst korrigieren!</b></div>${form(field('name','Kontoname','text','maxlength="60"')+field('opening','Anfangsbestand (€)','number','step="0.01" value="0"'),'accounts','Konto hinzufügen')}${list(state.accounts,a=>`<div class="item account-line"><div class="row"><div><b>${esc(a.name)}</b><div class="muted">Anfangsbestand ${eur(a.opening)} · ${state.transactions.filter(t=>t.accountId===a.id).length} Buchungen</div></div><b>${eur(accountBalance(a.id))}</b></div><div class="tx-actions"><button class="small-action" data-reconcile-account="${esc(a.id)}">Kontostand abgleichen</button>${state.accounts.length>1?removeButton('accounts',a.id):''}</div></div>`)}`}
function reconcile(){const a=state.accounts.find(x=>x.id===reconcileAccountId);if(!a)return '<p>Konto nicht gefunden.</p>';
 const movements=sum(state.transactions.filter(t=>t.accountId===a.id),t=>t.type==='income'?money(t.amount):-money(t.amount));
 return `<button class="planning-back" data-open-view="accounts">‹ Zurück zu Konten</button><h2>Kontostand abgleichen</h2><div class="panel stack"><b>${esc(a.name)}</b><div class="bank-statement-status">Anfangsbestand: ${eur(a.opening)} · Buchungssaldo: ${eur(movements)}<br><b>Derzeit berechnet: ${eur(accountBalance(a.id))}</b></div><div class="import-danger"><b>Nur nach Kontrolle der Buchungen!</b><p>Wenn Einnahmen durch den PDF-Import fehlen, behebt ein künstlich korrigierter Anfangsbestand NICHT die fehlenden Buchungen. Ergänze zunächst alle fehlenden Ein- und Ausgänge. Der Abgleich verändert den Anfangsbestand rückwirkend, damit der angegebene aktuelle Kontostand herauskommt.</p></div></div>
 <form class="panel form" data-form="reconcile"><label>Aktueller Kontostand laut Bank (€)<input name="balance" type="number" step="0.01" required></label><button class="primary wide" type="submit">Anfangsbestand rechnerisch anpassen</button></form>`}

function goals(){return `<h2>Sparziele</h2>${form(field('name','Sparziel','text','maxlength="60"')+field('target','Zielbetrag (€)','number','min="0.01" step="0.01"')+field('saved','Bereits gespart (€)','number','min="0" step="0.01" value="0"'),'goals','Sparziel hinzufügen')}${list(state.goals,g=>{const p=Math.min(100,Math.max(0,100*money(g.saved)/money(g.target)));return `<div class="item"><div class="row"><b>${esc(g.name)}</b>${removeButton('goals',g.id)}</div><p>${eur(g.saved)} von ${eur(g.target)} · ${p.toFixed(0)} %</p><div class="bar"><div style="width:${p}%"></div></div></div>`})}<p class="muted">Sparziele werden vorerst manuell gepflegt und nicht automatisch vom Kontostand abgezogen.</p>`}
function debts(){return `<h2>Schulden</h2>${form(field('name','Bezeichnung','text','maxlength="60"')+field('balance','Restschuld (€)','number','min="0" step="0.01"')+field('payment','Monatliche Rate (€)','number','min="0" step="0.01"'),'debts','Schuld hinzufügen')}${list(state.debts,d=>`<div class="item row"><div><b>${esc(d.name)}</b><div class="muted">Monatliche Rate ${eur(d.payment)}</div></div><div><b>${eur(d.balance)}</b> ${removeButton('debts',d.id)}</div></div>`)}<p class="muted">Raten und Restschuld werden vorerst manuell gepflegt; keine Zinsberechnung.</p>`}
function subscriptions(){return `<h2>Abonnements</h2>${form(field('name','Abo-Name','text','maxlength="60"')+field('amount','Betrag je Zahlung (€)','number','min="0.01" step="0.01"')+options('frequency','Zahlungsintervall',[['monthly','Monatlich'],['yearly','Jährlich']]),'subscriptions','Abo hinzufügen')}${list(state.subscriptions,s=>`<div class="item row"><div><b>${esc(s.name)}</b><div class="muted">${s.frequency==='yearly'?'Jährlich':'Monatlich'} · Jahreskosten ${eur(money(s.amount)*(s.frequency==='yearly'?1:12))}</div></div><div><b>${eur(s.amount)}</b> ${removeButton('subscriptions',s.id)}</div></div>`)}<p class="muted">Abos werden nicht automatisch als Buchung eingetragen.</p>`}
function nextRecurringDate(r,from){
 const [y,m]=from.split('-').map(Number),day=Number(r.anchorDay)||Number(from.slice(8));
 if(r.frequency==='monthly'){const first=new Date(Date.UTC(y,m,1));const year=first.getUTCFullYear(),month=first.getUTCMonth()+1;const last=new Date(Date.UTC(year,month,0)).getUTCDate();return `${year}-${String(month).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`}
 const year=y+1,month=Number(r.anchorMonth)||m,last=new Date(Date.UTC(year,month,0)).getUTCDate();return `${year}-${String(month).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`;
}
function applyRecurring(){
 const today=dateToday();let changed=false,created=0;
 for(const r of state.recurring||[]){if(!isDate(r.nextDate)||!state.accounts.some(a=>a.id===r.accountId))continue;
 let guard=0;
 while(r.nextDate<=today&&guard++<240){const due=r.nextDate;if(!state.transactions.some(t=>t.recurringId===r.id&&t.occurrenceDate===due)){
 state.transactions.push({id:uid(),type:r.type,amount:r.amount,date:due,category:r.category,accountId:r.accountId,note:`Automatisch: ${r.name}`,recurringId:r.id,occurrenceDate:due});created++}
 const next=nextRecurringDate(r,due);if(next<=due)break;r.nextDate=next;changed=true;
 }}if(changed){if(!save())alert('Wiederkehrende Buchungen wurden nicht dauerhaft gespeichert. Bitte Speicherplatz kontrollieren.')}return created;
}
function recurring(){const items=state.recurring||[];
return `<h2>Wiederkehrende Zahlungen</h2><p class="muted">Einmal einrichten: Fällige Einnahmen und Ausgaben werden beim nächsten Öffnen dieses Haushalts automatisch gebucht – auch offline.</p>${form(field('name','Name','text','maxlength="60"')+options('type','Art',[['expense','Ausgabe'],['income','Einnahme']])+field('amount','Betrag (€)','number','min="0.01" step="0.01"')+field('category','Kategorie','text','maxlength="60"')+options('accountId','Konto',state.accounts.map(a=>[a.id,a.name]))+options('frequency','Intervall',[['monthly','Monatlich'],['yearly','Jährlich']])+field('nextDate','Erste Fälligkeit','date',`value="${dateToday()}"`),'recurring','Wiederkehrende Zahlung anlegen')}${list(items,r=>`<div class="item row"><div><b>${esc(r.name)}</b><div class="muted">${r.type==='income'?'Einnahme':'Ausgabe'} · ${r.frequency==='monthly'?'Monatlich':'Jährlich'} · nächste Fälligkeit: ${esc(r.nextDate)} · ${esc(state.accounts.find(a=>a.id===r.accountId)?.name||'Konto fehlt')}</div></div><div><b>${eur(r.amount)}</b> ${removeButton('recurring',r.id)}</div></div>`)}<p class="muted">Erstellen mit einem Datum in der Vergangenheit bucht die bisher fälligen Termine nach. Bereits gebuchte Beträge bleiben nach dem Löschen einer Regel erhalten. Maximal 240 Nachbuchungen pro Regel und Öffnung.</p>`}
function payments(){
 const abo=subscriptions().replace('<h2>Abonnements</h2>','<h3>Abos und erkannte Verträge</h3>');
 const fixed=recurring().replace('<h2>Wiederkehrende Zahlungen</h2>','<h3>Automatische Fixkosten und Einnahmen</h3>');
 return `<div class="heading"><div><small>ALLE REGELMÄSSIGEN KOSTEN</small><h2>Abos &amp; Fixkosten</h2><p class="muted">Behalte Verträge und automatische Zahlungen gemeinsam im Blick.</p></div></div><div class="notice-panel"><b>Wichtig:</b> Ein Abo ist nur eine Kostenübersicht. Für eine automatische Buchung musst du die Zahlung bei Fixkosten eintragen. Erkannte Abos sind zunächst nur eine Übersicht und erzeugen keine zusätzlichen Kontobuchungen. Bei laufendem Kontoauszug-Import bitte dieselbe Abbuchung nicht nochmals als automatische Fixkosten buchen.</div>${fixed}<div class="subsection-separator"></div>${abo}`;
}
function planning(){return businessHousehold()?toolsHub():financePlanning()}
function financePlanning(){return `<div class="heading"><div><small>DEINE FINANZPLANUNG</small><h2>Planung</h2><p class="muted">Alles Wichtige für deine nächsten Monate.</p></div></div><div class="feature-grid"><button class="feature-link" data-open-view="subscriptionFinder"><span class="feature-icon">✦</span><span><b>Abos automatisch erkennen</b><small>Regelmäßige Abbuchungen analysieren</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="bankImport"><span class="feature-icon">⇩</span><span><b>Kontoauszug importieren</b><small>CSV oder PDF von Girokonto oder Kreditkarte</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="payments"><span class="feature-icon">↻</span><span><b>Abos &amp; Fixkosten</b><small>Regelmäßige Zahlungen zentral</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="calendar"><span class="feature-icon">▦</span><span><b>Finanzkalender</b><small>Zahlungen &amp; Fälligkeiten</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="goals"><span class="feature-icon">◎</span><span><b>Sparziele</b><small>Deine Ziele im Blick</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="debts"><span class="feature-icon">▤</span><span><b>Schulden</b><small>Raten und Restschulden</small></span><span class="feature-arrow">›</span></button></div>`}
function more(){return `<div class="heading"><div><small>DEIN BUDGET STUDIO</small><h2>Mehr</h2><p class="muted">Verwalte deine Haushalte und Daten.</p></div></div><div class="feature-grid"><button class="feature-link" data-open-view="settings"><span class="feature-icon">⚙</span><span><b>Daten &amp; Einstellungen</b><small>Haushalte, Sicherungen, Design</small></span><span class="feature-arrow">›</span></button><button class="feature-link" data-open-view="${businessHousehold()?'financePlanning':'planning'}"><span class="feature-icon">▦</span><span><b>${businessHousehold()?'Finanzplanung':'Planung'}</b><small>Fixkosten, Kalender, Ziele</small></span><span class="feature-arrow">›</span></button></div>${businessHousehold()?`<div class="feature-grid"><button class="feature-link" data-open-view="planning"><span class="feature-icon">▥</span><span><b>Gewerke &amp; Material</b><small>Rechner und Projekte</small></span><span class="feature-arrow">›</span></button></div><div class="panel"><b>Netto &amp; Brutto</b><p class="muted">Für Buchungen im Geschäftshaushalt kannst du Netto/Brutto und 0 %, 7 % oder 19 % auswählen. Die Monatsübersicht zeigt rechnerische Steueranteile.</p></div>`: ''}<div class="panel bank-info"><b>Bank &amp; Abo-Erkennung</b><p class="muted">CSV-, PDF- und Bild-Kontoauszüge können geprüft und importiert werden. Eine echte Bankverbindung benötigt einen Open-Banking-Dienst und einen geschützten Server. Aktuell werden keine Umsätze automatisch abgerufen.</p><button type="button" data-open-view="bankImport">Kontoauszug importieren</button></div>`}
function planningBack(){return `<button class="planning-back" data-open-view="${businessHousehold()?'financePlanning':'planning'}">‹ Zur Finanzplanung</button>`}
function calendar(){const m=selectedMonth,actual=state.transactions.filter(t=>t.date.slice(0,7)===m),future=[];const end=m+'-31';
 for(const r of state.recurring||[]){let date=r.nextDate,guard=0;while(isDate(date)&&date<=end&&guard++<36){if(date.slice(0,7)===m)future.push({date,name:r.name,type:r.type,amount:r.amount});const next=nextRecurringDate(r,date);if(next<=date)break;date=next;}}
 const actualIn=sum(actual.filter(t=>t.type==='income'),t=>money(t.amount)),actualOut=sum(actual.filter(t=>t.type==='expense'),t=>money(t.amount));
 const days=[...new Set([...actual.map(t=>t.date),...future.map(t=>t.date)])].sort();
 return `<div class="heading"><div><small>ALLE ZAHLUNGEN IM BLICK</small><h2>Finanzkalender</h2><p class="muted">Erfasste Buchungen und künftige Fälligkeiten.</p></div><label class="month-label">Monat <input id="month-select" type="month" value="${m}"></label></div><div class="calendar-stats"><div class="panel"><small>Gebuchte Einnahmen</small><strong class="positive">${eur(actualIn)}</strong></div><div class="panel"><small>Gebuchte Ausgaben</small><strong class="negative">${eur(actualOut)}</strong></div></div><div class="panel"><h3>Termine im ${esc(new Date(m+'-01T12:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'}))}</h3>${days.length?days.map(day=>`<div class="calendar-day"><div class="calendar-date">${esc(new Date(day+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'long'}))}</div>${actual.filter(t=>t.date===day).map(t=>`<div class="calendar-event"><span>${esc(t.recurringId&&t.note?.startsWith('Automatisch: ')?t.note.slice(13):t.category)} <small>Gebucht</small></span><b class="${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'−'}${eur(t.amount)}</b></div>`).join('')}${future.filter(t=>t.date===day).map(t=>`<div class="calendar-event planned"><span>${esc(t.name)} <small>Geplant</small></span><b class="${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'−'}${eur(t.amount)}</b></div>`).join('')}</div>`).join(''):'<p class="muted">Keine Buchungen oder anstehenden Zahlungen in diesem Monat.</p>'}</div><p class="muted">Geplante Zahlungen werden zum Fälligkeitstag beim Öffnen des jeweiligen Haushalts automatisch gebucht. Der Kalender zeigt keine Bankdaten.</p>`}
function householdSettings(){const h=household();return `<div class="panel stack"><h3>Haushalt verwalten</h3><p><b>${esc(h.name)}</b> · ${h.kind==='business'?'Geschäftlicher':h.kind==='shared'?'Gemeinsamer':'Privater'} Haushalt</p><div class="settings-actions"><button id="rename-household">Umbenennen</button><button id="choose-household">Haushalt wechseln</button><button id="delete-household">Haushalt löschen</button></div><p class="muted">Ein Haushalt umfasst eigene Konten, Buchungen, Sparziele, Schulden, Abos und Zahlungsvorlagen. Mehrere Geräte werden derzeit nicht synchronisiert.</p></div>`}
function validBusinessMeta(h){
 if(h.trades!==undefined&&(!Array.isArray(h.trades)||h.trades.length>10||!h.trades.every(id=>TRADE_IDS.has(id))||new Set(h.trades).size!==h.trades.length))return false;
 if(h.customCalculators!==undefined){if(!Array.isArray(h.customCalculators)||h.customCalculators.length>100)return false;for(const c of h.customCalculators){if(!c||typeof c.id!=='string'||c.id.length>100||typeof c.name!=='string'||c.name.length>60||typeof c.materialName!=='string'||c.materialName.length>60||!TRADE_IDS.has(c.trade)||!['length','area','volume','count'].includes(c.basis)||!MATERIAL_UNITS.includes(c.unit)||!Number.isFinite(c.factor)||c.factor<=0||c.factor>1e7||!Number.isFinite(c.waste)||c.waste<0||c.waste>100||typeof c.roundWhole!=='boolean'||typeof c.note!=='string'||c.note.length>160)return false;}}
 if(h.estimates!==undefined){if(!Array.isArray(h.estimates)||h.estimates.length>500)return false;for(const e of h.estimates){if(!e||typeof e.id!=='string'||e.id.length>100||typeof e.projectName!=='string'||e.projectName.length>80||typeof e.calculatorName!=='string'||e.calculatorName.length>80||!Array.isArray(e.lines)||e.lines.length>20||!e.lines.every(l=>l&&typeof l.name==='string'&&l.name.length<=80&&typeof l.unit==='string'&&l.unit.length<=20&&typeof l.note==='string'&&l.note.length<=400&&Number.isFinite(l.qty)&&l.qty>=0&&l.qty<=1e12&&Number.isFinite(l.unitPrice)&&l.unitPrice>=0&&l.unitPrice<=1e9)||!Number.isFinite(e.additionalCost)||!Number.isFinite(e.quoteNet)||!Number.isFinite(e.totalNet)||![0,7,19].includes(e.quoteVatRate))return false;}}
 return true;
}
function validWorkspace(d){return !!(d&&d.version===2&&Array.isArray(d.households)&&d.households.length>=1&&d.households.length<=100&&d.households.every(h=>h&&typeof h.id==='string'&&h.id.length<=100&&typeof h.name==='string'&&h.name.trim().length>0&&h.name.length<=60&&['shared','personal','business'].includes(h.kind)&&validBackup(h.data)&&validBusinessMeta(h))&&new Set(d.households.map(h=>h.id)).size===d.households.length&&(!d.activeId||d.households.some(h=>h.id===d.activeId)))}
function validBackup(d){
if(!d||d.version!==1||!['accounts','transactions','goals','debts','subscriptions'].every(k=>Array.isArray(d[k])&&d[k].length<=10000))return false;
const str=(x,max=120)=>typeof x==='string'&&x.length<=max;
const num=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e12;
const ids=new Set();for(const key of ['accounts','transactions','goals','debts','subscriptions'])for(const x of d[key]){if(!x||!str(x.id,100)||ids.has(x.id))return false;ids.add(x.id)}
if(!d.accounts.length||!d.accounts.every(x=>str(x.name,60)&&num(x.opening)))return false;
const accountIds=new Set(d.accounts.map(x=>x.id));
if(!d.transactions.every(x=>accountIds.has(x.accountId)&&['income','expense'].includes(x.type)&&num(x.amount)&&x.amount>0&&str(x.date,10)&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&str(x.category,60)&&str(x.note)))return false;
if(!d.goals.every(x=>str(x.name,60)&&num(x.target)&&x.target>0&&num(x.saved)))return false;
if(!d.debts.every(x=>str(x.name,60)&&num(x.balance)&&num(x.payment)))return false;
if(!d.subscriptions.every(x=>str(x.name,60)&&num(x.amount)&&x.amount>0&&['monthly','yearly'].includes(x.frequency)))return false;
if(d.recurring!==undefined){if(!Array.isArray(d.recurring)||d.recurring.length>10000||!d.recurring.every(r=>r&&str(r.id,100)&&str(r.name,60)&&['income','expense'].includes(r.type)&&num(r.amount)&&r.amount>0&&str(r.category,60)&&accountIds.has(r.accountId)&&['monthly','yearly'].includes(r.frequency)&&isDate(r.nextDate)&&Number.isInteger(r.anchorDay)&&r.anchorDay>=1&&r.anchorDay<=31&&Number.isInteger(r.anchorMonth)&&r.anchorMonth>=1&&r.anchorMonth<=12))return false;}
return THEMES.some(t=>t.id===d.theme)
}

/* Budget Studio 0.8: CSV imports and consent-based recurring transaction detection.
 * All uploaded files are parsed in the browser. No network call, bank secret or token.
 * Imported records are real account movements; detected subscriptions are display-only.
 */
function bankImport(){
 const blocked=businessHousehold()?'<div class="notice-panel">Geschäftskonten können ebenfalls Kontoauszüge importieren. Die automatische Abo-Erkennung ist für private Haushalte gedacht; die Umsatzsteuer wird bei importierten Buchungen nicht automatisch berechnet.</div>':'';
 const d=bankImportDraft;
 const inc=d?sum(d.ready.filter(r=>r.type==='income'),r=>money(r.amount)):0;
 const out=d?sum(d.ready.filter(r=>r.type==='expense'),r=>money(r.amount)):0;
 const highRisk=d&&d.documentLabel!=='CSV-Datei'&&d.ready.length>=5&&!d.ready.some(r=>r.type==='income');
 const warnZero=highRisk?'<div class="import-danger"><b>⚠ Keine einzige Einnahme erkannt!</b><p>Dieses Dokument enthält möglicherweise Gutschriften, die der PDF-Parser übersehen hat. Die angezeigte Bilanz ist dann falsch. Wir empfehlen, NICHT zu importieren und einen kleineren oder anderen Auszug zu verwenden. Wenn du trotzdem fortfahren willst, musst du das unten ausdrücklich bestätigen.</p></div>':'';
 const groups=importGroups();
 return `<div class="heading"><div><small>BANKDATEN · IMPORT</small><h2>Kontoauszug importieren</h2><p class="muted">CSV, PDF oder Foto auswählen. Vor dem Buchen bitte alle Beträge und Einnahmen prüfen.</p></div></div>${blocked}
 <div class="panel stack bank-steps"><h3>1. Datei auswählen</h3><p class="muted">CSV, textbasierte PDFs und JPG/PNG möglich. Eingescannte Seiten benötigen OCR. Externe Bibliotheken werden bei Bedarf geladen; Kontoauszüge nicht in dein öffentliches GitHub-Repository hochladen.</p>
 <label>Zu welchem Konto? <select id="bank-target-account">${state.accounts.map(a=>`<option value="${esc(a.id)}" ${d?.accountId===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
 <label>Kontoauszug / Foto <input id="bank-csv-file" type="file" accept=".csv,.pdf,.jpg,.jpeg,.png,text/csv,application/pdf,image/jpeg,image/png"></label>
 <p id="bank-import-status" class="muted" role="status" aria-live="polite">PDF: 12 Seiten / 12 MB · Fotos: 8 MB · CSV: 3 MB.</p>
 <div class="notice-panel"><b>Wichtig zum Kontostand:</b> Wenn dein Konto bei 0 € startet, aber der Auszug nur einen Teil der Kontohistorie enthält, entspricht der berechnete Saldo NICHT deinem Bankkontostand. Einnahmen können bei manchen PDF-Layouts fehlen. Prüfe zuerst die Buchungen und gleiche dann unter „Konten“ den Saldo ab.</div></div>
 ${d?`<div class="panel stack" id="bank-import-preview"><h3>2. Alle Buchungen prüfen</h3><div class="bank-statement-status"><b>Erkennung:</b> ${esc(d.documentLabel||'CSV-Tabelle')} · ${d.ready.length} neue Buchungen · ${d.invalid} unklar</div><div class="import-summary-grid"><div><small>Einnahmen erkannt</small><strong class="positive">+${eur(inc)}</strong></div><div><small>Ausgaben erkannt</small><strong class="negative">−${eur(out)}</strong></div><div><small>Saldoveränderung</small><strong>${eur(inc-out)}</strong></div></div><p class="muted">${esc(d.fileName)} · ${d.duplicates} bereits importiert · ${d.invalid} nicht eindeutig lesbar</p>${warnZero}${d.warnings.length?`<div class="notice-panel">${d.warnings.map(esc).join(' · ')}</div>`:''}<div class="bank-preview-list">${d.ready.map((r,i)=>`<div class="bank-preview-row"><span>${esc(r.date)}<br><b>${esc(r.merchant||r.note)}</b>${r.note&&r.note!==r.merchant?`<small class="muted">${esc(r.note.slice(0,90))}</small>`:''}</span><b class="${r.type==='income'?'positive':'negative'}">${r.type==='income'?'+':'−'}${eur(r.amount)}</b></div>`).join('')||'<p class="muted">Keine neuen Buchungen gefunden.</p>'}</div><p class="muted">Alle ${d.ready.length} erkannten Buchungen stehen oben. Unklare Buchungen wurden ausgelassen – bitte auch die Gesamtzahl im Originalauszug prüfen.</p>${highRisk?'<label class="import-confirm"><input id="ack-no-income" type="checkbox"> Ich habe geprüft, dass wirklich keine Einnahmen fehlen, und akzeptiere das Risiko einer falschen Bilanz.</label>':''}<div class="settings-actions"><button type="button" class="primary" id="bank-import-commit" ${d.ready.length?'':'disabled'}>Geprüfte Buchungen übernehmen</button><button type="button" id="bank-import-cancel">Verwerfen</button></div></div>`:''}
 ${groups.length?`<div class="panel stack"><h3>Bisherige Kontoauszug-Importe</h3><p class="muted">Du kannst einen fehlerhaften Import komplett zurücknehmen. Dadurch verschwinden die entsprechenden Buchungen aus dem Dashboard. Vorher bitte JSON-Datensicherung erstellen!</p>${groups.map(g=>`<div class="import-history-row"><div><b>${esc(g.filename||(g.legacy?'Älterer '+(g.source==='document'?'PDF-/Foto':'CSV-')+'Import':'Kontoauszug'))}</b><small>${esc(state.accounts.find(a=>a.id===g.accountId)?.name||'Konto')} · ${g.count} Buchungen · +${eur(g.income)} / −${eur(g.expense)} ${g.legacy?'· ältere Importe zusammengefasst':''}</small></div><button data-undo-import="${esc(g.key)}" class="small-action" type="button">Rückgängig</button></div>`).join('')}</div>`:''}
 <div class="panel bank-info"><b>Direkte Bankverbindung – noch nicht aktiv</b><p class="muted">Eine echte Kontoverbindung benötigt einen sicheren Open-Banking-Dienst. Hier niemals PIN oder TAN eingeben.</p></div>`;
}

function csvParse(text,separator){
 const out=[];let row=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quote){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')quote=false;else cell+=ch;}
  else if(ch==='"')quote=true;
  else if(ch===separator){row.push(cell);cell='';}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()!==''))out.push(row);row=[];cell='';}
  else cell+=ch;
  if(out.length>12000)throw Error('Zu viele Buchungen (maximal 12.000 Zeilen).');
 }
 if(quote)throw Error('Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.');
 row.push(cell);if(row.some(x=>x.trim()!==''))out.push(row);
 return out;
}
function cleanHeader(v){return String(v||'').replace(/^\ufeff/,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'')}
function headerIndex(row,keys){return row.findIndex(x=>keys.some(key=>x===key||x.startsWith(key)))}
function headerColumns(row){const h=row.map(cleanHeader);
 const date=headerIndex(h,['buchungstag','buchungsdatum','valuta','wertstellung','datum','date','transactiondate','bookingdate']);
 const amount=headerIndex(h,['betrag','umsatz','amount','value','summe']);
 const debit=headerIndex(h,['soll','belastung','debit','abbuchung']);
 const credit=headerIndex(h,['haben','gutschrift','credit']);
 const counterparty=headerIndex(h,['auftraggeberempfanger','begunstigterzahlungspflichtiger','beguenstigterzahlungspflichtiger','empfangerauftraggeber','empfaengerauftraggeber','gegenpartei','partnername','empfanger','empfaenger','zahlungsempfanger','zahlungsempfaenger','auftraggeber','name','merchant','payee','counterparty']);
 const purpose=headerIndex(h,['verwendungszweck','buchungstext','buchungsdetails','beschreibung','umsatztext','zweck','text','purpose','description','information','detail']);
 const reference=headerIndex(h,['transaktionsid','transactionid','buchungsid','referenznummer','referenz']);
 return {date,amount,debit,credit,counterparty,purpose,reference,valid:date>=0&&(amount>=0||(debit>=0&&credit>=0))};
}
function parseBankAmount(raw){
 let t=String(raw??'').trim().replace(/[€\s\u00a0]/g,'').replace(/[−–—]/g,'-');
 if(!t)return null;
 let neg=t.startsWith('(')&&t.endsWith(')');if(neg)t=t.slice(1,-1);
 const tail=t.match(/([+\-SH])$/i);if(tail){if(tail[1]==='-'||tail[1].toUpperCase()==='S')neg=true;t=t.slice(0,-1)}
 const lead=t[0];if(lead==='-'||lead==='+'){if(lead==='-')neg=true;t=t.slice(1)}
 const dot=t.lastIndexOf('.'),comma=t.lastIndexOf(',');
 if(dot>=0&&comma>=0)t=comma>dot?t.replace(/\./g,'').replace(',','.'):t.replace(/,/g,'');
 else if(comma>=0)t=t.replace(/\./g,'').replace(',','.');
 else if((t.match(/\./g)||[]).length>1)t=t.replace(/\./g,'');
 if(!/^\d+(\.\d+)?$/.test(t))return null;
 const n=Number(t)*(neg?-1:1);return Number.isFinite(n)&&Math.abs(n)<=1e9?round2(n):null;
}
function parseBankDate(v){const s=String(v||'').trim();let y,m,d;
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return isDate(s.slice(0,10))?s.slice(0,10):null;
 const x=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})/);if(!x)return null;
 d=Number(x[1]);m=Number(x[2]);y=Number(x[3]);if(y<100)y+=y<70?2000:1900;
 const date=[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');return isDate(date)?date:null;
}
function normalizeMerchant(name){return String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\b(DE\d{20}|[A-Z]{2}\d{2}[A-Z\d]{10,30}|[A-Z0-9]{15,})\b/g,' ').replace(/\b\d{5,}\b/g,' ').replace(/\b(GMBH|UG|AG|SE|KG|LTD|INC|CO|EU|DEUTSCHLAND|PAYMENT|LASTSCHRIFT|SEPA|KARTENZAHLUNG|POS)\b/g,' ').replace(/[^A-Z0-9]+/g,' ').trim().split(/\s+/).slice(0,6).join(' ').slice(0,55)}
function hashImportKey(parts){const str=parts.join('|');let a=2166136261;for(let i=0;i<str.length;i++){a^=str.charCodeAt(i);a=Math.imul(a,16777619)}return (a>>>0).toString(36)}
function parsedBankCSV(text,accountId){
 const candidates=[',',';','\t'].map(sep=>({sep,rows:csvParse(text.replace(/^\ufeff/,''),sep)}));
 let chosen=null;
 for(const x of candidates)for(let i=0;i<Math.min(35,x.rows.length);i++){const columns=headerColumns(x.rows[i]);if(!columns.valid)continue;const score=3+(columns.counterparty>=0?2:0)+(columns.purpose>=0?2:0)+(x.sep===';'?0.1:0);if(!chosen||score>chosen.score)chosen={...x,at:i,cols:columns,score}}
 if(!chosen)throw Error('Keine passende Datum- und Betragsspalte gefunden. Bitte einen CSV-Kontoauszug mit Spaltenüberschriften exportieren.');
 const {rows,at,cols}=chosen, ready=[],warnings=[],seen=new Set(state.transactions.filter(t=>t.accountId===accountId).map(t=>t.importKey).filter(Boolean));
 let duplicates=0,invalid=0,skippedZero=0;
 for(const colsRow of rows.slice(at+1)){
  if(!colsRow.some(v=>v.trim()))continue;
  const date=parseBankDate(colsRow[cols.date]);
  let amount=cols.amount>=0?parseBankAmount(colsRow[cols.amount]):null;
  if(cols.amount<0){const debit=parseBankAmount(colsRow[cols.debit])||0,credit=parseBankAmount(colsRow[cols.credit])||0;amount=round2(credit-Math.abs(debit));}
  if(!date||amount===null){invalid++;continue}if(amount===0){skippedZero++;continue}
  const merchant=String(cols.counterparty>=0?colsRow[cols.counterparty]||'':'').trim().slice(0,80);
  const purpose=String(cols.purpose>=0?colsRow[cols.purpose]||'':'').trim().slice(0,120);
  const note=(purpose||merchant||'CSV-Bankbuchung').slice(0,120);
  const normalized=normalizeMerchant(merchant||purpose||'BANK');
  const ref=cols.reference>=0?String(colsRow[cols.reference]||'').trim().slice(0,100):'';
  const key=hashImportKey([accountId,date,amount,normalized,purpose,ref]);
  if(seen.has(key)){duplicates++;continue}seen.add(key);
  ready.push({date,type:amount<0?'expense':'income',amount:Math.abs(amount),accountId,category:'Unkategorisiert',note,merchant:merchant||purpose.slice(0,60),merchantKey:normalized,importKey:key,importedFrom:'csv'});
 }
 if(skippedZero)warnings.push(`${skippedZero} Nullbuchung(en) übersprungen`);
 if(invalid)warnings.push(`${invalid} Zeile(n) ohne auswertbares Datum oder Betrag`);
 if(!ready.length&&!duplicates)warnings.push('Prüfe, ob deine Bank ein anderes CSV-Format verwendet.');
 return {ready,duplicates,invalid,warnings};
}
// PDF / image recognition for the optional document importer. Only locally selected files
// are handed to PDF.js / Tesseract in the browser; no statement is sent to an OCR API.
let bankFileBusy=false,approvedBankLibraries=false;
const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const TESS_URL='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
function importProgress(message){const el=document.querySelector('#bank-import-status');if(el)el.textContent=message}
function loadBankScript(url,ready){
 if(ready())return Promise.resolve();
 return new Promise((resolve,reject)=>{const script=document.createElement('script');let settled=false;const timer=setTimeout(()=>finish(Error('Bibliothek nicht erreichbar (Zeitüberschreitung). Bitte Internetverbindung prüfen.')),20000);function finish(error){if(settled)return;settled=true;clearTimeout(timer);if(error){script.remove();reject(error)}else resolve()}script.src=url;script.async=true;script.crossOrigin='anonymous';script.onload=()=>ready()?finish():finish(Error('Die Texterkennung konnte nicht gestartet werden.'));script.onerror=()=>finish(Error('Bibliothek nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen.'));document.head.appendChild(script)});
}
function statementCheck(text){
 const normalized=String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const title=/konto\s*auszug|kontoumsatze|umsatzubersicht|umsatzanzeige|bank statement/.test(normalized);
 const bank=/(sparkasse|bank|girokonto|kreditinstitut|iban|konto\s*nr)/.test(normalized);
 const finance=/(kontostand|saldo|buchung|lastschrift|gutschrift|betrag|wertstellung)/.test(normalized);
 const dates=(text.match(/\b\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?\b/g)||[]).length;
 return {isStatement:bank&&finance&&(title||(/kontostand|saldo/i.test(normalized)&&dates>=3)),title,bank,finance,dates};
}
function statementYear(text){
 const patterns=[/konto\s*auszug[^\n]{0,80}?(20\d{2})/ig,/\b(?:vom|bis|zeitraum|stand)\s*:?\s*\d{1,2}\.\d{1,2}\.(20\d{2})/ig,/\b\d{1,2}\.\d{1,2}\.(20\d{2})\b/g];
 for(const p of patterns){const m=p.exec(text);if(m)return Number(m[1])}
 return null;
}
function pdfTextLines(content){
 const items=content.items.filter(x=>typeof x.str==='string'&&x.str.trim()).map(x=>({text:x.str.trim(),x:Number(x.transform?.[4]||0),y:Number(x.transform?.[5]||0)}));
 items.sort((a,b)=>b.y-a.y||a.x-b.x);
 const lines=[];
 for(const item of items){const last=lines[lines.length-1];if(last&&Math.abs(last.y-item.y)<3){last.items.push(item)}else lines.push({y:item.y,items:[item]})}
 return lines.map(r=>{r.items.sort((a,b)=>a.x-b.x);return {text:r.items.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim(),items:r.items}}).filter(x=>x.text);
}
function signedAmount(value){
 const t=String(value).trim().replace(/[−–—]/g,'-'),n=parseBankAmount(t.replace(/([+\-SH])\s*$/i,'').replace(/\s*(?:EUR|€)\s*$/i,''));
 if(n===null||n===0)return null;
 const trailing=t.match(/([+\-SH])\s*(?:EUR|€)?\s*$/i);const lead=t.trim()[0];
 const rawSign=trailing?trailing[1].toUpperCase():lead==='-'?'-':lead==='+'?'+':null;const sign=rawSign==='S'?'-':rawSign==='H'?'+':rawSign;
 return {amount:Math.abs(n),type:sign==='-'?'expense':sign==='+'?'income':null};
}
function parseStatementRows(lines,accountId,year){
 const ready=[],warnings=[],seen=new Set(state.transactions.filter(t=>t.accountId===accountId).map(t=>t.importKey).filter(Boolean));
 let duplicates=0,invalid=0,unsure=0,skipped=0;
 const textLines=lines.map(r=>typeof r==='string'?r:r.text);
 const compact=textLines.join('\n');
 if(!statementCheck(compact).isStatement)throw Error('Keine eindeutigen Kontoauszug-Merkmale erkannt. Es wurden keine Buchungen importiert.');
 const resolvedYear=year||statementYear(compact);
 const dateRegex=/^\s*(\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?|20\d{2}-\d{2}-\d{2})(?=\s|$|[.,;])/;
 const moneyRegex=/(?:[+\-−–]\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*(?:[+\-−–]|[SH](?![a-z]))?\s*(?:EUR|€)?/gi;
 // Account statements may have separate debit/credit amount columns with no +/- sign.
 // Such values are NOT guessed: require a signed value or an unambiguous column.
 const header=lines.find(r=>/\b(?:soll|belastung)\b/i.test(r.text)&&/\b(?:haben|gutschrift)\b/i.test(r.text));
 const headingItems=header&&header.items||[];
 const soll=headingItems.find(x=>/^(betrag\s*)?(soll|belastung)/i.test(x.text));
 const haben=headingItems.find(x=>/^(betrag\s*)?(haben|gutschrift)/i.test(x.text));
 let current=null;
 function flush(){
  if(!current)return;
  const r=current;current=null;
  if(/\b(kontostand|anfangssaldo|endsaldo|alter saldo|neuer saldo|saldo vortrag|uebertrag|übertrag|aktueller kontostand|verfügbar|verfugbar)\b/i.test(r.description)){skipped++;return}
  if(!r.date||r.amount===null||!r.type){invalid++;return}
  const merchant=String(r.description||'Kontoauszug-Buchung').slice(0,80).trim();
  const note=String(r.description||merchant).slice(0,120).trim();
  const normalized=normalizeMerchant(merchant);
  const key=hashImportKey([accountId,r.date,(r.type==='expense'?-1:1)*r.amount,normalized,merchant,'statement']);
  if(seen.has(key)){duplicates++;return}seen.add(key);
  ready.push({date:r.date,type:r.type,amount:r.amount,accountId,category:'Unkategorisiert',note,merchant,merchantKey:normalized,importKey:key,importedFrom:'document'});
 }
 for(let i=0;i<textLines.length;i++){
  const t=textLines[i];const dateMatch=t.match(dateRegex);
  if(dateMatch){
   flush();let found=dateMatch[1];
   if(/^\d{1,2}[.\/-]\d{1,2}$/.test(found)){if(!resolvedYear){unsure++;continue}found+='.'+resolvedYear}
   const date=parseBankDate(found);if(!date){unsure++;continue}
   // A date row might itself be a balance, a footer or an empty column header.
   const tail=t.slice(dateMatch[0].length).trim();
   const amounts=[...tail.matchAll(moneyRegex)];let chosen=null;
   if(amounts.length){const hit=amounts[amounts.length-1];let signed=signedAmount(hit[0]);
    if(signed&&signed.type===null&&soll&&haben&&typeof lines[i]!=='string'){
     const lastItem=lines[i].items.filter(x=>/\d+,\d{2}/.test(x.text)).at(-1);if(lastItem){const d1=Math.abs(lastItem.x-soll.x),d2=Math.abs(lastItem.x-haben.x);if(Math.abs(d1-d2)>12)signed.type=d1<d2?'expense':'income'}
    }
    if(signed&&signed.type)chosen=signed;
   }
   const description=tail.replace(moneyRegex,' ').replace(/^(?:\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?)\s*/,'').replace(/\s+/g,' ').trim();
   current={date,description,amount:chosen?.amount??null,type:chosen?.type??null};
   if(!chosen)unsure++;
  }else if(current){
   if(/^(?:kontostand|saldo|auszug|blatt|seite|iban|bic|swift|dispositionskredit|aktuell verf[uü]gbar|betrag in eur|ihre sparkasse|mit freundlichen gr[uü]ßen)/i.test(t))continue;
   // OCR sometimes separates the amount onto the next line.
   const match=[...t.matchAll(moneyRegex)];
   if(current.amount===null&&match.length===1){const value=signedAmount(match[0][0]);if(value&&value.type){current.amount=value.amount;current.type=value.type}}
   if(current.description.length<120&&!(/^\d{1,3}(?:\.\d{3})*,\d{2}\s*[+-]?$/.test(t.trim())))current.description=(''+current.description+' '+t).trim().slice(0,120);
  }
 }
 flush();
 if(!ready.length&&duplicates)return {ready:[],duplicates,invalid:invalid+unsure,warnings:['Diese Buchungen wurden bereits importiert.']};
 if(!ready.length&&unsure)throw Error('Kontoauszug erkannt, aber die Beträge/Vorzeichen waren nicht eindeutig lesbar. Es wird nichts übernommen. Bitte CSV-Export oder eine besser lesbare PDF-Datei verwenden.');
 if(!ready.length)throw Error('Kontoauszug erkannt, jedoch keine eindeutig zuordenbaren Buchungen gefunden.');
 if(unsure)warnings.push(`${unsure} Zeile(n) ohne eindeutiges Vorzeichen bzw. Jahresdatum nicht übernommen`);
 if(skipped)warnings.push(`${skipped} Kontostandszeile(n) ausgeschlossen`);
 if(invalid)warnings.push(`${invalid} unvollständige Zeile(n) ausgelassen`);
 warnings.push('Automatische PDF-/Bildauswertung: Datum, Betrag und Vorzeichen unbedingt mit dem Original vergleichen.');
 return {ready,duplicates,invalid:invalid+unsure,warnings};
}
async function ocrCanvas(canvas,worker){const result=await worker.recognize(canvas);return String(result.data?.text||'')}
async function makeOCRWorker(){
 await loadBankScript(TESS_URL,()=>!!window.Tesseract);
 if(!window.Tesseract?.createWorker)throw Error('Texterkennung auf diesem Gerät nicht verfügbar.');
 return window.Tesseract.createWorker('deu+eng',1,{logger:m=>{if(m.status==='recognizing text')importProgress('Text wird erkannt: '+Math.round((m.progress||0)*100)+' %')}});
}
async function readImageStatement(file){
 const bitmap=await createImageBitmap(file);try{
  const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  importProgress('Bild wird per OCR erkannt …');const worker=await makeOCRWorker();let content;try{content=await ocrCanvas(canvas,worker)}finally{await worker.terminate()}
  return {lines:content.split(/\r?\n/).map(text=>({text:text.trim()})).filter(x=>x.text),raw:content,label:'Foto / OCR'};
 }finally{bitmap.close?.()}
}
async function readPdfStatement(file){
 await loadBankScript(PDFJS_URL,()=>!!window.pdfjsLib);window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
 const bytes=await file.arrayBuffer();const pdf=await window.pdfjsLib.getDocument({data:bytes,isEvalSupported:false}).promise;
 try{
  if(pdf.numPages>12)throw Error('PDF enthält mehr als 12 Seiten. Bitte einen kürzeren Zeitraum exportieren.');
  const result=[];let worker=null,ocrUsed=false;
  for(let p=1;p<=pdf.numPages;p++){
   importProgress('PDF wird gelesen: Seite '+p+' von '+pdf.numPages);
   const page=await pdf.getPage(p);const content=await page.getTextContent();let lines=pdfTextLines(content);
   if(lines.map(x=>x.text).join(' ').trim().length<55){
    if(!worker)worker=await makeOCRWorker();ocrUsed=true;
    const viewport=page.getViewport({scale:2});const scale=Math.min(1,2200/Math.max(viewport.width,viewport.height));const finalView=page.getViewport({scale:2*scale});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(finalView.width);canvas.height=Math.ceil(finalView.height);
    await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport:finalView}).promise;
    const text=await ocrCanvas(canvas,worker);canvas.width=1;canvas.height=1;
    lines=text.split(/\r?\n/).map(text=>({text:text.trim()})).filter(x=>x.text);
   }
   result.push(...lines);
  }
  if(worker)await worker.terminate();
  return {lines:result,raw:result.map(r=>r.text).join('\n'),label:ocrUsed?'PDF / teilweise OCR':'Text-PDF'};
 }finally{await pdf.destroy()}
}
async function onBankFile(input){
 if(bankFileBusy)return;
 const file=input.files?.[0];if(!file)return;
 const accountId=app.querySelector('#bank-target-account')?.value;
 if(!state.accounts.some(a=>a.id===accountId))return alert('Bitte ein gültiges Konto auswählen.');
 const ext=(file.name.split('.').pop()||'').toLowerCase();if(!['csv','pdf','jpg','jpeg','png'].includes(ext))return alert('Nur CSV, PDF, JPG und PNG werden unterstützt.');
 const limits={csv:3_000_000,pdf:12_000_000,jpg:8_000_000,jpeg:8_000_000,png:8_000_000};if(!file.size||file.size>limits[ext])return alert('Datei leer oder zu groß. Bitte die angegebenen Größenlimits beachten.');
 const originalHousehold=workspace.activeId;bankFileBusy=true;bankImportDraft=null;
 try{
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const pdfMagic=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
  const pngMagic=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  const jpgMagic=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(ext==='pdf'&&!pdfMagic||ext==='png'&&!pngMagic||['jpg','jpeg'].includes(ext)&&!jpgMagic)throw Error('Dateiendung und Dateiinhalt passen nicht zusammen.');
  let result,label;
  if(ext==='csv'){
   const raw=await file.arrayBuffer();let decoded=new TextDecoder('utf-8').decode(raw);if(decoded.includes('\uFFFD'))decoded=new TextDecoder('windows-1252').decode(raw);
   result=parsedBankCSV(decoded,accountId);label='CSV-Datei';
  }else{
   // User consent before third-party JavaScript loads. Never upload the bank document.
   if(!approvedBankLibraries){if(!confirm('PDF-/Foto-Erkennung benötigt bei der ersten Nutzung Open-Source-Bibliotheken von externen CDNs (PDF.js / Tesseract). Die Datei wird lokal im Browser ausgewertet, aber extern geladener Code benötigt Vertrauen. Fortfahren?'))return;approvedBankLibraries=true;}
   importProgress('Kontoauszug wird überprüft …');
   const doc=ext==='pdf'?await readPdfStatement(file):await readImageStatement(file);
   if(!statementCheck(doc.raw).isStatement)throw Error('Datei nicht als Kontoauszug erkannt. Weder PDF noch Foto wird importiert.');
   result=parseStatementRows(doc.lines,accountId,statementYear(doc.raw));label=doc.label;
  }
  if(originalHousehold!==workspace.activeId)throw Error('Haushalt hat sich geändert. Bitte Datei erneut auswählen.');
  const possibleDuplicates=result.ready.filter(r=>state.transactions.some(t=>t.accountId===accountId&&t.date===r.date&&t.type===r.type&&Math.abs(t.amount-r.amount)<0.005&&(normalizeMerchant(t.merchant||t.note||'')===normalizeMerchant(r.merchant||r.note||'')))).length;
  if(possibleDuplicates)result.warnings.push(`${possibleDuplicates} mögliche Doppelbuchung(en) mit vorhandenen Einträgen. Unbedingt vor Übernahme prüfen!`);
  bankImportDraft={...result,possibleDuplicates,accountId,fileName:file.name.slice(0,120),householdId:originalHousehold,documentLabel:label};render();
 }catch(err){bankImportDraft=null;render();alert('Import nicht möglich: '+(err.message||'Unbekannter Fehler'))}
 finally{bankFileBusy=false;importProgress('Du kannst eine weitere Datei auswählen.');}
}
function commitBankImport(){
 const d=bankImportDraft;if(!d||d.householdId!==workspace.activeId||!state.accounts.some(a=>a.id===d.accountId))return alert('Bitte CSV-Datei erneut auswählen.');
 const existing=new Set(state.transactions.map(t=>t.importKey).filter(Boolean));
 const fresh=d.ready.filter(r=>!existing.has(r.importKey));
 if(!fresh.length)return alert('Keine neuen Buchungen zu übernehmen.');
 if(state.transactions.length+fresh.length>10000)return alert('Zu viele Buchungen. Maximal 10.000 Einträge je Haushalt.');
 const inCount=fresh.filter(r=>r.type==='income').length,outCount=fresh.filter(r=>r.type==='expense').length;
 const risk=d.documentLabel!=='CSV-Datei'&&fresh.length>=5&&inCount===0;
 if(risk&&!app.querySelector('#ack-no-income')?.checked)return alert('Keine Einnahmen im PDF erkannt. Bitte erst prüfen und das Warnfeld bestätigen.');
 if(!confirm(`${fresh.length} Buchungen übernehmen? ${inCount} Einnahmen, ${outCount} Ausgaben. Die Saldoveränderung beträgt ${eur(sum(fresh,r=>r.type==='income'?r.amount:-r.amount))}. Das ist NICHT zwingend dein Bankkontostand. Fortfahren?`))return;
 const importBatch=uid();const added=fresh.map(t=>({id:uid(),...t,importBatch,importFileName:d.fileName,needsReview:d.documentLabel!=='CSV-Datei'}));state.transactions.push(...added);
 if(!save()){state.transactions.splice(-added.length,added.length);return;}
 const newest=fresh.map(t=>t.date.slice(0,7)).sort().at(-1);if(newest)selectedMonth=newest;
 bankImportDraft=null;setView('transactions');
 alert(`${added.length} Buchungen gespeichert. Das Dashboard zeigt nun den Monat ${selectedMonth}. Bitte Einnahmen, Kategorien und Kontostand prüfen – über „Buchungen“ kannst du alles korrigieren.`);
}
function undoBankImport(key){
 const group=importGroups().find(g=>g.key===key);if(!group)return alert('Importgruppe nicht gefunden.');
 const belong=t=>t.accountId===group.accountId&&(['document','csv'].includes(t.importedFrom))&&(t.importBatch||'legacy:'+t.importedFrom+':'+t.accountId)===group.batch;
 const count=state.transactions.filter(belong).length;if(!count)return;
 if(!confirm(`ACHTUNG: ${count} importierte Buchungen aus ${group.legacy?'allen älteren '+group.source+'-Importen':'diesem Import'} werden aus dem Haushalt entfernt. Die Kontostände und Diagramme ändern sich. Bitte vorher JSON-Sicherung erstellen. Fortfahren?`))return;
 if(prompt('Zur Sicherheitsbestätigung IMPORT LÖSCHEN eintippen:')!=='IMPORT LÖSCHEN')return;
 const before=state.transactions;state.transactions=before.filter(t=>!belong(t));
 if(!save()){state.transactions=before;return}render();alert(`${count} importierte Buchungen entfernt. Du kannst den Auszug erneut importieren.`)
}
function findSubscriptionCandidates(){
 const groups=new Map();
 for(const t of state.transactions){
  if(t.type!=='expense'||!isDate(t.date)||!Number.isFinite(Number(t.amount))||t.amount<=0)continue;
  const key=normalizeMerchant(t.merchantKey||t.merchant||'');if(!key||key.length<3)continue;
  const groupId=t.accountId+'|'+key;
  if(!groups.has(groupId))groups.set(groupId,[]);groups.get(groupId).push(t);
 }
 const found=[];
 for(const [groupId,items] of groups){
  const arr=[...items].sort((a,b)=>a.date.localeCompare(b.date));
  if(arr.length<2)continue;
  const periods=new Map();for(const t of arr){const period=t.date.slice(0,7);if(!periods.has(period))periods.set(period,t)}
  const unique=[...periods.values()];if(unique.length<2)continue;
  let monthly=0,yearly=0;let examples=[];
  for(let i=1;i<unique.length;i++){
   const prev=unique[i-1],cur=unique[i],days=Math.round((Date.parse(cur.date+'T12:00:00Z')-Date.parse(prev.date+'T12:00:00Z'))/86400000);
   const tolerance=Math.max(1.5,Math.min(prev.amount,cur.amount)*0.1);
   if(Math.abs(prev.amount-cur.amount)>tolerance)continue;
   if(days>=25&&days<=38){monthly++;examples.push(cur)}
   if(days>=340&&days<=390){yearly++;examples.push(cur)}
  }
  const frequency=monthly>0&&monthly>=yearly?'monthly':yearly>0?'yearly':null;
  if(!frequency)continue;
  const last=arr.at(-1),median=[...arr.map(t=>t.amount)].sort((a,b)=>a-b)[Math.floor(arr.length/2)];
  const key=groupId;
  const already=state.subscriptions.some(s=>s.sourceMerchantKey===key);
  if(already)continue;
  const merchant=(arr.find(t=>t.merchant)?.merchant||last.merchant||key.split('|')[1]).slice(0,60);
  const matches=frequency==='monthly'?monthly:yearly;
  found.push({id:hashImportKey([key,frequency]),key,merchant,frequency,amount:round2(median),count:arr.length,lastDate:last.date,confidence:matches>=2?'hoch':'mittel',matches});
 }
 return found.sort((a,b)=>b.matches-a.matches||b.lastDate.localeCompare(a.lastDate));
}
function subscriptionFinder(){
 const found=findSubscriptionCandidates();
 return `<div class="heading"><div><small>REGELMÄSSIGE ABBUCHUNGEN</small><h2>Abos erkennen</h2><p class="muted">Budget Studio prüft deine erfassten Kontoumsätze auf wiederkehrende Zahlungen.</p></div></div><div class="notice-panel"><b>Nur Vorschläge:</b> Regelmäßige Zahlungen können auch Miete, Einkauf oder Versicherungen sein. Bitte jeden Treffer prüfen. Erst mit „Als Abo übernehmen“ wird er gespeichert. Es wird <b>keine zusätzliche Kontobuchung</b> erzeugt.</div><div class="panel stack"><h3>${found.length} mögliche Abos gefunden</h3>${found.length?found.map(c=>`<div class="detected-subscription"><div><b>${esc(c.merchant)}</b><div class="muted">${c.frequency==='monthly'?'Etwa monatlich':'Etwa jährlich'} · ${c.count} Abbuchungen · zuletzt ${esc(c.lastDate)} · ${c.confidence==='hoch'?'Mehrfach erkannt':'Bitte besonders prüfen'}</div></div><div class="detected-subscription-action"><strong>${eur(c.amount)}</strong><button type="button" class="primary" data-accept-subscription="${esc(c.id)}">Als Abo übernehmen</button></div></div>`).join(''):'<p class="muted">Noch keine ausreichend regelmäßigen Abbuchungen erkannt. Für monatliche Zahlungen werden mindestens zwei passende Zahlungen aus unterschiedlichen Monaten benötigt. Importiere mehrere Kontoauszüge oder CSV-Dateien.</p>'}</div><button data-open-view="bankImport">Weitere Kontoumsätze importieren</button><p class="muted">Die Erkennung nutzt ähnliche Händlernamen, Beträge und Zeitabstände. Sie ist eine heuristische Schätzung und kann Abos übersehen oder falsche Vorschläge machen.</p>`;
}
function acceptSubscription(id){
 const c=findSubscriptionCandidates().find(x=>x.id===id);if(!c)return alert('Der Vorschlag ist nicht mehr vorhanden.');
 if(!confirm(`„${c.merchant}“ mit etwa ${eur(c.amount)} ${c.frequency==='monthly'?'monatlich':'jährlich'} als Abo speichern? Es werden keine weiteren Kontobuchungen erzeugt.`))return;
 if(state.subscriptions.length>=10000)return alert('Zu viele Abos.');
 const newSub={id:uid(),name:c.merchant,amount:c.amount,frequency:c.frequency,sourceMerchantKey:c.key,detected:true};state.subscriptions.push(newSub);
 if(!save()){state.subscriptions.pop();return}render();
}

function settings(){return `<h2>Daten & Datenschutz</h2>${householdSettings()}<div class="panel stack"><p>Alle Haushalte werden lokal in diesem Browser auf diesem Gerät gespeichert. Ohne Konto und ohne Server. Löscht du Browserdaten, können die Daten verloren gehen.</p><button id="export">Alle Haushalte als JSON sichern</button><label>Datensicherung wiederherstellen (Version 0.5 bis 0.8)<input id="import" type="file" accept="application/json,.json"></label><button id="reset">Diesen Haushalt zurücksetzen</button></div>${businessHousehold()?'<div class="panel"><h3>Gewerke &amp; Projektkalkulationen</h3><p class="muted">Gewerke kannst du jederzeit ändern. Eigene Rechner und Projekte werden in der JSON-Datensicherung mitgesichert.</p><button data-open-view="trades">Gewerke verwalten</button></div><div class="panel"><h3>Hinweis zur Umsatzsteuer</h3><p class="muted">Diese Funktion rechnet Nettobeträge, Bruttobeträge und rechnerische Umsatzsteueranteile für 0 %, 7 % oder 19 %. Sie prüft keine Steuerbefreiung, Kleinunternehmerregelung, Reverse Charge, Vorsteuerberechtigung oder Buchführungspflichten. Wiederkehrende automatische Buchungen erhalten derzeit keine Steueraufteilung. Alte Buchungen werden nicht rückwirkend geändert.</p></div>':''}<div class="panel"><h3>Wichtig vor echtem Einsatz</h3><p class="muted">Dies ist eine Testversion, kein geprüftes Finanz-, Buchhaltungs- oder Bankingprodukt. Für Steuererklärungen und Unternehmensbuchhaltung nicht als alleinige Grundlage verwenden. Bitte keine sensiblen echten Daten verwenden, bevor wir Sicherung, Sicherheit und Berechnungen ausführlich getestet haben.</p></div>`}
function drawChart(){const canvas=document.querySelector('#chart');if(!canvas)return;const ctx=canvas.getContext('2d'),m=new Date().toISOString().slice(0,7),data={};state.transactions.filter(t=>t.type==='expense'&&t.date.slice(0,7)===m).forEach(t=>data[t.category]=(data[t.category]||0)+money(t.amount));const vals=Object.values(data),max=Math.max(...vals,1);ctx.clearRect(0,0,650,210);vals.slice(0,8).forEach((v,i)=>{ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--accent').trim();ctx.fillRect(12,12+i*25,Math.max(1,500*v/max),16);ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--ink').trim();ctx.font='13px sans-serif';ctx.fillText(eur(v),520,25+i*25)})}
function render(){const plan=document.querySelector('nav button[data-view=planning]');if(plan)plan.textContent=businessHousehold()?'Werkzeuge':'Planung';document.body.className=(THEMES.some(t=>t.id===state.theme)&&state.theme!=='sage'?state.theme:'');document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===(['goals','debts','subscriptions','recurring','calendar','payments','bankImport','subscriptionFinder'].includes(view)?(businessHousehold()?'more':'planning'):['calculators','calculator','trades','customBuilder','estimates'].includes(view)?'planning':view==='financePlanning'||view==='settings'?'more':view==='transactionEdit'?'transactions':view==='reconcile'?'accounts':view)));document.querySelector('#active-household-name').textContent=nameOfHousehold();app.innerHTML=(['goals','debts','calendar','payments','subscriptions','recurring','bankImport','subscriptionFinder'].includes(view)?planningBack():['calculators','calculator','trades','customBuilder','estimates'].includes(view)?'<button class="planning-back" data-open-view="planning">‹ Zu den Werkzeugen</button>':view==='financePlanning'?'<button class="planning-back" data-open-view="more">‹ Zurück zu Mehr</button>':'')+({dashboard,transactions,accounts,planning,financePlanning,more,goals,debts,subscriptions,recurring,payments,calendar,bankImport,subscriptionFinder,settings,transactionEdit,reconcile,trades:tradesView,calculators:listTradeCalculators,calculator:calculatorPage,customBuilder,estimates:estimatesView}[view]||dashboard)();drawChart()}
document.querySelector('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b&&!choosing)setView(b.dataset.view)});
document.querySelector('#switch-household').addEventListener('click',openPicker);
picker.addEventListener('click',e=>{const b=e.target.closest('[data-select-household]');if(b)selectHousehold(b.dataset.selectHousehold)});
picker.addEventListener('change',e=>{if(e.target.name==='kind'){const trades=picker.querySelector('#picker-trades');if(trades)trades.hidden=e.target.value!=='business';}});
picker.addEventListener('submit',e=>{if(e.target.id!=='create-household')return;e.preventDefault();if(storageLocked)return alert('Speicher muss zuerst wiederhergestellt werden.');if(workspace.households.length>=100)return alert('Maximal 100 Haushalte.');const data=Object.fromEntries(new FormData(e.target).entries()),name=(data.name||'').trim();if(!name||name.length>60||!['shared','personal','business'].includes(data.kind))return;const chosen=e.target.querySelectorAll('input[name=trades]:checked');const picked=[...chosen].map(x=>x.value).filter(id=>TRADE_IDS.has(id));if(data.kind==='business'&&!picked.length)return alert('Bitte mindestens ein Gewerk auswählen.');const h={id:uid(),name,kind:data.kind,members:[],data:blank(),...(data.kind==='business'?{trades:picked,customCalculators:[],estimates:[]}:{})};const starter=workspace.households[0];
const replaceStarter=firstSetupPending&&workspace.households.length===1&&starter.name==='Mein Haushalt'&&starter.data.accounts.length===1&&starter.data.accounts[0].opening===0&&['transactions','goals','debts','subscriptions','recurring'].every(k=>!(starter.data[k]||[]).length);
const previous=workspace.households;workspace.households=replaceStarter?[h]:[...previous,h];if(!save()){workspace.households=previous;return}selectHousehold(h.id)});
document.querySelector('#quick-add').addEventListener('click',()=>{if(choosing)return;setView('transactions');const first=app.querySelector('input[name=amount]');if(first)first.focus()});
/* 0.8.4: barrierearme Designauswahl statt zyklischem Durchklicken von zwölf Farbwelten. */
const themeDialog=document.querySelector('#theme-dialog');
const themeOptions=document.querySelector('#theme-options');
function openThemeDialog(){
 if(choosing)return;
 themeOptions.innerHTML=THEMES.map(t=>`<button type="button" class="theme-option${state.theme===t.id?' selected':''}" data-choose-theme="${t.id}" aria-pressed="${state.theme===t.id?'true':'false'}"><span class="theme-swatch" style="--swatch-accent:${t.accent};--swatch-bg:${t.background}" aria-hidden="true"><span></span></span><span class="theme-option-copy"><strong>${t.label}</strong><small>${t.description}</small></span><span class="theme-selected-mark" aria-hidden="true">${state.theme===t.id?'✓':''}</span></button>`).join('');
 themeDialog.showModal();
}
document.querySelector('#theme').addEventListener('click',openThemeDialog);
document.querySelector('#theme-close').addEventListener('click',()=>themeDialog.close());
themeDialog.addEventListener('click',e=>{if(e.target===themeDialog)themeDialog.close()});
themeOptions.addEventListener('click',e=>{
 const choice=e.target.closest('[data-choose-theme]');if(!choice)return;
 const next=choice.dataset.chooseTheme;if(!THEMES.some(t=>t.id===next))return;
 const previous=state.theme;state.theme=next;
 if(!save()){state.theme=previous;return}
 themeDialog.close();render();
});
app.addEventListener('submit',e=>{const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();const type=form.dataset.form;
 if(type==='edit-transaction'){
  const t=state.transactions.find(x=>x.id===editingTxId);if(!t)return alert('Buchung nicht gefunden.');
  const fd=Object.fromEntries(new FormData(form).entries());const amount=round2(Number(fd.amount));
  if(!['income','expense'].includes(fd.type)||!(amount>0)||!isDate(fd.date)||!state.accounts.some(a=>a.id===fd.accountId)||!String(fd.category||'').trim()||String(fd.category).length>60||!String(fd.note||'').trim()||String(fd.note).length>120)return alert('Bitte gültige Buchungsdaten eingeben.');
  const old={...t};t.type=fd.type;t.amount=amount;t.date=fd.date;t.accountId=fd.accountId;t.category=fd.category.trim();t.note=fd.note.trim();t.corrected=true;
  if(businessHousehold()&&('netAmount'in t||'vatAmount'in t)){delete t.netAmount;delete t.vatAmount;delete t.vatRate;delete t.enteredAs}
  if(!save()){Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,old);return}
  selectedMonth=t.date.slice(0,7);editingTxId=null;setView('transactions');return;
 }
 if(type==='reconcile'){
  const a=state.accounts.find(x=>x.id===reconcileAccountId);if(!a)return;
  const input=form.querySelector('[name=balance]');if(!input?.value.trim())return alert('Bitte echten Kontostand eingeben.');const target=round2(Number(input.value));if(!Number.isFinite(target)||Math.abs(target)>1e9)return alert('Ungültiger Kontostand.');
  const movements=sum(state.transactions.filter(t=>t.accountId===a.id),t=>t.type==='income'?money(t.amount):-money(t.amount));const old=a.opening;const next=round2(target-movements);
  if(!confirm(`Der Anfangsbestand wird von ${eur(old)} auf ${eur(next)} geändert. Dies korrigiert NICHT fehlende oder falsche Buchungen! Nur fortfahren, wenn du alle Umsätze geprüft hast.`))return;
  a.opening=next;if(!save()){a.opening=old;return}reconcileAccountId=null;setView('accounts');return;
 }
 if(type==='business-trades'){const h=household(),previous=h.trades;h.trades=[...new FormData(form).getAll('trades')].filter(id=>TRADE_IDS.has(id));if(!h.trades.length){h.trades=previous;return alert('Bitte mindestens ein Gewerk auswählen.')}if(!save()){h.trades=previous;return}selectedTrade=h.trades[0];setView('planning');return}if(type==='custom-calculator'){saveCustomCalculator(form);return}if(type==='material-calc'){const p=findCalculator();if(!p)return;try{const projectName=String(form.elements.namedItem('projectName').value||'').trim();if(!projectName||projectName.length>80)throw Error('Bitte einen Projektnamen eingeben.');const result=computeCalculator(p,form);pendingCalc={projectName,name:p.name,inputs:result.inputs,lines:result.lines};showCalcResult();document.querySelector('#calc-output')?.scrollIntoView({behavior:'smooth',block:'start'});}catch(err){pendingCalc=null;app.querySelector('#calc-output').innerHTML='<div class="notice-panel">'+esc(err.message||'Ungültige Eingaben')+'</div>'}return}if(type==='estimate'){saveEstimate(form);return}const obj=Object.fromEntries(new FormData(form).entries());for(const k of ['amount','opening','target','saved','balance','payment'])if(k in obj)obj[k]=money(obj[k]);if(['transactions','subscriptions','recurring'].includes(type)&&obj.amount<=0)return alert('Bitte einen Betrag größer als 0 eingeben.');if(type==='goals'&&obj.target<=0)return alert('Das Sparziel muss größer als 0 sein.');if(type==='accounts'&&!obj.name.trim())return;if(['transactions','recurring'].includes(type)&&!state.accounts.some(a=>a.id===obj.accountId))return alert('Bitte gültiges Konto wählen.');if(type==='recurring'){if(!isDate(obj.nextDate))return alert('Bitte ein gültiges Datum wählen.');obj.anchorDay=Number(obj.nextDate.slice(8));obj.anchorMonth=Number(obj.nextDate.slice(5,7))}
if(type==='transactions'&&!isDate(obj.date))return alert('Bitte gültiges Buchungsdatum wählen.');
if(type==='transactions'&&businessHousehold()){
 const result=calculateTax(obj.amount,obj.entryMode,obj.vatRate);
 if(!result)return alert('Bitte gültigen Betrag, Netto/Brutto und Umsatzsteuersatz wählen.');
 obj.amount=result.gross;obj.netAmount=result.net;obj.vatAmount=result.vat;obj.vatRate=result.rate;obj.enteredAs=result.mode;
 delete obj.entryMode;
}
const item={id:uid(),...obj};state[type].push(item);if(!save()){state[type].pop();return}if(type==='recurring')applyRecurring();render()});
app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
if(b.dataset.undoImport){undoBankImport(b.dataset.undoImport);return}
if(b.dataset.editTx){editingTxId=b.dataset.editTx;setView('transactionEdit');return}
if(b.dataset.reconcileAccount){reconcileAccountId=b.dataset.reconcileAccount;setView('reconcile');return}
if(b.id==='bank-import-commit'){commitBankImport();return}
if(b.id==='bank-import-cancel'){bankImportDraft=null;render();return}
if(b.dataset.acceptSubscription){acceptSubscription(b.dataset.acceptSubscription);return}
if(b.dataset.openView){setView(b.dataset.openView);return}if(b.dataset.trade){selectedTrade=b.dataset.trade;selectedCalculator=null;pendingCalc=null;setView('calculators');return}if(b.dataset.calc){selectedCalculator=b.dataset.calc;pendingCalc=null;setView('calculator');return}if(b.dataset.customCalc){const calc=customOf().find(c=>c.id===b.dataset.customCalc);if(!calc)return;selectedTrade=calc.trade;selectedCalculator='custom:'+calc.id;pendingCalc=null;setView('calculator');return}if(b.dataset.deleteCustom){const h=household();if(!confirm('Eigenen Rechner löschen? Gespeicherte Projektkalkulationen bleiben erhalten.'))return;const before=h.customCalculators;h.customCalculators=before.filter(c=>c.id!==b.dataset.deleteCustom);if(!save())h.customCalculators=before;selectedCalculator=null;setView('planning');return}if(b.dataset.deleteEstimate){const h=household();if(!confirm('Projektkalkulation löschen?'))return;const before=h.estimates;h.estimates=before.filter(x=>x.id!==b.dataset.deleteEstimate);if(!save())h.estimates=before;render();return}
if(b.dataset.delete){const type=b.dataset.delete,id=b.dataset.id;if(type==='accounts'&&(state.transactions.some(t=>t.accountId===id)||state.recurring.some(r=>r.accountId===id)))return alert('Konto mit Buchungen oder wiederkehrenden Zahlungen kann nicht gelöscht werden.');if(type==='accounts'&&state.accounts.length<=1)return alert('Das letzte Konto kann nicht gelöscht werden.');if(confirm('Eintrag wirklich löschen?')){const before=state[type];state[type]=before.filter(x=>x.id!==id);if(!save())state[type]=before;render()}}
if(b.id==='export'){const blob=new Blob([JSON.stringify(workspace,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='budget-studio-0.8.1-alle-haushalte.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
if(b.id==='reset'&&confirm('Alle Konten und Buchungen in diesem Haushalt zurücksetzen? Andere Haushalte bleiben erhalten.')){const prior=household().data;household().data=blank();state=household().data;if(!save()){household().data=prior;state=prior}render()}
if(b.id==='choose-household')openPicker();
if(b.id==='rename-household'){const old=household().name,updated=prompt('Neuer Haushaltsname:',old);if(updated===null)return;const name=updated.trim();if(!name||name.length>60)return alert('Name muss zwischen 1 und 60 Zeichen lang sein.');household().name=name;if(!save())household().name=old;render()}
if(b.id==='delete-household'){if(workspace.households.length===1)return alert('Der letzte Haushalt kann nicht gelöscht werden.');if(!confirm(`Haushalt "${nameOfHousehold()}" mit ALLEN Buchungen unwiderruflich löschen? Bitte vorher eine JSON-Sicherung erstellen.`))return;const text=prompt('Zur Bestätigung LÖSCHEN eintippen:');if(text!=='LÖSCHEN')return;const previous=workspace.households,oldId=workspace.activeId;workspace.households=previous.filter(h=>h.id!==oldId);workspace.activeId=workspace.households[0].id;state=household().data;if(!save()){workspace.households=previous;workspace.activeId=oldId;state=household().data;return}if(workspace.households.length===1)resumeSingleHousehold();else openPicker()}
});
function updateTaxPreview(){const f=app.querySelector('form[data-form="transactions"]'),preview=app.querySelector('#tax-preview');if(!f||!preview)return;const val=Number(f.querySelector('[name="amount"]')?.value),mode=f.querySelector('[name="entryMode"]')?.value,rate=f.querySelector('[name="vatRate"]')?.value;const r=calculateTax(val,mode,rate);preview.textContent=r?`Netto: ${eur(r.net)} · Steueranteil: ${eur(r.vat)} · Brutto: ${eur(r.gross)}`:'Netto, Steueranteil und Brutto werden bei Eingabe berechnet.'}
app.addEventListener('input',e=>{if(e.target.id==='tx-filter'){const query=e.target.value.trim().toLocaleLowerCase('de-DE');let shown=0;app.querySelectorAll('[data-tx-entry]').forEach(row=>{const ok=row.dataset.search.includes(query);row.hidden=!ok;if(ok)shown++});const result=app.querySelector('#tx-filter-count');if(result)result.textContent=shown+' von '+app.querySelectorAll('[data-tx-entry]').length+' Buchungen';return}if(e.target.closest('form[data-form="transactions"]'))updateTaxPreview();if(e.target.closest('form[data-form="estimate"]'))updateEstimatePreview()});
app.addEventListener('change',async e=>{if(e.target.id==='bank-csv-file'){await onBankFile(e.target);return}if(e.target.closest('form[data-form="transactions"]'))updateTaxPreview();if(e.target.id==='month-select'){if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){selectedMonth=e.target.value;render()}return}if(e.target.id!=='import')return;const file=e.target.files[0];if(!file)return;if(file.size>5_000_000){alert('Sicherung zu groß (maximal 5 MB).');return}try{const data=JSON.parse(await file.text());
 if(validWorkspace(data)){if(!confirm('ALLE jetzigen Haushalte durch diese Sicherung ersetzen?'))return;const previous=workspace;workspace=data;workspace.households.forEach(h=>h.data=normalizeData(h.data));workspace.activeId=workspace.activeId||workspace.households[0].id;state=household().data;storageLocked=false;if(!save()){workspace=previous;state=household().data;return}if(workspace.households.length===1)resumeSingleHousehold();else{openPicker();render()}alert('Sicherung aller Haushalte wurde importiert.');return}
 if(validBackup(data)){if(!confirm('Alte Sicherung (0.5) als NEUEN Haushalt importieren? Vorhandene Haushalte bleiben erhalten.'))return;const newHousehold={id:uid(),name:'Importierter Haushalt',kind:'personal',members:[],data:normalizeData(data)};workspace.households.push(newHousehold);if(!save()){workspace.households.pop();return}openPicker();alert('Alter Datenstand wurde als zusätzlicher Haushalt importiert.');return}
 throw Error('Ungültige Sicherung')
}catch{alert('Datei konnte nicht als gültige Budget-Studio-Sicherung gelesen werden.')}});
// Android preview: keine Web-Service-Worker-Registrierung innerhalb von Capacitor.
if(!window.Capacitor&&'serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
// Without the picker, run the same due-payment check that selecting a household would run.
if(!choosing)applyRecurring();
render();householdPicker();
function networkStatus(){const el=document.querySelector('#offline-status');if(el){el.textContent=navigator.onLine?'':'Offline-Modus · Daten bleiben auf diesem Gerät';el.classList.toggle('visible',!navigator.onLine)}}
window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);networkStatus();
