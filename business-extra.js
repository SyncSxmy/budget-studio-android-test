'use strict';
/* Budget Studio 0.9.2 – optional business customer, damage and PDF reporting tools.
   No external cloud requests; small photographs are stored in the existing household JSON.
   Prototype for TEST DATA ONLY, no insurance expert opinion or secure customer-data vault. */
let assessorCustomerId=null,assessorCaseId=null,assessorEditCustomer=false,assessorEditCaseId=null,assessorEditRepairId=null;
function resetAssessorSelection(){assessorCustomerId=null;assessorCaseId=null;assessorEditCaseId=null;assessorEditCustomer=false;assessorEditRepairId=null}
function assessorCustomersData(){const h=household();if(!Array.isArray(h.assessorCustomers))h.assessorCustomers=[];return h.assessorCustomers}
function activeAssessorCustomer(){return assessorCustomersData().find(x=>x.id===assessorCustomerId)}
function activeAssessorCase(){return activeAssessorCustomer()?.cases?.find(x=>x.id===assessorCaseId)}
function assessorHeader(heading,desc){return `<div class="heading"><div><small>BUSINESS · GUTACHTER</small><h2>${esc(heading)}</h2><p class="muted">${esc(desc)}</p></div></div>`}
function assessorClients(){
 const customers=assessorCustomersData();
 return assessorHeader('Kundenübersicht','Kunden anlegen, Fahrzeugschäden dokumentieren und Berichte ausgeben.')+
 `<div class="assessor-summary"><div class="panel"><small>Kundenakten</small><strong>${customers.length}</strong></div><div class="panel"><small>Schadenfälle</small><strong>${customers.reduce((n,c)=>n+(c.cases?.length||0),0)}</strong></div><div class="panel"><small>Schadenbilder</small><strong>${customers.reduce((n,c)=>n+(c.cases||[]).reduce((m,k)=>m+(k.photos?.length||0),0),0)}</strong></div></div>`+
 `<div class="panel"><div class="row"><h3>Kundentabelle</h3><span class="muted">Nur in diesem Geschäftshaushalt</span></div>
 <label class="assessor-search">Kunden suchen<input type="search" id="assessor-customer-search" placeholder="Name, Kontakt oder Fahrzeug"></label>
 <div class="assessor-table-wrap"><table class="assessor-table"><thead><tr><th>Kunde</th><th>Kontakt</th><th>Schadenfälle</th><th></th></tr></thead><tbody id="assessor-client-rows">${customers.length?customers.map(c=>`<tr data-assessor-row data-search="${esc((c.name+' '+c.phone+' '+c.email+' '+(c.cases||[]).map(x=>x.vehicle+' '+x.plate).join(' ')).toLocaleLowerCase('de-DE'))}"><td><b>${esc(c.name)}</b></td><td>${esc(c.phone||c.email||'–')}</td><td>${(c.cases||[]).length}</td><td><button type="button" class="small-action" data-assessor-open-client="${esc(c.id)}">Öffnen ›</button></td></tr>`).join(''):'<tr><td colspan="4" class="muted">Noch keine Kunden vorhanden.</td></tr>'}</tbody></table></div></div>`+
 `<form class="panel form" data-form="assessor-customer"><h3 class="wide">Neuen Kunden anlegen</h3>
 <label>Name / Firma<input name="name" maxlength="100" required placeholder="z. B. Musterkunde"></label>
 <label>Telefon (optional)<input name="phone" type="tel" maxlength="60"></label>
 <label>E-Mail (optional)<input name="email" type="email" maxlength="120"></label>
 <label>Adresse (optional)<input name="address" maxlength="200"></label>
 <label class="wide">Notiz (optional)<textarea name="notes" maxlength="800" rows="2"></textarea></label>
 <button type="submit" class="primary wide">Kunden anlegen</button></form>`+
 `<p class="notice-panel"><b>Datenschutz:</b> Diese Testversion speichert Kunden- und Bilddaten lokal und unverschlüsselt in der App. Nutze bis zur sicheren Produktversion nur erfundene Testdaten. PDF-Berichte sind keine offiziellen Gutachten.</p>`;
}
function assessorCustomerForm(c){return `<form class="panel form" data-form="assessor-customer-edit"><h3 class="wide">Kundendaten bearbeiten</h3>
 <label>Name / Firma<input name="name" maxlength="100" value="${esc(c.name)}" required></label>
 <label>Telefon<input name="phone" maxlength="60" value="${esc(c.phone||'')}"></label>
 <label>E-Mail<input name="email" type="email" maxlength="120" value="${esc(c.email||'')}"></label>
 <label>Adresse<input name="address" maxlength="200" value="${esc(c.address||'')}"></label>
 <label class="wide">Notiz<textarea name="notes" maxlength="800" rows="2">${esc(c.notes||'')}</textarea></label>
 <button class="primary wide" type="submit">Kundendaten speichern</button></form>`}
function assessorCaseForm(k){return `<form class="panel form" data-form="assessor-case"><h3 class="wide">${k?'Schadenfall bearbeiten':'Neuen Schadenfall anlegen'}</h3>
 <label>Fahrzeug / Modell<input name="vehicle" maxlength="120" required placeholder="z. B. VW Golf VII" value="${esc(k?.vehicle||'')}"></label>
 <label>Kennzeichen<input name="plate" maxlength="30" placeholder="z. B. E-AB 123" value="${esc(k?.plate||'')}"></label>
 <label>FIN / VIN (optional)<input name="vin" maxlength="30" value="${esc(k?.vin||'')}"></label>
 <label>Schadendatum<input type="date" name="date" value="${esc(k?.date||dateToday())}" required></label>
 <label>Status<select name="status">${['In Bearbeitung','Besichtigt','Abgeschlossen'].map(s=>`<option value="${s}" ${k?.status===s?'selected':''}>${s}</option>`).join('')}</select></label>
 <label>Geschätzte Schadenkosten in € (optional)<input type="number" min="0" max="999999999" step="0.01" name="estimate" value="${k?.estimate!==null&&k?.estimate!==undefined?esc(k.estimate):''}"></label>
 <label class="wide">Schadenbeschreibung<textarea name="damage" maxlength="2400" rows="4" required placeholder="Festgestellte Beschädigungen, Hinweise …">${esc(k?.damage||'')}</textarea></label>
 <button class="primary wide" type="submit">${k?'Änderungen speichern':'Schadenfall speichern'}</button>${k?'<button type="button" class="wide" data-assessor-cancel-edit>Abbrechen</button>':''}</form>`}
function assessorClient(){
 const c=activeAssessorCustomer();if(!c)return assessorClients();
 const cases=c.cases||[];const edit=assessorEditCaseId?cases.find(k=>k.id===assessorEditCaseId):null;
 return `<button type="button" class="planning-back" data-open-view="assessorClients">‹ Zur Kundenliste</button>`+
 assessorHeader(c.name,'Kundenakte und zugeordnete Fahrzeuge / Schadenfälle')+
 `<div class="panel"><div class="row"><h3>Kontaktdaten</h3><button class="small-action" type="button" data-assessor-toggle-client>${assessorEditCustomer?'Schließen':'Bearbeiten'}</button></div>
 <div class="assessor-detail-grid"><div><small>Telefon</small><b>${esc(c.phone||'–')}</b></div><div><small>E-Mail</small><b>${esc(c.email||'–')}</b></div><div><small>Adresse</small><b>${esc(c.address||'–')}</b></div><div><small>Notiz</small><b>${esc(c.notes||'–')}</b></div></div></div>
 ${assessorEditCustomer?assessorCustomerForm(c):''}
 <div class="panel"><h3>${cases.length} Schadenfall / Schadenfälle</h3>${cases.length?`<div class="assessor-table-wrap"><table class="assessor-table"><thead><tr><th>Fahrzeug</th><th>Datum</th><th>Status</th><th></th></tr></thead><tbody>${[...cases].reverse().map(k=>`<tr><td><b>${esc(k.vehicle)}</b><div class="muted">${esc(k.plate||'ohne Kennzeichen')} · ${(k.photos||[]).length} Foto(s)</div></td><td>${esc(k.date)}</td><td>${esc(k.status)}</td><td><button type="button" class="small-action" data-assessor-open-case="${esc(k.id)}">Öffnen ›</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Noch keine Schadenfälle angelegt.</p>'}</div>
 ${assessorCaseForm(edit)}
 <button type="button" class="small-action assessor-delete" data-assessor-delete-client="${esc(c.id)}">Kundenakte inklusive Schadenfällen löschen</button>`;
}
function assessorCase(){
 const c=activeAssessorCustomer(),k=activeAssessorCase();if(!c||!k)return assessorClients();
 const photos=k.photos||[];
 return `<button type="button" class="planning-back" data-open-view="assessorClient">‹ Zur Kundenakte</button>`+
 assessorHeader(k.vehicle,'Schadenakte für '+c.name)+
 `<div class="panel assessor-case-header"><div class="row"><div><small>Fahrzeug / Kennzeichen</small><h3>${esc(k.vehicle)} · ${esc(k.plate||'ohne Kennzeichen')}</h3></div><span class="pill">${esc(k.status)}</span></div>
 <div class="assessor-detail-grid"><div><small>Schadendatum</small><b>${esc(k.date)}</b></div><div><small>FIN / VIN</small><b>${esc(k.vin||'–')}</b></div><div><small>Kunde</small><b>${esc(c.name)}</b></div><div><small>Geschätzte Kosten</small><b>${k.repairLines?.length?eur(assessorRepairTotals(k).gross)+' (berechnet)':k.estimate===null||k.estimate===undefined?'Nicht angegeben':eur(k.estimate)}</b></div></div>
 <h3>Schadenbeschreibung</h3><p class="assessor-damage">${esc(k.damage)}</p>
 <div class="assessor-actions"><button type="button" class="primary" data-assessor-pdf>PDF erstellen / drucken</button><button type="button" data-assessor-edit-case="${esc(k.id)}">Schaden bearbeiten</button><button type="button" class="assessor-delete" data-assessor-delete-case="${esc(k.id)}">Schadenfall löschen</button></div></div>
${assessorRepairHtml(k)}${photoGallery('case',photos)}
 <p class="notice-panel">Berichte sind eine <b>Dokumentationsvorlage</b>, kein rechtlich anerkanntes Schadengutachten. Reparaturwerte werden nur aus manuell eingegebenen Preisen errechnet. Originalteilenummern, Teilepreise und fachliche Reparaturwege müssen überprüft werden. Bitte keine echten Kundendaten in dieser ungesicherten Testversion verwenden.</p>`;
}
// Manually entered repair cost estimate: NO OEM-price/FIN provider is connected.
const REPAIR_TYPES=[['part','Originalteil / Ersatzteil'],['labor','Arbeitszeit / Montage'],['paint','Lackierung / Material'],['other','Weitere Kosten']];
function assessorRepairTotals(k){
 const lines=Array.isArray(k.repairLines)?k.repairLines:[],net=round2(lines.reduce((n,l)=>n+round2(l.qty*l.price),0));
 const rate=[0,7,19].includes(k.repairVatRate)?k.repairVatRate:19,vat=round2(net*rate/100);
 return {net,rate,vat,gross:round2(net+vat)};
}
function assessorRepairHtml(k){
 const lines=Array.isArray(k.repairLines)?k.repairLines:[],total=assessorRepairTotals(k),edit=lines.find(l=>l.id===assessorEditRepairId);
 const select=(values,current)=>values.map(([v,t])=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(t)}</option>`).join('');
 return `<section class="panel repair-panel"><div class="row"><div><h3>Reparaturkosten berechnen</h3><p class="muted">Originalteile, Arbeitszeit und Lackierung einzeln erfassen. Preise werden hier <b>manuell</b> eingetragen – noch keine FIN- oder Herstellerpreisanbindung.</p></div><span class="pill">${lines.length} Positionen</span></div>
 ${lines.length?`<div class="repair-table-wrap"><table class="repair-table"><thead><tr><th>Position</th><th>Menge</th><th>Einzel netto</th><th>Summe netto</th><th></th></tr></thead><tbody>${lines.map(l=>`<tr><td><b>${esc(l.title)}</b><div class="muted">${esc(REPAIR_TYPES.find(t=>t[0]===l.category)?.[1]||'Kosten')} · ${esc(l.manufacturer||'Hersteller nicht angegeben')}${l.partNumber?' · OE-Nr. '+esc(l.partNumber):''}${l.source?' · Quelle: '+esc(l.source):''}${l.priceDate?' · Stand: '+esc(l.priceDate):''}</div></td><td>${l.qty.toLocaleString('de-DE')} ${esc(l.unit)}</td><td>${eur(l.price)}</td><td><b>${eur(round2(l.qty*l.price))}</b></td><td><div class="repair-actions"><button type="button" class="small-action" data-assessor-edit-repair="${esc(l.id)}">Bearbeiten</button><button type="button" class="small-action assessor-delete" data-assessor-delete-repair="${esc(l.id)}">Löschen</button></div></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Noch keine Reparaturpositionen. Beginne mit einem Ersatzteil oder der Arbeitszeit.</p>'}
 <form class="form repair-entry" data-form="assessor-repair-line"><h3 class="wide">${edit?'Position bearbeiten':'＋ Neue Kostenposition'}</h3>
 <label>Art der Kosten<select name="category">${select(REPAIR_TYPES,edit?.category||'part')}</select></label>
 <label>Bezeichnung *<input name="title" maxlength="120" required placeholder="z. B. Stoßfänger vorne" value="${esc(edit?.title||'')}"></label>
 <label>Hersteller (optional)<input name="manufacturer" maxlength="70" placeholder="z. B. Mercedes-Benz" value="${esc(edit?.manufacturer||'')}"></label>
 <label>Originalteilenummer / OE-Nr. (optional)<input name="partNumber" maxlength="70" placeholder="Nur nach Prüfung eintragen" value="${esc(edit?.partNumber||'')}"></label>
 <label>Menge *<input name="qty" type="number" min="0.01" max="100000" step="any" required value="${edit?.qty??1}"></label>
 <label>Einheit<select name="unit">${select([['Stk','Stück'],['Std','Stunden'],['m','Meter'],['pauschal','Pauschal']],edit?.unit||'Stk')}</select></label>
 <label>Einzelpreis netto in € *<input name="price" type="number" min="0" max="9999999" step="0.01" required value="${edit?.price??0}"></label>
 <label>Preisstand (optional)<input name="priceDate" type="date" value="${esc(edit?.priceDate||'')}"></label>
 <label class="wide">Quelle / Preisbeleg (optional)<input name="source" maxlength="150" placeholder="z. B. Angebot Vertragshändler vom …" value="${esc(edit?.source||'')}"></label>
 <button type="submit" class="primary wide">${edit?'Änderungen an Position speichern':'Position zur Kalkulation hinzufügen'}</button>${edit?'<button class="wide" type="button" data-assessor-cancel-repair>Bearbeitung abbrechen</button>':''}</form>
 <div class="repair-totals"><div><span>Gesamt netto</span><b>${eur(total.net)}</b></div><label>Umsatzsteuer <select data-assessor-repair-tax>${select([['19','19 %'],['7','7 %'],['0','0 %']],String(total.rate))}</select></label><div><span>Steueranteil</span><b>${eur(total.vat)}</b></div><div class="repair-total-main"><span>Voraussichtliche Reparaturkosten brutto</span><strong>${eur(total.gross)}</strong></div></div>
 <p class="notice-panel"><b>Hinweis:</b> Preise und Teilenummern sind manuelle Eingaben. Weder Originalteil-Eignung noch verbindliche Herstellerpreise oder Reparaturzeiten werden automatisch geprüft. Die Kalkulation ersetzt kein fachliches Gutachten.</p></section>`;
}
function assessorText(form,key){return String(new FormData(form).get(key)||'').trim()}
function handleAssessorForm(form,type){
 if(!businessHousehold()||!tradesOf().includes('assessor'))return;
 const customers=assessorCustomersData();
 if(type==='assessor-repair-line'){
  const k=activeAssessorCase();if(!k)return;
  const get=n=>assessorText(form,n),category=get('category'),qty=Number(get('qty')),price=Number(get('price')),
   partNumber=get('partNumber'),manufacturer=get('manufacturer'),source=get('source'),priceDate=get('priceDate'),title=get('title'),unit=get('unit');
  if(!REPAIR_TYPES.some(t=>t[0]===category)||!title||title.length>120||manufacturer.length>70||partNumber.length>70||source.length>150||(priceDate&&!isDate(priceDate))||!['Stk','Std','m','pauschal'].includes(unit)||!Number.isFinite(qty)||qty<=0||qty>100000||!Number.isFinite(price)||price<0||price>9999999)return alert('Bitte Bezeichnung, Menge und Preis prüfen.');
  if(!Array.isArray(k.repairLines))k.repairLines=[];
  const data={category,title,manufacturer,partNumber,source,priceDate,unit,qty,price:round2(price)};
  const previous=assessorEditRepairId?k.repairLines.find(l=>l.id===assessorEditRepairId):null;
  if(previous){const before={...previous};Object.assign(previous,data);if(!save()){Object.assign(previous,before);return}}
  else{if(k.repairLines.length>=60)return alert('Maximal 60 Kostenpositionen je Schadenfall.');const line={id:uid(),...data};k.repairLines.push(line);if(!save()){k.repairLines.pop();return}}
  assessorEditRepairId=null;render();return;
 }
 if(['assessor-customer','assessor-customer-edit'].includes(type)){
  const d={name:assessorText(form,'name'),phone:assessorText(form,'phone'),email:assessorText(form,'email'),address:assessorText(form,'address'),notes:assessorText(form,'notes')};
  if(!d.name||d.name.length>100||d.phone.length>60||d.email.length>120||d.address.length>200||d.notes.length>800)return alert('Bitte Kundendaten prüfen.');
  if(type==='assessor-customer'){
   if(customers.length>=150)return alert('Maximal 150 Kundenakten in dieser Testversion.');
   const c={id:uid(),...d,cases:[]};customers.push(c);
   if(!save()){customers.pop();return}assessorCustomerId=c.id;assessorEditCustomer=false;setView('assessorClient');return;
  }
  const c=activeAssessorCustomer();if(!c)return;
  const before={name:c.name,phone:c.phone,email:c.email,address:c.address,notes:c.notes};Object.assign(c,d);
  if(!save()){Object.assign(c,before);return}assessorEditCustomer=false;render();return;
 }
 if(type==='assessor-case'){
  const c=activeAssessorCustomer();if(!c)return;
  if(!Array.isArray(c.cases))c.cases=[];
  const raw=assessorText(form,'estimate');const estimate=raw===''?null:Number(raw);
  const d={vehicle:assessorText(form,'vehicle'),plate:assessorText(form,'plate'),vin:assessorText(form,'vin'),date:assessorText(form,'date'),damage:assessorText(form,'damage'),status:assessorText(form,'status'),estimate};
  if(!d.vehicle||d.vehicle.length>120||d.plate.length>30||d.vin.length>30||!isDate(d.date)||!d.damage||d.damage.length>2400||!['In Bearbeitung','Besichtigt','Abgeschlossen'].includes(d.status)||(estimate!==null&&(!Number.isFinite(estimate)||estimate<0||estimate>999999999)))return alert('Bitte Fahrzeug- und Schadendaten prüfen.');
  if(assessorEditCaseId){
   const k=c.cases.find(x=>x.id===assessorEditCaseId);if(!k)return;
   const before={...k};Object.assign(k,d);if(!save()){Object.assign(k,before);return}
   assessorCaseId=k.id;assessorEditCaseId=null;setView('assessorCase');return;
  }
  if(c.cases.length>=100)return alert('Maximal 100 Schadenfälle pro Kunde.');
  const k={id:uid(),...d,photos:[]};c.cases.push(k);
  if(!save()){c.cases.pop();return}assessorCaseId=k.id;setView('assessorCase');return;
 }
}
function photoMimeData(file){return /^image\/(jpeg|png|webp)$/.test(file.type)&&file.size<=8_000_000}
function loadImageLocal(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Bild konnte nicht geöffnet werden.'))};img.src=url})}
async function compressedAssessorPhoto(file){
 if(!photoMimeData(file))throw Error('Nur JPG, PNG oder WebP bis 8 MB erlaubt.');
 const img=await loadImageLocal(file);if(!img.naturalWidth||!img.naturalHeight)throw Error('Bilddatei ungültig.');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Bildverarbeitung auf diesem Gerät nicht verfügbar.');
 let maxDimension=1280,quality=.76,url='';
 for(let attempt=0;attempt<6;attempt++){
  const scale=Math.min(1,maxDimension/Math.max(img.naturalWidth,img.naturalHeight));
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  url=canvas.toDataURL('image/jpeg',quality);
  if(url.length<=245000)break;
  quality=Math.max(.4,quality-.1);maxDimension=Math.round(maxDimension*.84);
 }
 if(url.length>245000)throw Error('Foto ist zu groß, bitte kleiner zuschneiden.');
 return {id:uid(),label:file.name.slice(0,70)||'Schadenfoto',dataUrl:url,width:canvas.width,height:canvas.height};
}
// PDF 1.4 writer: pure local PDF export with WinAnsi text and JPEG evidence images.
// Generates an A4 information report, intentionally not a legally binding expert opinion.
function pdfEscapeText(s){
 const map={'€':128,'„':132,'“':147,'”':148,'–':150,'—':151,'‘':145,'’':146,'…':133,'•':149};
 return Array.from(String(s??'')).map(ch=>{
  let n=ch.codePointAt(0);if(ch==='('||ch===')'||ch==='\\')return '\\'+ch;
  if(n<32&&ch!==' ')return ' ';if(map[ch])n=map[ch];
  if(n>255)return '?';return n>=127?'\\'+n.toString(8).padStart(3,'0'):ch;
 }).join('');
}
function pdfAsciiBytes(s){const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b}
function generateAssessorPdf(c,k,company){
 const photos=Array.isArray(k.photos)?k.photos:[];const docs=[];
 const alloc=()=>{docs.push(null);return docs.length};
 const assign=(i,...pieces)=>{docs[i-1]=pieces};
 const catId=alloc(),pagesId=alloc(),regFont=alloc(),boldFont=alloc();
 assign(regFont,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 assign(boldFont,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const pageIds=[];
 function emitPage(commands,images){
  const id=alloc(),streamId=alloc();pageIds.push(id);
  const resources=images.map((x,i)=>`/Im${i+1} ${x} 0 R`).join(' ');
  assign(id,`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regFont} 0 R /F2 ${boldFont} 0 R >> /XObject << ${resources} >> >> /Contents ${streamId} 0 R >>`);
  const content=commands.join('\n')+'\n';assign(streamId,`<< /Length ${content.length} >>\nstream\n`,pdfAsciiBytes(content),'endstream');
 }
 function text(cmd,x,y,s,size=11,bold=false){cmd.push(`BT /F${bold?2:1} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscapeText(s)}) Tj ET`)}
 function rule(cmd,y){cmd.push(`0.85 0.87 0.90 RG 40 ${y} m 555 ${y} l S`)}
 function wrap(s,limit=80){const text=String(s??'');return text.split(/\n/).flatMap(p=>{const words=p.split(/\s+/).filter(Boolean);if(!words.length)return [''];const out=[];let line='';for(const w of words){if(line&&line.length+1+w.length>limit){out.push(line);line=''}if(w.length>limit){if(line){out.push(line);line=''}for(let i=0;i<w.length;i+=limit)out.push(w.slice(i,i+limit));}else line=line?line+' '+w:w;}if(line)out.push(line);return out})}
 const first=[];first.push('0.15 0.38 0.32 rg 0 806 595 36 re f','0 0 0 rg');
 text(first,40,784,company,18,true);text(first,40,757,'Schadenfall – Kundenübersicht',15,true);
 text(first,40,733,'Erstellt am '+new Date().toLocaleDateString('de-DE'),9);rule(first,719);
 let y=690;
 function row(label,value){text(first,43,y,label,9,true);let vs=String(value||'–');const lines=wrap(vs,65);for(const line of lines.slice(0,2)){text(first,200,y,line,10);y-=15}if(!lines.length)y-=15;y-=9}
 row('Kunde',c.name);row('Telefon',c.phone);row('E-Mail',c.email);row('Adresse',c.address);row('Fahrzeug',k.vehicle);row('Kennzeichen',k.plate);row('FIN / VIN',k.vin);row('Schadendatum',k.date);row('Status',k.status);row('Kostenschätzung',k.estimate===null||k.estimate===undefined?'Keine Angabe':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(k.estimate));
 rule(first,y-2);y-=31;text(first,43,y,'Schadenbeschreibung',12,true);y-=22;
 for(const l of wrap(k.damage,85).slice(0,14)){text(first,43,y,l,10);y-=16}
 y-=18;rule(first,y);y-=25;text(first,43,y,photos.length+' zugeordnete(s) Foto(s) als Anlage',10,true);
 text(first,43,72,'Dokumentationsvorlage – kein offizielles Gutachten, keine Haftungs- oder',9);
 text(first,43,58,'Wertfeststellung. Angaben sind vor Verwendung fachlich zu prüfen.',9);
 emitPage(first,[]);
 const repair=Array.isArray(k.repairLines)?k.repairLines:[];
 if(repair.length){
  const total=assessorRepairTotals(k);
  for(let page=0;page<repair.length;page+=16){
   const cmd=[];text(cmd,40,790,'Reparaturkosten – '+k.vehicle,17,true);
   text(cmd,40,766,'Kunde: '+c.name+' · Positionen '+(page+1)+' bis '+Math.min(page+16,repair.length),10);rule(cmd,747);
   let pos=724;
   for(const l of repair.slice(page,page+16)){
    text(cmd,42,pos,(l.title||'Position').slice(0,48),10,true);
    text(cmd,42,pos-14,((l.partNumber?'OE-Nr. '+l.partNumber+' · ':'')+(l.manufacturer||'')+' '+(l.source?' | '+l.source:'')).slice(0,78),8);
    text(cmd,370,pos,l.qty+' '+l.unit,9);text(cmd,462,pos,new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(round2(l.qty*l.price))+' EUR',9,true);
    pos-=37;rule(cmd,pos+12);
   }
   if(page+16>=repair.length){pos=Math.max(92,pos-6);text(cmd,42,pos-5,'Netto: '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(total.net),11,true);
    text(cmd,42,pos-22,'USt ('+total.rate+' %): '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(total.vat),10);
    text(cmd,42,pos-40,'Brutto: '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(total.gross),12,true);}
   text(cmd,42,48,'Manuelle Beispielkalkulation; Positionen, Preisquellen und Steuersatz prüfen.',9);
   emitPage(cmd,[]);
  }
 }
 for(let start=0;start<photos.length;start+=2){
  const two=photos.slice(start,start+2),commands=[];text(commands,40,791,'Fotodokumentation – '+c.name,17,true);text(commands,40,766,k.vehicle+' · '+(k.plate||'ohne Kennzeichen'),11);rule(commands,748);
  const images=[];
  two.forEach((p,i)=>{
   const binary=atob(p.dataUrl.split(',')[1]||'');const b=new Uint8Array(binary.length);for(let j=0;j<binary.length;j++)b[j]=binary.charCodeAt(j);
   const id=alloc();assign(id,`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${b.length} >>\nstream\n`,b,'\nendstream');images.push(id);
   const areaTop=i===0?717:377,maxW=510,maxH=286,scale=Math.min(maxW/p.width,maxH/p.height),w=Math.round(p.width*scale),h=Math.round(p.height*scale),x=42+(maxW-w)/2,yImg=areaTop-h;
   commands.push(`q ${w} 0 0 ${h} ${x} ${yImg} cm /Im${i+1} Do Q`);
   text(commands,43,yImg-19,`Bild ${start+i+1}: ${p.label}`,10,true);
  });emitPage(commands,images);
 }
 assign(catId,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
 assign(pagesId,`<< /Type /Pages /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] /Count ${pageIds.length} >>`);
 const blobParts=['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];let byteCount=pdfAsciiBytes(blobParts[0]).length,offsets=[0];
 for(let i=0;i<docs.length;i++){
  offsets.push(byteCount);const start=`${i+1} 0 obj\n`,end='\nendobj\n';blobParts.push(pdfAsciiBytes(start));byteCount+=start.length;
  for(const piece of docs[i]){const raw=typeof piece==='string'?pdfAsciiBytes(piece):piece;blobParts.push(raw);byteCount+=raw.length}
  blobParts.push(pdfAsciiBytes(end));byteCount+=end.length;
 }
 const xrefStart=byteCount;
 let xref=`xref\n0 ${docs.length+1}\n0000000000 65535 f \n`;
 for(let i=1;i<offsets.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 xref+=`trailer\n<< /Size ${docs.length+1} /Root ${catId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
 blobParts.push(pdfAsciiBytes(xref));return new Blob(blobParts,{type:'application/pdf'});
}
async function exportAssessorPdf(){
 const c=activeAssessorCustomer(),k=activeAssessorCase();if(!c||!k)return;
 try{
  const resolved=await photoResolve(k.photos||[]);const pdf=generateAssessorPdf(c,{...k,photos:resolved},nameOfHousehold());
  const filename='Schadenbericht-'+(k.plate||k.vehicle).replace(/[^a-zA-Z0-9äöüÄÖÜß-]/g,'-').slice(0,35)+'-'+k.date+'.pdf';
  const native=window.Capacitor?.isNativePlatform?.(),plugins=window.Capacitor?.Plugins;
  if(native&&plugins?.Filesystem&&plugins?.Share){
   // On Android, share a PDF from the app cache using native Android share/print targets.
   const b64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(pdf)});
   await plugins.Filesystem.writeFile({path:filename,data:b64,directory:'CACHE'});
   const f=await plugins.Filesystem.getUri({path:filename,directory:'CACHE'});
   await plugins.Share.share({title:'Schadenbericht – '+c.name,text:'Kundenübersicht und Schadendokumentation',url:f.uri,dialogTitle:'PDF teilen oder drucken'});
   return;
  }
  const url=URL.createObjectURL(pdf),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){alert('PDF konnte nicht erstellt/geteilt werden: '+(e.message||e))}
}
function confirmAssessorDelete(message){return confirm(message+' Die Daten und Fotos gehen verloren. Vorher JSON-Sicherung erstellen!')}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||!document.querySelector('#app')?.contains(b))return;
 if(b.dataset.assessorOpenClient){assessorCustomerId=b.dataset.assessorOpenClient;assessorCaseId=null;assessorEditCaseId=null;assessorEditCustomer=false;setView('assessorClient');return}
 if(b.dataset.assessorOpenCase){assessorCaseId=b.dataset.assessorOpenCase;setView('assessorCase');return}
 if(b.hasAttribute('data-assessor-toggle-client')){assessorEditCustomer=!assessorEditCustomer;render();return}
 if(b.dataset.assessorEditCase){assessorEditCaseId=b.dataset.assessorEditCase;setView('assessorClient');return}
 if(b.hasAttribute('data-assessor-cancel-edit')){assessorEditCaseId=null;render();return}
 if(b.hasAttribute('data-assessor-pdf')){exportAssessorPdf();return}
 if(b.dataset.assessorEditRepair){assessorEditRepairId=b.dataset.assessorEditRepair;render();return}
 if(b.hasAttribute('data-assessor-cancel-repair')){assessorEditRepairId=null;render();return}
 if(b.dataset.assessorDeleteRepair){const k=activeAssessorCase();if(!k?.repairLines||!confirm('Kostenposition löschen?'))return;const i=k.repairLines.findIndex(l=>l.id===b.dataset.assessorDeleteRepair);if(i<0)return;const [old]=k.repairLines.splice(i,1);if(!save()){k.repairLines.splice(i,0,old);return}assessorEditRepairId=null;render();return}
 const c=activeAssessorCustomer(),k=activeAssessorCase();
 if(b.dataset.assessorDeleteClient){const idx=assessorCustomersData().findIndex(x=>x.id===b.dataset.assessorDeleteClient);if(idx<0||!confirmAssessorDelete('Kundenakte wirklich löschen?'))return;const [old]=assessorCustomersData().splice(idx,1);if(!save()){assessorCustomersData().splice(idx,0,old);return}photoCleanup((old.cases||[]).flatMap(k=>k.photos||[]));resetAssessorSelection();setView('assessorClients');return}
 if(b.dataset.assessorDeleteCase){if(!c||!k||!confirmAssessorDelete('Schadenfall wirklich löschen?'))return;const idx=c.cases.findIndex(x=>x.id===b.dataset.assessorDeleteCase);if(idx<0)return;const [old]=c.cases.splice(idx,1);if(!save()){c.cases.splice(idx,0,old);return}photoCleanup(old.photos||[]);assessorCaseId=null;setView('assessorClient');return}
 if(b.dataset.assessorRemovePhoto){if(!k||!confirm('Bild dauerhaft aus der Schadenakte entfernen?'))return;const idx=k.photos.findIndex(x=>x.id===b.dataset.assessorRemovePhoto);if(idx<0)return;const [old]=k.photos.splice(idx,1);if(!save()){k.photos.splice(idx,0,old);return}render();return}
 if(b.dataset.assessorRenamePhoto){if(!k)return;const pic=k.photos.find(x=>x.id===b.dataset.assessorRenamePhoto);if(!pic)return;const next=prompt('Bildbeschreibung:',pic.label);if(next===null)return;const label=next.trim().slice(0,70);if(!label)return;const old=pic.label;pic.label=label;if(!save()){pic.label=old;return}render()}
});
document.addEventListener('change',e=>{if(e.target.matches?.('[data-assessor-repair-tax]')){const k=activeAssessorCase();if(!k)return;const prior=k.repairVatRate;k.repairVatRate=Number(e.target.value);if(!save())k.repairVatRate=prior;render();}});
document.addEventListener('input',e=>{if(e.target.id!=='assessor-customer-search')return;const q=e.target.value.trim().toLocaleLowerCase('de-DE');document.querySelectorAll('[data-assessor-row]').forEach(row=>row.hidden=!row.dataset.search.includes(q))});
