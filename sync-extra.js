/* Budget Studio 0.9.8 — EXPLICIT E2EE device handoff beta.
   Encrypted whole-app snapshot; NEVER plaintext upload, NEVER background overwrite.
   This is not live, conflict-free multi-user synchronization. */
(() => {
'use strict';
const BASE='https://octimjkrwiueowppivph.supabase.co';
const API_KEY='sb_publishable_RAA36s60nKKc5tKJbK4nCA_B3jE7lEy';
const BUCKET='budget-studio-sync';
const MAX_BYTES=39_000_000;
const dialog=document.getElementById('bs-sync-dialog');
const content=document.getElementById('bs-sync-content');
const status=document.getElementById('bs-sync-status');
const encoder=new TextEncoder();
let busy=false,authUser=null,head=null,pendingRestore=null;
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function note(message,error=false){status.hidden=!message;status.textContent=message||'';status.dataset.kind=error?'error':'info';}
function revKey(uid){return 'budget-studio-sync-last-revision:'+uid;}
function localRevision(uid){try{return Number(localStorage.getItem(revKey(uid))||0)||0;}catch{return 0;}}
function markRevision(uid,n){try{localStorage.setItem(revKey(uid),String(n));}catch{throw Error('Lokaler Synchronisationsstand konnte nicht gespeichert werden. Keine weiteren Uploads ausführen.');}}
function fmtDate(value){try{return value?new Date(value).toLocaleString('de-DE'):'';}catch{return ''}}
function footer(){return `<p class="muted bs-sync-footnote">Die Cloud erhält ausschließlich eine verschlüsselte Sicherung. Das Cloud-Passwort wird nicht gespeichert und niemals übertragen. Die Fotos sind enthalten. Testversion ohne automatische Hintergrund-Synchronisierung, Datenzusammenführung und Mehrbenutzerfreigaben. Bitte nur Testdaten verwenden.</p>`;}
async function auth(){if(!window.BudgetStudioAuth?.getSessionForSync)throw Error('Kontoanmeldung ist nicht verfügbar.');return window.BudgetStudioAuth.getSessionForSync();}
function headers(token,other={}){return {apikey:API_KEY,Authorization:'Bearer '+token,...other};}
async function parseError(response){const value=await response.json().catch(()=>({}));return value.message||value.error||value.msg||`Supabase-Fehler (HTTP ${response.status})`;}
async function getHead(token,uid){
 const url=BASE+'/rest/v1/encrypted_sync_heads?select=user_id,revision,object_path,sha256,size_bytes,updated_at&user_id=eq.'+encodeURIComponent(uid);
 const response=await fetch(url,{headers:headers(token),cache:'no-store'});
 if(!response.ok)throw Error(await parseError(response));
 const rows=await response.json();return Array.isArray(rows)?rows[0]||null:null;
}
async function sha256(data){const bytes=encoder.encode(data),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function uploadObject(token,path,encrypted){
 const encodedPath=path.split('/').map(encodeURIComponent).join('/');
 const response=await fetch(BASE+'/storage/v1/object/'+BUCKET+'/'+encodedPath,{
  method:'POST',headers:headers(token,{'Content-Type':'application/octet-stream','x-upsert':'false'}),body:new Blob([encrypted],{type:'application/octet-stream'}),cache:'no-store'
 });
 if(!response.ok)throw Error('Cloud-Datei konnte nicht geschrieben werden: '+await parseError(response));
}
async function downloadObject(token,path){
 const encodedPath=path.split('/').map(encodeURIComponent).join('/');
 const response=await fetch(BASE+'/storage/v1/object/authenticated/'+BUCKET+'/'+encodedPath,{headers:headers(token),cache:'no-store'});
 if(!response.ok)throw Error('Cloud-Datei konnte nicht gelesen werden: '+await parseError(response));
 const blob=await response.blob();
 if(blob.size>MAX_BYTES)throw Error('Cloud-Sicherung ist zu groß.');
 return blob.text();
}
async function publishHead(token,uid,oldHead,path,digest,size){
 const data={user_id:uid,revision:oldHead?Number(oldHead.revision)+1:1,object_path:path,sha256:digest,size_bytes:size,updated_at:new Date().toISOString()};
 if(!oldHead){
  const r=await fetch(BASE+'/rest/v1/encrypted_sync_heads',{method:'POST',headers:headers(token,{'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(data),cache:'no-store'});
  if(!r.ok)throw Error('Cloud wurde zwischenzeitlich von einem anderen Gerät geändert. Bitte zuerst dortige Daten laden. '+await parseError(r));
  const rows=await r.json();if(!Array.isArray(rows)||rows.length!==1)throw Error('Synchronisationsstand nicht bestätigt.');return rows[0];
 }
 const url=BASE+'/rest/v1/encrypted_sync_heads?user_id=eq.'+encodeURIComponent(uid)+'&revision=eq.'+Number(oldHead.revision)+'&sha256=eq.'+encodeURIComponent(oldHead.sha256);
 const r=await fetch(url,{method:'PATCH',headers:headers(token,{'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(data),cache:'no-store'});
 if(!r.ok)throw Error(await parseError(r));
 const rows=await r.json();if(!Array.isArray(rows)||rows.length!==1)throw Error('Anderes Gerät hat inzwischen gespeichert. Keine Cloud-Daten wurden überschrieben. Bitte erst herunterladen.');
 return rows[0];
}
function openUi(user,current){
 const localRev=localRevision(user.id);
 content.innerHTML=`
 <div class="bs-auth-banner"><strong>☁ Verschlüsselte Geräte-Sicherung</strong><p>Angemeldet. Nur dein Konto kann diese Sicherung abrufen. Deine Buchungen und Fotos bleiben für Supabase verschlüsselt.</p></div>
 <div class="bs-sync-info"><b>Cloud:</b> ${current?`Version ${Number(current.revision)} · ${safe(fmtDate(current.updated_at))} · ${(Number(current.size_bytes)/1e6).toFixed(1)} MB`:'Noch keine Sicherung'}<br>
 <b>Dieses Gerät:</b> ${localRev?'Zuletzt übernommene Version '+localRev:'Noch kein Sync-Stand gespeichert'}</div>
 ${!window.BudgetStudioCrypto?.enabled()?'<div class="bs-sync-warning">Zuerst unter <b>Mehr → Daten & Einstellungen</b> den lokalen Datentresor aktivieren. Sonst bleiben heruntergeladene Daten auf diesem Gerät unverschlüsselt.</div>':!window.BudgetStudioCrypto.unlocked()?'<div class="bs-sync-warning">Lokalen Datentresor zuerst entsperren.</div>':''}
 <form class="bs-auth-form" id="bs-sync-upload-form">
 <h3>1. Von diesem Gerät hochladen</h3>
 <label>Cloud-Passwort (mindestens 12 Zeichen)<input type="password" name="password" minlength="12" maxlength="256" autocomplete="new-password" required placeholder="Passwort nur für die Cloud-Sicherung"></label>
 <label>Passwort bestätigen<input type="password" name="repeat" minlength="12" maxlength="256" autocomplete="new-password" required></label>
 <button type="submit" class="primary" ${!window.BudgetStudioCrypto?.enabled()||!window.BudgetStudioCrypto.unlocked()?'disabled':''}>🔐 Jetzt verschlüsselt hochladen</button>
 </form>
 <form class="bs-auth-form" id="bs-sync-download-form">
 <h3>2. Auf diesem Gerät wiederherstellen</h3>
 <label>Dasselbe Cloud-Passwort wie beim Hochladen<input type="password" name="password" minlength="1" maxlength="256" autocomplete="off" required></label>
 <button type="submit" ${!current||!window.BudgetStudioCrypto?.enabled()||!window.BudgetStudioCrypto.unlocked()?'disabled':''}>⬇ Cloud-Sicherung entschlüsseln &amp; prüfen</button>
 </form>
 <div id="bs-sync-restore-preview" hidden></div>
 <button type="button" id="bs-sync-refresh">Cloud-Status neu laden</button>
 ${footer()}`;
}
async function refresh(){
 authUser=await auth();head=await getHead(authUser.token,authUser.id);
 openUi(authUser,head);
}
async function upload(pass){
 if(!window.BudgetStudioCrypto?.enabled()||!window.BudgetStudioCrypto.unlocked())throw Error('Lokalen Datentresor zuerst entsperren und aktivieren.');
 if(pass.length<12)throw Error('Cloud-Passwort muss mindestens 12 Zeichen haben.');
 const user=await auth();const cloud=await getHead(user.token,user.id);const known=localRevision(user.id);
 if(cloud&&Number(cloud.revision)!==known)throw Error('Die Cloud ist nicht auf demselben Stand wie dieses Gerät. Erst die Cloud-Sicherung prüfen und gegebenenfalls wiederherstellen. Ein älterer Stand wird nicht überschrieben.');
 if(!cloud&&known)throw Error('Die frühere Cloud-Sicherung wurde entfernt. Bitte Support kontaktieren, bevor du einen neuen Verlauf anlegst.');
 note('Fotos einsammeln und lokale Änderungen vollständig speichern …');
 const payload=await window.BudgetStudioSyncBridge.exportLocal();
 const json=JSON.stringify(payload);
 note('Sicherung lokal verschlüsseln …');
 const encrypted=await window.BudgetStudioCrypto.encryptBackupJson(json,pass);
 const size=encoder.encode(encrypted).length;
 if(size>MAX_BYTES)throw Error('Sicherung überschreitet 39 MB. Bitte den Datenbestand verkleinern. Es wurde nichts hochgeladen.');
 const digest=await sha256(encrypted);
 if(!crypto.randomUUID)throw Error('Sichere Datei-ID nicht verfügbar.');
 const path=user.id+'/snapshots/'+crypto.randomUUID()+'.bsafe';
 // Immutable blob first; metadata pointer is only updated when upload finished.
 note('Verschlüsselte Datei hochladen …');
 await uploadObject(user.token,path,encrypted);
 note('Hochgeladene Datei auf Integrität prüfen …');
 const confirmed=await downloadObject(user.token,path);
 if(encoder.encode(confirmed).length!==size||await sha256(confirmed)!==digest)
   throw Error('Cloud-Datei konnte nach dem Upload nicht fehlerfrei geprüft werden. Der Cloud-Stand wurde NICHT überschrieben.');
 // Compare and swap revision prevents silent stale-device overwrite.
 note('Versionsstand prüfen …');
 const updated=await publishHead(user.token,user.id,cloud,path,digest,size);
 markRevision(user.id,Number(updated.revision));
 await refresh();note('✓ Verschlüsselte Cloud-Sicherung Version '+updated.revision+' erfolgreich gespeichert.');
}
async function prepareRestore(pass){
 if(!window.BudgetStudioCrypto?.enabled()||!window.BudgetStudioCrypto.unlocked())throw Error('Lokalen Datentresor zuerst entsperren und aktivieren.');
 const user=await auth(),cloud=await getHead(user.token,user.id);
 if(!cloud)throw Error('In der Cloud liegt noch keine Sicherung.');
 if(!RegExp('^'+user.id+'/snapshots/[0-9a-f-]{36}\\.bsafe$').test(cloud.object_path))throw Error('Ungültiger Cloud-Dateipfad.');
 note('Verschlüsselte Sicherung herunterladen …');
 const encrypted=await downloadObject(user.token,cloud.object_path);
 if(encoder.encode(encrypted).length!==Number(cloud.size_bytes)||await sha256(encrypted)!==cloud.sha256)throw Error('Die heruntergeladene Sicherung stimmt nicht mit der Prüfsumme überein.');
 note('Sicherung auf diesem Gerät entschlüsseln …');
 const data=await window.BudgetStudioCrypto.decryptBackup(JSON.parse(encrypted),pass);
 const preview=window.BudgetStudioSyncBridge.preview(data);
 pendingRestore={data,pass,cloud};
 const el=document.getElementById('bs-sync-restore-preview');el.hidden=false;
 el.innerHTML=`<div class="bs-sync-warning"><b>Achtung: Lokale Daten ersetzen!</b><p>Cloud-Version ${cloud.revision}: ${preview.households} Bereiche, ${preview.transactions} Buchungen und ${preview.photos} Fotos. Alle derzeitigen lokalen Bereiche werden beim Wiederherstellen ersetzt, nicht zusammengeführt.</p></div>
 <button type="button" id="bs-sync-restore-confirm" class="primary">Lokale Sicherung herunterladen und Wiederherstellung bestätigen</button>`;
 note('Sicherung entschlüsselt. Prüfe die Angaben. Noch keine lokalen Daten verändert.');
}
function saveFile(content,name){
 const blob=new Blob([content],{type:'application/octet-stream'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function commitRestore(){
 if(!pendingRestore)throw Error('Bitte zuerst die Cloud-Sicherung entschlüsseln.');
 const {data,pass,cloud}=pendingRestore;const user=await auth();
 const latest=await getHead(user.token,user.id);
 if(!latest||latest.revision!==cloud.revision||latest.sha256!==cloud.sha256)throw Error('Die Cloud wurde inzwischen verändert. Bitte den Vorgang erneut beginnen.');
 // Save the complete current device as encrypted emergency rollback file FIRST.
 note('Sicherung der bisherigen lokalen Daten wird vorbereitet …');
 const localData=await window.BudgetStudioSyncBridge.exportLocal();
 const oldEncrypted=await window.BudgetStudioCrypto.encryptBackupJson(JSON.stringify(localData),pass);
 if(encoder.encode(oldEncrypted).length>MAX_BYTES)throw Error('Lokale Notfallsicherung zu groß. Bitte zuerst eine externe Sicherung erstellen.');
 saveFile(oldEncrypted,'budget-studio-vor-cloud-import-'+new Date().toISOString().slice(0,10)+'.bsafe');
 if(!confirm('Hast du die soeben heruntergeladene, VERSCHLÜSSELTE Sicherungsdatei deiner bisherigen Gerätedaten wirklich gespeichert? Ohne sie kannst du nach dem Ersetzen nicht zurück.'))return;
 const typed=prompt('Zum Ersetzen ALLER lokalen Haushalte bitte ERSETZEN eintippen:');
 if(typed!=='ERSETZEN')return;
 note('Lokale Daten ersetzen und verschlüsselt speichern …');
 await window.BudgetStudioSyncBridge.importLocal(data);
 markRevision(user.id,Number(cloud.revision));
 pendingRestore=null;await refresh();
 note('✓ Cloud-Version '+cloud.revision+' lokal wiederhergestellt. Daten inklusive Fotos gespeichert.');
}
async function task(fn){if(busy)return;busy=true;note('Bitte warten …');content.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await fn();}catch(e){note(e.message||String(e),true)}finally{busy=false;content.querySelectorAll('button').forEach(b=>{if(b.id==='bs-sync-restore-confirm'||b.id==='bs-sync-refresh')b.disabled=false;else{const locked=!window.BudgetStudioCrypto?.enabled()||!window.BudgetStudioCrypto.unlocked();b.disabled=locked||(b.closest('#bs-sync-download-form')&&!head)}})}
}
async function open(){
 pendingRestore=null;if(!dialog.open)dialog.showModal();content.innerHTML='<p class="muted">Cloud-Konto prüfen …</p>';note('');
 try{await refresh()}catch(e){content.innerHTML='<div class="bs-sync-warning">Bitte unter <b>Mehr → Cloud-Konto (Beta)</b> anmelden und dann erneut öffnen.</div>';note(e.message||String(e),true)}
}
dialog.addEventListener('close',()=>{pendingRestore=null;authUser=null;head=null;note('')});
dialog.addEventListener('click',e=>{
 if(e.target.closest('#bs-sync-close')){if(!busy)dialog.close();return;}
 if(e.target.closest('#bs-sync-refresh')){task(refresh);return;}
 if(e.target.closest('#bs-sync-restore-confirm')){task(commitRestore);return;}
});
dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
dialog.addEventListener('submit',e=>{
 if(e.target.id==='bs-sync-upload-form'){
  e.preventDefault();const form=e.target,pass=form.elements.password.value;
  if(pass!==form.elements.repeat.value){note('Die beiden Cloud-Passwörter stimmen nicht überein.',true);return}
  task(()=>upload(pass));return;
 }
 if(e.target.id==='bs-sync-download-form'){
  e.preventDefault();const pass=e.target.elements.password.value;task(()=>prepareRestore(pass));
 }
});
document.addEventListener('click',e=>{if(e.target.closest('#bs-sync-open'))open();});
function invalidateDeviceBaseline(){
 // External imports may be older than this device's last cloud revision.
 try{
  const keys=[];
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith('budget-studio-sync-last-revision:'))keys.push(key);}
  for(const key of keys)localStorage.removeItem(key);
  if(authUser?.id)localStorage.removeItem(revKey(authUser.id));
 }catch{}
}
window.BudgetStudioSync={open,invalidateDeviceBaseline};
})();
