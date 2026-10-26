'use strict';
/* Budget Studio test photo storage. In vault mode, photos are encrypted with AES-GCM in a separate IndexedDB; legacy photos are migrated on opt-in. */
const PHOTO_LIMIT=30;
const PHOTO_DB_NAME='budget-studio-photo-v1';
let photoDbPromise;
function photoOpenDb(){
 if(!('indexedDB' in window))return Promise.reject(Error('Dieser Browser unterstützt den Fotospeicher nicht.'));
 if(!photoDbPromise)photoDbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(PHOTO_DB_NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos',{keyPath:'id'})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Fotospeicher konnte nicht geöffnet werden.'));
 }).catch(e=>{photoDbPromise=null;throw e});
 return photoDbPromise;
}
async function photoPut(id,dataUrl){
 if(BudgetStudioCrypto.enabled())return BudgetStudioCrypto.savePhoto(id,dataUrl);
 const db=await photoOpenDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put({id,dataUrl});
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Fotospeicher voll oder nicht verfügbar.'));
 });
}
async function photoGet(id){
 if(BudgetStudioCrypto.enabled())return BudgetStudioCrypto.getPhoto(id);
 const db=await photoOpenDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction('photos','readonly'),req=tx.objectStore('photos').get(id);
  req.onsuccess=()=>resolve(req.result?.dataUrl||null);req.onerror=()=>reject(req.error);
 });
}
async function photoDelete(id){
 if(BudgetStudioCrypto.enabled()){await BudgetStudioCrypto.flush();return BudgetStudioCrypto.deletePhoto(id)}
 const db=await photoOpenDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(id);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });
}
async function photoClearPlain(){
 const db=await photoOpenDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction('photos','readwrite');tx.objectStore('photos').clear();
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Alte Fotos konnten nicht gelöscht werden.'));
 });
}
function photoRefs(ws){
 const out=[];
 for(const h of ws.households||[]){
  for(const c of h.assessorCustomers||[])for(const k of c.cases||[])for(const p of k.photos||[])out.push(p);
  for(const o of h.orders||[])for(const p of o.photos||[])out.push(p);
 }
 return out;
}
function photoRecord(kind){if(kind==='case')return activeAssessorCase();if(kind==='order')return ordersData().find(o=>o.id===orderActiveId);return null}
function photoGallery(kind,photos){
 const label=kind==='case'?'Schadenfall':'Auftrag';const list=Array.isArray(photos)?photos:[];
 return `<section class="panel photo-panel"><div class="row"><h3>Fotos zum ${label}</h3><span class="pill">${list.length} / ${PHOTO_LIMIT}</span></div>
 <p class="muted">Bis zu 30 Bilder pro ${label}. JPG, PNG oder WebP auswählen. Die Bilder werden verkleinert und lokal gespeichert${BudgetStudioCrypto.enabled()?' (verschlüsselt)':' (noch unverschlüsselt)'}. Beschreibung und Bildreihenfolge erscheinen im Ausdruck.</p>
 <label class="assessor-photo-picker">＋ Fotos hinzufügen<input type="file" data-photo-upload="${kind}" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple ${list.length>=PHOTO_LIMIT?'disabled':''}></label>
 <div class="assessor-photo-grid">${list.map((p,i)=>`<div class="assessor-photo-card"><img ${p.dataUrl&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.dataUrl)?`src="${p.dataUrl}"`:`data-photo-ref="${esc(p.id)}"`} alt="${esc(p.label)}" loading="lazy"><div class="assessor-photo-footer"><span title="${esc(p.label)}">${i+1}. ${esc(p.label)}</span><div><button type="button" class="small-action" data-photo-rename="${esc(p.id)}" data-photo-kind="${kind}" aria-label="Bildbeschreibung bearbeiten">✎</button><button type="button" class="small-action assessor-delete" data-photo-delete="${esc(p.id)}" data-photo-kind="${kind}" aria-label="Foto löschen">×</button></div></div></div>`).join('')||'<p class="muted">Noch keine Fotos hinzugefügt.</p>'}</div>
 <p class="muted photo-storage-note">Tipp: Exportiere vor einem Gerätewechsel eine neue Datensicherung. Ohne Sicherung gehen lokale Fotos beim Löschen der App-Daten verloren.</p></section>`;
}
async function photoHydrate(){
 for(const node of document.querySelectorAll('img[data-photo-ref]')){
  const id=node.dataset.photoRef;
  try{const url=await photoGet(id);if(node.isConnected&&node.dataset.photoRef===id){if(url)node.src=url;else{node.alt='Foto nicht gefunden – Datensicherung prüfen';node.classList.add('photo-missing')}}}
  catch{if(node.isConnected)node.alt='Foto kann nicht geladen werden';}
 }
}
async function photoCompress(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>16_000_000)throw Error('Nur JPG, PNG oder WebP bis 16 MB auswählen.');
 const img=await loadImageLocal(file);if(!img.naturalWidth||!img.naturalHeight)throw Error('Bilddatei kann nicht gelesen werden.');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Bildverarbeitung nicht verfügbar.');
 let size=1400,quality=.78,url='';
 for(let i=0;i<8;i++){
  const factor=Math.min(1,size/Math.max(img.naturalWidth,img.naturalHeight));
  canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  url=canvas.toDataURL('image/jpeg',quality);
  if(url.length<=280000)break;
  quality=Math.max(.40,quality-.07);size=Math.max(400,Math.round(size*.84));
 }
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(url)||url.length>280000)throw Error('Dieses Foto kann nicht ausreichend verkleinert werden.');
 return {id:uid(),label:(file.name||'Foto').slice(0,70),width:canvas.width,height:canvas.height,dataUrl:url};
}
async function photoUpload(kind,input){
 const record=photoRecord(kind),files=[...(input.files||[])];if(!record||!files.length)return;
 if(!Array.isArray(record.photos))record.photos=[];
 if(record.photos.length+files.length>PHOTO_LIMIT){alert(`Es sind maximal ${PHOTO_LIMIT} Bilder pro ${kind==='case'?'Schadenfall':'Auftrag'} möglich. Noch ${PHOTO_LIMIT-record.photos.length} frei.`);input.value='';return}
 input.disabled=true;const added=[];
 try{
  for(const file of files){
   const photo=await photoCompress(file);
   await photoPut(photo.id,photo.dataUrl);
   added.push({id:photo.id,label:photo.label,width:photo.width,height:photo.height});
  }
  record.photos.push(...added);
  if(!save()){record.photos.splice(-added.length,added.length);for(const p of added)await photoDelete(p.id);return}
  render();
 }catch(err){for(const p of added)await photoDelete(p.id).catch(()=>{});alert('Fotos konnten nicht gespeichert werden: '+(err.message||err))}
 finally{input.disabled=false;input.value=''}
}
async function photoResolve(photos){
 const resolved=[];
 for(const p of photos||[]){
  const dataUrl=p.dataUrl||await photoGet(p.id);
  if(!dataUrl)throw Error('Das Foto „'+p.label+'“ fehlt im lokalen Speicher. Bitte Datensicherung prüfen.');
  resolved.push({...p,dataUrl});
 }
 return resolved;
}
async function photoExportBackup(ws){
 const backup=JSON.parse(JSON.stringify(ws));
 for(const p of photoRefs(backup))if(!p.dataUrl){const dataUrl=await photoGet(p.id);if(!dataUrl)throw Error('Bild „'+p.label+'“ fehlt. Die Datensicherung wurde nicht erstellt, damit keine Bilder unbemerkt fehlen.');p.dataUrl=dataUrl;}
 return backup;
}
async function photoImportBackup(ws){
 const imported=[];
 for(const p of photoRefs(ws))if(p.dataUrl){await photoPut(p.id,p.dataUrl);imported.push(p.id);delete p.dataUrl;}
 return imported;
}
// Remove images after deleting records; do not delete older inline photos.
async function photoCleanup(records){
 for(const p of records||[])if(!p.dataUrl)await photoDelete(p.id).catch(()=>{});
}
document.addEventListener('change',e=>{const t=e.target;if(t.matches?.('[data-photo-upload]'))photoUpload(t.dataset.photoUpload,t)});
document.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn||!document.querySelector('#app')?.contains(btn))return;
 const kind=btn.dataset.photoKind;if(!kind)return;
 const record=photoRecord(kind);if(!record||!Array.isArray(record.photos))return;
 if(btn.dataset.photoDelete){
  if(!confirm('Dieses Foto wirklich löschen?'))return;
  const index=record.photos.findIndex(p=>p.id===btn.dataset.photoDelete);if(index<0)return;
  const [removed]=record.photos.splice(index,1);
  if(!save()){record.photos.splice(index,0,removed);return}
  if(!removed.dataUrl)photoDelete(removed.id).catch(()=>{});render();return;
 }
 if(btn.dataset.photoRename){
  const pic=record.photos.find(p=>p.id===btn.dataset.photoRename);if(!pic)return;
  const val=prompt('Bildbeschreibung ändern:',pic.label);if(val===null)return;
  const next=val.trim().slice(0,70);if(!next)return;
  const old=pic.label;pic.label=next;if(!save())pic.label=old;else render();
 }
});
