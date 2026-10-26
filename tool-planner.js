'use strict';
/* Budget Studio 0.9.6 – local, transparent rule-based tool checklist.
   No network request or AI endpoint; estimates are planning aids, not verified tool requirements.
   Original customer, banking, and image datasets remain local and unchanged. */
const TOOLPLAN_MAX=65;
const TOOLPLAN_TRADE_RULES=[
 {id:'masonry',name:'Mauerwerk',match:/\b(mauerwerk|mauern|mauer\b|kalksandstein|kalksandsteine|porenbeton|ytong|planstein|ziegelmauer|klinker|verblender|ks.stein)\b/i,
  items:[['Maurerkelle','Hand','proWorker','Mörtel auftragen'],['Wasserwaage','Messen','perPair','Lagen ausrichten'],['Richtschnur und Schnurnägel','Messen','fixed','Flucht kontrollieren'],['Gummihammer','Hand','perPair','Steine ausrichten'],['Speisfass / Mörteleimer','Transport','per10','Mörtel bereitstellen'],['Mörtelrührgerät','Maschinen','per40','Mörtel anmischen'],['Schubkarre','Transport','per25','Material und Mörtel bewegen'],['Gliedermaßstab / Zollstock','Messen','perPair','Maße kontrollieren'],['Schutzhandschuhe','Schutz','proWorker','Arbeitsschutz'],['Schutzbrille','Schutz','proWorker','Schutz beim Trennen und Bearbeiten']]},
 {id:'turf',name:'Rollrasen',match:/\b(rollrasen|fertigrasen|rasensoden|rasenrolle|roll.rasen)\b/i,
  items:[['Rechen / Harke','Hand','perPair','Untergrund vorbereiten'],['Spaten','Hand','perPair','Bodenarbeiten'],['Schubkarre','Transport','per25','Rasenrollen und Erdreich transportieren'],['Rasenmesser / Cuttermesser','Hand','perPair','Bahnen zuschneiden'],['Rasenwalze','Maschinen','per150','Rasen andrücken'],['Gartenschlauch mit Brause','Maschinen','per150','Rasen nach dem Verlegen wässern'],['Gliedermaßstab / Maßband','Messen','fixed','Fläche und Zuschnitte prüfen'],['Arbeitshandschuhe','Schutz','proWorker','Handschutz']]},
 {id:'paint',name:'Malerarbeiten',match:/\b(streichen|anstrich|malern|malerarbeiten|farbe auftragen|waende streichen|wand streichen|decken streichen|lackieren)\b/i,
  items:[['Farbroller','Hand','proWorker','Farbe auftragen'],['Pinsel','Hand','proWorker','Ecken und Kanten bearbeiten'],['Farbwanne / Abstreifgitter','Hand','perPair','Farbe dosieren'],['Abdeckfolie und Malervlies','Schutz','fixed','Bereiche abdecken'],['Malerkrepp','Schutz','fixed','Kanten abkleben'],['Teleskopstange','Hand','perPair','Größere Flächen erreichen'],['Leiter / Arbeitsplattform (bei Bedarf)','Maschinen','fixed','Arbeitsbereich erreichen – Höhe und sicheren Zugang prüfen'],['Handschuhe','Schutz','proWorker','Schutz bei Beschichtungsarbeiten']]},
 {id:'tile',name:'Fliesenarbeiten',match:/\b(fliesen|fliesenlegen|fliesen verlegen|wandfliesen|bodenfliesen|verfugen)\b/i,
  items:[['Zahnkelle','Hand','proWorker','Fliesenkleber aufziehen'],['Fliesenschneider','Maschinen','per50','Fliesen zuschneiden'],['Wasserwaage / Richtscheit','Messen','perPair','Flucht und Ebenheit prüfen'],['Fliesenkreuze / Nivelliersystem','Hand','fixed','Gleichmäßige Fugen'],['Gummihammer','Hand','perPair','Fliesen anklopfen'],['Fugbrett','Hand','perPair','Fugenmörtel einarbeiten'],['Schwammbrett und Eimer','Hand','perPair','Fliesen reinigen'],['Rührgerät','Maschinen','per50','Kleber anrühren'],['Schutzbrille','Schutz','proWorker','Schutz beim Zuschneiden']]},
 {id:'plaster',name:'Putzarbeiten',match:/\b(verputzen|verputz|putzarbeiten|innenputz|außenputz|aussenputz|kalkzementputz|gipsputz|oberputz|filzen)\b/i,
  items:[['Glättkelle','Hand','proWorker','Putz auftragen und glätten'],['Kartätsche / Richtlatte','Hand','perPair','Flächen abziehen'],['Reibebrett / Filzbrett','Hand','proWorker','Putzoberfläche bearbeiten'],['Speisfass / Putzkübel','Transport','per15','Material bereitstellen'],['Rührgerät','Maschinen','per40','Putz anmischen'],['Wasserwaage','Messen','perPair','Ausrichtung prüfen'],['Abdeckmaterial','Schutz','fixed','Bauteile schützen'],['Handschuhe und Schutzbrille','Schutz','proWorker','Persönlicher Schutz']]},
 {id:'drywall',name:'Trockenbau',match:/\b(trockenbau|gipskarton|rigips|ständerwand|staenderwand|abhängdecke|abhaengdecke|deckenprofil)\b/i,
  items:[['Akkuschrauber','Maschinen','proWorker','Platten befestigen'],['Cuttermesser','Hand','proWorker','Platten zuschneiden'],['Wasserwaage / Laser','Messen','perPair','Profile ausrichten'],['Blechschere','Hand','perPair','Profile schneiden'],['Maßband','Messen','proWorker','Maße abnehmen'],['Plattenheber (bei Decken)','Maschinen','fixed','Schwere Deckenplatten positionieren'],['Schleifbrett / Schleifer mit Absaugung','Maschinen','perPair','Verspachtelung nacharbeiten'],['Schutzbrille und Staubschutz','Schutz','proWorker','Schutz bei staubigen Arbeiten']]},
 {id:'paving',name:'Pflasterarbeiten',match:/\b(pflastern|pflastersteine|pflasterarbeiten|verbundpflaster|wege pflastern|terrassenpflaster)\b/i,
  items:[['Rüttelplatte','Maschinen','per150','Untergrund und Belag verdichten – Eignung prüfen'],['Gummihammer','Hand','proWorker','Steine setzen'],['Richtschnur','Messen','fixed','Flucht prüfen'],['Wasserwaage / Richtscheit','Messen','perPair','Gefälle und Ebenheit prüfen'],['Schubkarre','Transport','per25','Steine und Bettungsmaterial transportieren'],['Schaufel','Hand','proWorker','Bettungsmaterial bewegen'],['Abziehlehre / Abziehrohr','Hand','perPair','Bettung abziehen'],['Steintrennmaschine','Maschinen','per80','Randsteine zuschneiden'],['Gehörschutz und Schutzbrille','Schutz','proWorker','Schutz bei Maschinenarbeiten']]},
 {id:'laminate',name:'Bodenbeläge',match:/\b(laminat|parkett|vinylboden|designboden|bodenbelag verlegen|klickvinyl|dielen verlegen)\b/i,
  items:[['Stichsäge / Kappsäge','Maschinen','per60','Beläge zuschneiden'],['Schlagklotz und Zugeisen','Hand','perPair','Elemente fügen'],['Abstandskeile','Hand','fixed','Randabstände einhalten'],['Maßband','Messen','proWorker','Maße und Zuschnitte prüfen'],['Winkel','Messen','perPair','Rechtwinkligkeit prüfen'],['Cuttermesser','Hand','perPair','Unterlage / geeignete Beläge schneiden'],['Knieschoner','Schutz','proWorker','Arbeitsschutz']]},
 {id:'hedge',name:'Gartenpflege',match:/\b(hecke schneiden|heckenschnitt|hecke kuerzen|hecke kürzen|sträucher schneiden|straeucher schneiden|gehölzschnitt|gehoelzschnitt)\b/i,
  items:[['Heckenschere','Maschinen','perPair','Gehölze schneiden'],['Gartenschere / Astschere','Hand','perPair','Einzelne Zweige nacharbeiten'],['Rechen','Hand','perPair','Schnittgut sammeln'],['Plane / Gartensack','Transport','per25','Schnittgut aufnehmen'],['Leiter / Arbeitsplattform (bei Bedarf)','Maschinen','fixed','Höhe und sicheren Zugang prüfen'],['Gehörschutz und Schutzbrille','Schutz','proWorker','Schutz bei Maschinenarbeiten'],['Arbeitshandschuhe','Schutz','proWorker','Handschutz']]},
 {id:'wallpaper',name:'Tapezierarbeiten',match:/\b(tapezieren|tapete|raufaser|vlies tapezieren)\b/i,
  items:[['Tapeziertisch','Hand','perPair','Bahnen vorbereiten'],['Tapeziermesser','Hand','proWorker','Bahnen schneiden'],['Kleisterbürste / Farbroller','Hand','perPair','Kleister auftragen'],['Andrückrolle / Tapezierbürste','Hand','proWorker','Tapete andrücken'],['Wasserwaage / Lot','Messen','perPair','Ausrichten'],['Eimer','Transport','perPair','Kleister bereitstellen'],['Abdeckfolie','Schutz','fixed','Umfeld schützen']]},
 {id:'cleaning',name:'Reinigungsarbeiten',match:/\b(grundreinigung|baureinigung|fensterreinigung|unterhaltsreinigung|reinigungsarbeiten|bodenreinigung)\b/i,
  items:[['Eimer / Wischsystem','Hand','perPair','Oberflächen reinigen'],['Mikrofasertücher','Hand','proWorker','Oberflächen abwischen'],['Besen und Kehrschaufel','Hand','perPair','Groben Schmutz entfernen'],['Staubsauger (geeignet)','Maschinen','per100','Staub entfernen'],['Warnschild Rutschgefahr','Schutz','fixed','Bereich absichern'],['Chemikaliengeeignete Schutzhandschuhe','Schutz','proWorker','Herstellerangaben prüfen']]},
 {id:'electrical',name:'Elektroarbeiten',match:/\b(elektroinstallation|steckdose installieren|steckdosen installieren|leitungen verlegen|elektroleitung|elektroarbeiten|schalter anschließen|schalter anschliessen)\b/i,
  items:[['Geeigneter zweipoliger Spannungsprüfer','Messen','perPair','Spannungsfreiheit fachgerecht prüfen'],['Isoliertes Werkzeug','Hand','proWorker','Für die Arbeit geeignetes Werkzeug'],['Abisolierzange','Hand','perPair','Leiter bearbeiten'],['Kabelschneider','Hand','perPair','Kabel zuschneiden'],['Maßband','Messen','perPair','Positionen abmessen'],['Persönliche Schutzausrüstung','Schutz','proWorker','Nach Gefährdungsbeurteilung']]}
 ,{id:'concrete',name:'Betonarbeiten',match:/\b(betonieren|betonage|beton einbauen|betonarbeiten|bewehrung verlegen|stahlbeton|fundament betonieren|bodenplatte betonieren)\b/i,
  items:[['Betonrüttler (falls erforderlich)','Maschinen','per50','Geeignete Verdichtung anhand Bauteil und Betonart prüfen'],['Abziehlatte / Richtscheit','Hand','perPair','Oberfläche abziehen'],['Wasserwaage / Baulaser','Messen','perPair','Höhe und Ebenheit kontrollieren'],['Schaufel / Betonverteiler','Hand','proWorker','Frischbeton verteilen'],['Glättkelle','Hand','proWorker','Oberfläche glätten'],['Betonstiefel und geeignete Handschuhe','Schutz','proWorker','Betonkontakt vermeiden'],['Schutzbrille','Schutz','proWorker','Persönlicher Schutz']]},
 {id:'plumbing',name:'Sanitär / SHK',match:/\b(sanitaer|sanitär|shk|wasserleitung|heizungsrohr|rohrinstallation|rohrleitungen|trinkwasserleitung|heizkoerper montieren|heizkörper montieren)\b/i,
  items:[['Rohrschneider für das Rohrsystem','Hand','perPair','Rohr passend und sauber schneiden'],['Rohrentgrater / Kalibrierer','Hand','perPair','Schnittflächen vorbereiten'],['Wasserwaage','Messen','perPair','Leitungen und Befestigungen ausrichten'],['Maßband / Zollstock','Messen','proWorker','Verlauf ausmessen'],['Presswerkzeug (systemabhängig)','Maschinen','perPair','Nur für zugelassenes Verbindungssystem'],['Lecksuchmittel / Dichtheitsprüfung (fachgerecht)','Messen','fixed','Prüfverfahren nach einschlägigen Regeln wählen'],['Handschuhe und Schutzbrille','Schutz','proWorker','Persönlicher Schutz']]},
 {id:'roof',name:'Dacharbeiten',match:/\b(dach eindecken|dachdecken|dachziegel|dachpfannen|dachabdichtung|dachsanierung|unterspannbahn|dacharbeiten)\b/i,
  items:[['Geeigneter Dachdeckerhammer','Hand','proWorker','Befestigungsarbeiten'],['Zollstock / Maßband','Messen','proWorker','Abstände messen'],['Schlagschnur','Messen','fixed','Linien markieren'],['Geeigneter Ziegel- oder Blechschneider','Maschinen','perPair','Materialabhängige Zuschnitte'],['Materialtransportgerät (bei Bedarf)','Transport','fixed','Material sicher auf das Dach bringen'],['Absturzschutz / geeignete Arbeitsplattform','Schutz','fixed','Vor Arbeitsbeginn Fachplanung und Sicherung nach Gefährdungsbeurteilung'],['Geeignete Arbeitshandschuhe und Helm','Schutz','proWorker','Persönlicher Schutz']]},
 {id:'catering',name:'Gastronomie / Catering',match:/\b(catering|buffet|speisenzubereitung|veranstaltungsservice|eventkueche|eventküche|mahlzeiten zubereiten|mittagessen vorbereiten|grillservice)\b/i,
  items:[['Geeignete Messer und Schneidebretter','Hand','perPair','Speisen vorbereiten'],['Küchenwaage','Messen','perPair','Portionen kontrollieren'],['Lebensmittelthermometer','Messen','perPair','Sichere Temperaturen prüfen'],['Geeignete GN-Behälter / Transportboxen','Transport','per25','Speisen sicher bereitstellen'],['Kühlmöglichkeit und Temperaturkontrolle','Maschinen','fixed','Kühlkette entsprechend Produkt prüfen'],['Hygieneausstattung / Einmalhandschuhe bei Bedarf','Schutz','proWorker','Hygieneplan einhalten'],['Reinigungs- und Desinfektionsausstattung','Schutz','fixed','Lebensmittelbereiche hygienisch reinigen']]},
 {id:'assessor',name:'Kfz-Schadenaufnahme',match:/\b(kfz.gutachten|unfallgutachten|schadenbegutachtung|schadenaufnahme|unfallschaden begutachten|fahrzeugbewertung|fahrzeuginspektion)\b/i,
  items:[['Kamera / Smartphone mit guter Kamera','Messen','fixed','Übersichts- und Detailfotos'],['Maßband und Messschieber','Messen','fixed','Schadenmaße erfassen'],['Taschenlampe','Hand','fixed','Verdeckte Bereiche ausleuchten'],['Fahrzeug-Dokumentationsbogen / Tablet','Hand','fixed','Schadenakte und Fahrzeugdaten erfassen'],['Lackschichtdickenmessgerät (optional)','Messen','fixed','Lackzustand prüfen'],['Diagnosegerät (nur bei Bedarf und Berechtigung)','Messen','fixed','Fehlerspeicher fachgerecht auslesen'],['Schutzhandschuhe','Schutz','proWorker','Sichere Fahrzeuguntersuchung']]}
];
const TOOLPLAN_VARIANTS=[
 {regex:/\b(ytong|porenbeton|gasbeton)\b/i,trade:'masonry',remove:['Steinsäge'],add:[['Porenbetonsäge','Maschinen','per50','Porenbeton passend zuschneiden'],['Zahnkelle / Dünnbettmörtelschlitten','Hand','perPair','Dünnbettmörtel auftragen']]},
 {regex:/\b(kalksandstein|ks.stein|klinker|ziegel|verblender)\b/i,trade:'masonry',add:[['Geeignete Steinsäge / Steinknacker','Maschinen','per75','Steine trennen – Staubschutz beachten']]},
 {regex:/\b(pflaster|pflastern)\b/i,trade:'paving',add:[['Fugenbesen','Hand','perPair','Fugenmaterial einkehren']]},
 {regex:/\b(fensterreinigung|fenster putzen)\b/i,trade:'cleaning',add:[['Einwascher und Abzieher','Hand','perPair','Glasflächen reinigen']]}
];
function toolPlannerText(x){return String(x??'').replace(/\s+/g,' ').trim().slice(0,3500)}
function toolPlannerSources(order){
 const lines=Array.isArray(order.lines)?order.lines:[];
 return [toolPlannerText(order.title),toolPlannerText(order.description),...lines.map(l=>toolPlannerText(l.desc))].join(' ');
}
function toolPlannerArea(text,lines){
 const values=[];
 for(const match of String(text).matchAll(/(\d+(?:[,.]\d+)?)\s*(?:m\s*(?:²|2|\^2)|qm\b|quadratmeter\b)/gi)){
  const n=Number(match[1].replace(',','.'));if(n>0&&n<=1e6)values.push(n);
 }
 if(values.length)return Math.max(...values);
 const sum=(Array.isArray(lines)?lines:[]).filter(l=>l.unit==='m²'&&Number.isFinite(Number(l.qty))&&Number(l.qty)>0).reduce((a,l)=>a+Number(l.qty),0);
 return sum>0&&sum<=1e6?sum:null;
}
function toolPlannerCount(mode,crew,area){
 const a=area||10;
 switch(mode){case 'proWorker':return crew;case 'perPair':return Math.max(1,Math.ceil(crew/2));case 'per10':return Math.max(1,Math.min(crew+2,Math.ceil(a/10)));case 'per15':return Math.max(1,Math.min(crew+2,Math.ceil(a/15)));case 'per25':return Math.max(1,Math.min(crew+2,Math.ceil(a/25)));case 'per40':return Math.max(1,Math.min(crew,Math.ceil(a/40)));case 'per50':return Math.max(1,Math.min(crew,Math.ceil(a/50)));case 'per60':return Math.max(1,Math.min(crew,Math.ceil(a/60)));case 'per75':return Math.max(1,Math.min(crew,Math.ceil(a/75)));case 'per80':return Math.max(1,Math.min(crew,Math.ceil(a/80)));case 'per100':return Math.max(1,Math.min(crew,Math.ceil(a/100)));case 'per150':return Math.max(1,Math.min(crew,Math.ceil(a/150)));default:return 1;}
}
function toolPlannerSuggest(order,crew=1){
 crew=Math.min(20,Math.max(1,Math.round(Number(crew)||1)));
 const text=toolPlannerSources(order),area=toolPlannerArea(text,order.lines),matches=TOOLPLAN_TRADE_RULES.filter(r=>r.match.test(text));
 const merged=new Map();
 for(const rule of matches){
  let rows=rule.items.slice();
  for(const variant of TOOLPLAN_VARIANTS.filter(v=>v.trade===rule.id&&v.regex.test(text))){
   rows=rows.filter(x=>!variant.remove?.includes(x[0]));rows.push(...(variant.add||[]));
  }
  for(const [name,category,mode,reason] of rows){
   const key=name.toLocaleLowerCase('de-DE');const qty=toolPlannerCount(mode,crew,area);
   const old=merged.get(key);
   if(old){old.qty=Math.max(old.qty,qty);continue}
   merged.set(key,{id:crypto.randomUUID?crypto.randomUUID():('tool-'+Date.now()+'-'+merged.size),name,qty,unit:'Stk.',category,reason,checked:false});
  }
 }
 const warnings=[];
 if(!matches.length)warnings.push('Tätigkeit nicht erkannt. Ergänze bitte den Auftrag um das Gewerk und die Arbeit (z. B. „Kalksandstein mauern“, „Rollrasen verlegen“). Du kannst Werkzeuge selbst ergänzen.');
 if(!area)warnings.push('Keine Fläche erkannt. Die Werkzeuganzahlen berücksichtigen nur die Mannschaftsgröße; für eine passende Mengenschätzung m² im Auftrag ergänzen.');
 if(matches.some(m=>m.id==='masonry'||m.id==='drywall'||m.id==='paint'))warnings.push('Arbeitshöhe, Zugänglichkeit und benötigte Arbeits-/Schutzgerüste vor Ort prüfen.');
 if(matches.some(m=>m.id==='electrical'))warnings.push('Elektroarbeiten ausschließlich durch entsprechend qualifizierte Personen durchführen lassen.');
 if(matches.some(m=>m.id==='turf'))warnings.push('Bodenvorbereitung, Bewässerungsanschluss und Transportwege vor Ort prüfen.');
 return {version:1,source:'regelbasiert',createdAt:new Date().toISOString(),teamSize:crew,areaM2:area,matched:matches.map(x=>x.name),warnings:warnings.slice(0,8),items:[...merged.values()].slice(0,TOOLPLAN_MAX)};
}
function toolPlannerValid(p){return p&&p.version===1&&p.source==='regelbasiert'&&typeof p.createdAt==='string'&&p.createdAt.length<=60&&Number.isInteger(p.teamSize)&&p.teamSize>=1&&p.teamSize<=20&&(p.areaM2===null||(Number.isFinite(p.areaM2)&&p.areaM2>0&&p.areaM2<=1e6))&&Array.isArray(p.matched)&&p.matched.length<=16&&p.matched.every(x=>typeof x==='string'&&x.length<=80)&&Array.isArray(p.warnings)&&p.warnings.length<=12&&p.warnings.every(x=>typeof x==='string'&&x.length<=350)&&Array.isArray(p.items)&&p.items.length<=TOOLPLAN_MAX&&p.items.every(i=>i&&typeof i.id==='string'&&i.id.length<=100&&typeof i.name==='string'&&i.name.trim().length>0&&i.name.length<=120&&Number.isInteger(i.qty)&&i.qty>=1&&i.qty<=30&&i.unit==='Stk.'&&typeof i.category==='string'&&i.category.length<=50&&typeof i.reason==='string'&&i.reason.length<=220&&typeof i.checked==='boolean')}
function toolPlannerInput(order){
 const p=order?.toolPlan;
 return `<section class="panel toolplan-panel" id="toolplan-form-panel" data-tool-manual="0"><div class="row"><div><h3>3. Werkzeugassistent</h3><p class="muted">Automatische Vorschläge aus Tätigkeit, Beschreibung und m²-Menge. Keine Vorlagen nötig.</p></div></div>
 <div class="toolplan-controls"><label>Personen auf der Baustelle<input name="toolTeamSize" type="number" min="1" max="20" step="1" value="${Number.isInteger(p?.teamSize)?p.teamSize:1}"></label><button type="button" class="primary" data-tool-generate>⚒ Werkzeuge ermitteln</button></div>
 <div id="toolplan-form-result" data-generated="${toolPlannerValid(p)?'1':'0'}">${toolPlannerValid(p)?toolPlannerInner(p,true):'<p class="muted">Gib oben deine Tätigkeit ein. Sobald sie erkannt wird, schlagen wir die Werkzeuge vor. Du kannst die Liste danach anpassen und abhaken.</p>'}</div>
 <p class="muted toolplan-disclaimer">Beta: Regelbasierte, unverbindliche Planungshilfe. Keine echte KI oder Gerätebestandsprüfung. Vor Ort auf Eignung, Anzahl und Arbeitsschutz prüfen.</p></section>`;
}
function toolPlannerInner(p,inForm){
 const done=p.items.filter(i=>i.checked).length;
 const summary=p.matched.length?`Erkannt: ${p.matched.join(', ')}`:'Noch kein unterstütztes Gewerk erkannt';
 return `<div class="toolplan-synopsis"><b>${esc(summary)}</b><span>${p.areaM2?` · ca. ${p.areaM2.toLocaleString('de-DE')} m²`:''} · ${p.teamSize} Person(en)</span><span class="toolplan-progress">${done} von ${p.items.length} abgehakt</span></div>
 ${p.items.length?`<div class="toolplan-list">${p.items.map(i=>toolPlannerItem(i,inForm)).join('')}</div>`:'<p>Für diese Tätigkeit konnten wir noch keine verlässliche Werkzeugliste erzeugen. Bitte die Beschreibung präzisieren oder manuell ergänzen.</p>'}
 ${p.warnings.length?`<div class="toolplan-warnings">${p.warnings.map(w=>`<p>ℹ ${esc(w)}</p>`).join('')}</div>`:''}
 <div class="toolplan-add"><label>Weiteres Werkzeug<input class="toolplan-add-name" type="text" maxlength="120" placeholder="z. B. Fugenkelle"></label><button type="button" data-tool-add>＋ Hinzufügen</button></div>`;
}
function toolPlannerItem(i,inForm){return `<div class="toolplan-item" data-tool-id="${esc(i.id)}"><label class="toolplan-check" title="Als eingepackt / bereit abhaken"><input type="checkbox" data-tool-check ${i.checked?'checked':''}><span class="sr-only">Werkzeug bereitlegen</span></label><div class="toolplan-item-body"><input aria-label="Werkzeugbezeichnung" class="toolplan-item-name" type="text" maxlength="120" value="${esc(i.name)}"><small>${esc(i.category)}${i.reason?` · ${esc(i.reason)}`:''}</small></div><label class="toolplan-item-qty">Anzahl<input aria-label="Anzahl" type="number" min="1" max="30" step="1" value="${i.qty}" data-tool-qty></label><button type="button" data-tool-remove aria-label="Werkzeug entfernen" title="Werkzeug entfernen">×</button></div>`}
function toolPlannerCollect(form){
 const host=form.querySelector('#toolplan-form-panel');const result=host?.querySelector('#toolplan-form-result');if(!host||result?.dataset.generated!=='1')return null;
 const p=host.__toolPlan;if(!p||!toolPlannerValid(p))throw Error('Werkzeugliste bitte noch einmal erzeugen.');
 const items=[...result.querySelectorAll('.toolplan-item')].map(row=>{
  const old=p.items.find(x=>x.id===row.dataset.toolId)||{};
  return {...old,id:row.dataset.toolId,name:row.querySelector('.toolplan-item-name').value.trim(),qty:Number(row.querySelector('[data-tool-qty]').value),checked:row.querySelector('[data-tool-check]').checked};
 });
 const teamSize=Number(form.elements.toolTeamSize?.value||1);
 const plan={...p,teamSize,items};
 if(!toolPlannerValid(plan))throw Error('Werkzeugliste prüfen: Namen dürfen nicht leer und Mengen müssen zwischen 1 und 30 liegen.');
 return plan;
}
function toolPlannerGenerateForm(form,force=false){
 const host=form.querySelector('#toolplan-form-panel'),res=host?.querySelector('#toolplan-form-result');if(!host||!res)return;
 if(force&&res.dataset.generated==='1'&&host.dataset.toolManual==='1'&&!confirm('Die bearbeitete Werkzeugliste durch neue Vorschläge ersetzen?'))return;
 const fd=new FormData(form),descs=fd.getAll('positionDesc'),qtys=fd.getAll('positionQty'),units=fd.getAll('positionUnit');
 const order={title:fd.get('title'),description:fd.get('description'),lines:descs.map((desc,i)=>({desc,qty:Number(qtys[i]),unit:units[i]}))};
 const p=toolPlannerSuggest(order,Number(fd.get('toolTeamSize'))||1);
 if(!force&&!p.matched.length)return;
 host.__toolPlan=p;host.dataset.toolManual='0';host.dataset.toolSource=toolPlannerFingerprint(form);res.dataset.generated='1';res.innerHTML=toolPlannerInner(p,true);
}
function toolPlannerFingerprint(form){const fd=new FormData(form);return JSON.stringify([fd.get('title'),fd.get('description'),fd.getAll('positionDesc'),fd.getAll('positionQty'),fd.getAll('positionUnit'),fd.get('toolTeamSize')]);}
function toolPlannerInitForm(form,order){const host=form?.querySelector('#toolplan-form-panel');if(!host)return;if(toolPlannerValid(order?.toolPlan)){host.__toolPlan=structuredClone(order.toolPlan);host.dataset.toolSource=toolPlannerFingerprint(form);}else toolPlannerGenerateForm(form,false)}
function toolPlannerMaybeRefresh(form){const host=form?.querySelector('#toolplan-form-panel');if(!host)return;const source=toolPlannerFingerprint(form);if(source===host.dataset.toolSource)return;
 if(host.dataset.toolManual==='1'){let note=host.querySelector('.toolplan-stale');if(!note){note=document.createElement('p');note.className='toolplan-stale';note.textContent='Auftragsangaben geändert: Vorschläge über „Werkzeuge ermitteln“ aktualisieren. Deine Änderungen bleiben bis dahin erhalten.';host.append(note)}return;}
 toolPlannerGenerateForm(form,false);}
function toolPlannerDetail(o){const p=o.toolPlan;return `<section class="panel toolplan-panel"><h3>Werkzeug-Checkliste</h3><p class="muted">Bereitlegen und vor dem Einsatz abhaken. Die Liste gehört nur zu diesem Auftrag.</p><div class="toolplan-controls"><label>Personen<input id="toolplan-detail-team" type="number" min="1" max="20" value="${toolPlannerValid(p)?p.teamSize:1}"></label><button type="button" data-tool-detail-generate="${esc(o.id)}" class="primary">⚒ ${toolPlannerValid(p)?'Neu berechnen':'Werkzeuge ermitteln'}</button></div>${toolPlannerValid(p)?toolPlannerInner(p,false):'<p class="muted">Noch keine Werkzeugliste erstellt. Tippe auf „Werkzeuge ermitteln“.</p>'}<p class="muted toolplan-disclaimer">Beta: Regelbasierte, unverbindliche Planungshilfe, kein Ersatz für Fachplanung oder Gefährdungsbeurteilung.</p></section>`}
function toolPlannerPrint(o){const p=o?.toolPlan;if(!toolPlannerValid(p))return '';
 return `<h2>Werkzeug-Checkliste (${p.items.filter(i=>i.checked).length}/${p.items.length} abgehakt)</h2><p>${esc(p.matched.join(', ')||'Manuell ergänzt')}${p.areaM2?' · ca. '+p.areaM2.toLocaleString('de-DE')+' m²':''} · ${p.teamSize} Person(en)</p><table><thead><tr><th>Bereit</th><th>Werkzeug</th><th>Anzahl</th></tr></thead><tbody>${p.items.map(i=>`<tr><td>${i.checked?'☑':'☐'}</td><td>${esc(i.name)}</td><td>${i.qty}</td></tr>`).join('')}</tbody></table><p style="font-size:11px;color:#666">Unverbindliche Werkzeugplanung – vor Ort prüfen. ${esc(p.warnings.join(' '))}</p>`;
}
function toolPlannerDetailChange(e){const b=e.target.closest('[data-tool-id]');if(!b||!document.querySelector('#app')?.contains(b)||!document.querySelector('.toolplan-panel')||document.querySelector('#order-edit-form'))return;
 const o=ordersData().find(x=>x.id===orderActiveId);if(!o||!toolPlannerValid(o.toolPlan))return;
 const i=o.toolPlan.items.find(x=>x.id===b.dataset.toolId);if(!i)return;
 const snapshot=structuredClone(o.toolPlan);
 if(e.target.matches('[data-tool-check]'))i.checked=e.target.checked;
 else if(e.target.matches('[data-tool-qty]'))i.qty=Number(e.target.value);
 else if(e.target.matches('.toolplan-item-name'))i.name=e.target.value.trim();
 else return;
 if(!toolPlannerValid(o.toolPlan)||!save()){o.toolPlan=snapshot;alert('Änderung konnte nicht gespeichert werden. Bitte die Eingabe überprüfen.');}render();
}
function toolPlannerDetailAdd(name){const o=ordersData().find(x=>x.id===orderActiveId);if(!o||!toolPlannerValid(o.toolPlan))return;
 name=name.trim();if(!name||name.length>120)return alert('Bitte ein Werkzeug eingeben (max. 120 Zeichen).');if(o.toolPlan.items.length>=TOOLPLAN_MAX)return alert('Maximal 65 Werkzeuge je Auftrag.');
 const prior=structuredClone(o.toolPlan);o.toolPlan.items.push({id:uid(),name,qty:1,unit:'Stk.',category:'Ergänzt',reason:'Manuell hinzugefügt',checked:false});if(!save()){o.toolPlan=prior;return}render();
}
function toolPlannerDetailRemove(id){const o=ordersData().find(x=>x.id===orderActiveId);if(!o||!toolPlannerValid(o.toolPlan))return;
 const prior=structuredClone(o.toolPlan);o.toolPlan.items=o.toolPlan.items.filter(i=>i.id!==id);if(!save()){o.toolPlan=prior;return}render();}
function toolPlannerDetailGenerate(team){const o=ordersData().find(x=>x.id===orderActiveId);if(!o)return;
 if(toolPlannerValid(o.toolPlan)&&!confirm('Die bisherige Werkzeugliste inklusive Häkchen durch neue Vorschläge ersetzen?'))return;
 const prior=o.toolPlan;o.toolPlan=toolPlannerSuggest(o,team);if(!save()){o.toolPlan=prior;return}render();}
// Delegated listeners coexist with the existing order module.
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||!document.querySelector('#app')?.contains(b))return;
 if(b.matches('[data-tool-generate]')){const form=b.closest('form');if(form)toolPlannerGenerateForm(form,true);return}
 if(b.matches('[data-tool-detail-generate]')){toolPlannerDetailGenerate(Number(document.querySelector('#toolplan-detail-team')?.value)||1);return}
 if(b.matches('[data-tool-add]')){const panel=b.closest('.toolplan-panel');const input=panel?.querySelector('.toolplan-add-name');if(!input)return;
  if(panel.id==='toolplan-form-panel'){
   const form=panel.closest('form'),res=panel.querySelector('#toolplan-form-result');if(res.dataset.generated!=='1')toolPlannerGenerateForm(form,true);
   const p=panel.__toolPlan;if(!p||p.items.length>=TOOLPLAN_MAX)return alert('Maximal 65 Werkzeuge.');
   const name=input.value.trim();if(!name||name.length>120)return alert('Bitte Werkzeugnamen eingeben.');
   const item={id:uid(),name,qty:1,unit:'Stk.',category:'Ergänzt',reason:'Manuell hinzugefügt',checked:false};p.items.push(item);res.querySelector('.toolplan-list')?.insertAdjacentHTML('beforeend',toolPlannerItem(item,true));
   if(!res.querySelector('.toolplan-list')){res.innerHTML=toolPlannerInner(p,true)}
   panel.dataset.toolManual='1';input.value='';return;
  }
  toolPlannerDetailAdd(input.value);return;
 }
 if(b.matches('[data-tool-remove]')){
  const panel=b.closest('.toolplan-panel'),row=b.closest('.toolplan-item');if(!row)return;
  if(panel?.id==='toolplan-form-panel'){
   const p=panel.__toolPlan;if(p){p.items=p.items.filter(i=>i.id!==row.dataset.toolId);row.remove();panel.dataset.toolManual='1';}return;
  }
  toolPlannerDetailRemove(row.dataset.toolId);return;
 }
});
document.addEventListener('change',e=>{
 const form=e.target.closest('#order-edit-form');
 if(form){
  const panel=e.target.closest('#toolplan-form-panel');if(panel){
   if(e.target.matches('[data-tool-check],[data-tool-qty],.toolplan-item-name'))panel.dataset.toolManual='1';
   if(e.target.matches('[name=toolTeamSize]')){if(panel.dataset.toolManual!=='1')toolPlannerMaybeRefresh(form);else panel.querySelector('.toolplan-stale')||panel.insertAdjacentHTML('beforeend','<p class="toolplan-stale">Personenzahl geändert – Vorschläge bei Bedarf aktualisieren.</p>');}
  }else if(e.target.matches('[name=title],[name=description],[name=positionDesc],[name=positionQty],[name=positionUnit]'))toolPlannerMaybeRefresh(form);
  return;
 }
 if(e.target.matches('[data-tool-check],[data-tool-qty],.toolplan-item-name'))toolPlannerDetailChange(e);
});
