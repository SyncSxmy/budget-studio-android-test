/* Budget Studio 0.9.7 – opt-in local AES-256-GCM vault and encrypted portable backups.
   This is a TEST build; it has not been security audited. Passwords and AES keys are
   never written to localStorage, IndexedDB, or sent to Supabase. */
(() => {
'use strict';
const FLAG='budget-studio-vault-active-v1';
const DB_NAME='budget-studio-vault-v1';
const ITERATIONS=600000;
const ENC=new TextEncoder();
const DEC=new TextDecoder();
const PREFIX='BudgetStudio:v1:';
const BASE64_RE=/^[A-Za-z0-9+/]+={0,2}$/;
let vaultKey=null,dbPromise=null,pendingSnapshot=null,writeWorker=null,lastWriteError=null;
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
function enc64(input){const v=input instanceof Uint8Array?input:new Uint8Array(input);let s='';for(let i=0;i<v.length;i+=8192)s+=String.fromCharCode(...v.subarray(i,i+8192));return btoa(s);}
function dec64(input){if(typeof input!=='string'||input.length>180000000||!BASE64_RE.test(input))throw Error('Ungültiges Datenformat.');const s=atob(input),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
async function derive(password,salt,iterations=ITERATIONS){
 if(!crypto?.subtle||!crypto?.getRandomValues)throw Error('Verschlüsselung ist hier nicht verfügbar. Bitte HTTPS oder die App verwenden.');
 if(!Number.isInteger(iterations)||iterations<250000||iterations>1200000)throw Error('Unbekannte Schlüsselableitung.');
 const base=await crypto.subtle.importKey('raw',ENC.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(plaintext,key,scope){
 const iv=bytes(12);
 const result=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:ENC.encode(PREFIX+scope),tagLength:128},key,ENC.encode(plaintext));
 return {iv:enc64(iv),data:enc64(result)};
}
async function unseal(pack,key,scope){
 if(!pack||typeof pack.iv!=='string'||typeof pack.data!=='string')throw Error('Beschädigte verschlüsselte Daten.');
 try {return DEC.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:dec64(pack.iv),additionalData:ENC.encode(PREFIX+scope),tagLength:128},key,dec64(pack.data)));}
 catch{throw Error('Passwort falsch oder verschlüsselte Daten beschädigt.');}
}
function enabled(){try{return localStorage.getItem(FLAG)==='1';}catch{return false;}}
function unlocked(){return !!vaultKey;}
function openDb(){
 if(!('indexedDB' in window))return Promise.reject(Error('Dieser Browser unterstützt den sicheren Datenspeicher nicht.'));
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('main'))db.createObjectStore('main',{keyPath:'id'});if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Sicherer Speicher konnte nicht geöffnet werden.'));
 }).catch(e=>{dbPromise=null;throw e});return dbPromise;
}
async function put(store,value){const db=await openDb();return new Promise((resolve,reject)=>{
 const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Verschlüsseltes Speichern fehlgeschlagen.'));tx.onabort=()=>reject(tx.error||Error('Speichern abgebrochen.'));
});}
async function get(store,id){const db=await openDb();return new Promise((resolve,reject)=>{
 const req=db.transaction(store,'readonly').objectStore(store).get(id);
 req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('Speicher konnte nicht gelesen werden.'));
});}
async function remove(store,id){const db=await openDb();return new Promise((resolve,reject)=>{
 const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Löschen fehlgeschlagen.'));
});}
function notify(status,message){
 let el=document.getElementById('bs-vault-save-status');if(!el)return;
 el.dataset.state=status;el.textContent=message;el.hidden=status==='idle';
}
async function encryptBackupJson(json,password){
 if(typeof json!=='string'||json.length>160000000)throw Error('Datensicherung ist zu groß.');
 if(typeof password!=='string'||password.length<12)throw Error('Bitte mindestens 12 Zeichen als Passwort verwenden.');
 const salt=bytes(16),key=await derive(password,salt),sealed=await seal(json,key,'portable-backup');
 return JSON.stringify({format:'budget-studio-encrypted-backup',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:enc64(salt),iv:sealed.iv,data:sealed.data});
}
function looksEncrypted(v){return !!v&&v.format==='budget-studio-encrypted-backup';}
async function decryptBackup(v,password){
 if(!looksEncrypted(v)||v.version!==1||v.kdf!=='PBKDF2-SHA256'||v.cipher!=='AES-256-GCM')throw Error('Diese verschlüsselte Sicherung wird nicht unterstützt.');
 const key=await derive(password,dec64(v.salt),v.iterations);
 const plaintext=await unseal(v,key,'portable-backup');
 try{return JSON.parse(plaintext);}catch{throw Error('Entschlüsselte Sicherung enthält keine gültigen JSON-Daten.');}
}
async function createVault(password,ws,photoRefs,readLegacyPhoto,eraseLegacyPhotos){
 if(enabled())throw Error('Datentresor ist bereits aktiv.');
 if(typeof password!=='string'||password.length<12)throw Error('Das Tresorpasswort muss mindestens 12 Zeichen haben.');
 if(!Array.isArray(photoRefs))throw Error('Fotoliste fehlt.');
 const salt=bytes(16),key=await derive(password,salt);
 const record={id:'meta',version:1,salt:enc64(salt),iterations:ITERATIONS,proof:await seal('budget-studio-vault-v1',key,'proof')};
 const workspacePack=await seal(JSON.stringify(ws),key,'workspace');
 // Stage encrypted data first; the plaintext workspace remains untouched until verification.
 await put('main',record);
 await put('main',{id:'workspace',...workspacePack});
 for(const p of photoRefs){
  if(p.dataUrl)continue; // Older inline photos stay inside encrypted workspace JSON.
  const photo=await readLegacyPhoto(p.id);if(!photo)throw Error('Foto „'+(p.label||p.id)+'“ fehlt. Der Datentresor wurde nicht aktiviert.');
  const sealed=await seal(photo,key,'photo:'+p.id);
  await put('photos',{id:p.id,...sealed});
 }
 const check=JSON.parse(await unseal(await get('main','workspace'),key,'workspace'));
 if(!check||check.version!==2||check.households?.length!==ws.households?.length)throw Error('Prüfung des verschlüsselten Datenbestands fehlgeschlagen.');
 for(const p of photoRefs){
  if(p.dataUrl)continue;
  const read=await get('photos',p.id);if(!read)throw Error('Verschlüsseltes Foto fehlt.');
  await unseal(read,key,'photo:'+p.id);
 }
 // From here on, only the vault is active. Cleanup is best effort and reports its result.
 localStorage.setItem(FLAG,'1');vaultKey=key;lastWriteError=null;
 localStorage.removeItem('budget-studio-v2');localStorage.removeItem('budget-studio-v1');
 let purged=true;
 try{await eraseLegacyPhotos();localStorage.removeItem('budget-studio-vault-photo-cleanup-pending');}
 catch{purged=false;localStorage.setItem('budget-studio-vault-photo-cleanup-pending','1');}
 notify('saved','🔒 Verschlüsselt gespeichert');
 return {photoCleanupSucceeded:purged};
}
async function unlockVault(password){
 if(!enabled())throw Error('Kein Datentresor eingerichtet.');
 const meta=await get('main','meta');if(!meta||meta.version!==1)throw Error('Tresorinformationen fehlen oder sind beschädigt.');
 const key=await derive(password,dec64(meta.salt),meta.iterations);
 if(await unseal(meta.proof,key,'proof')!=='budget-studio-vault-v1')throw Error('Passwort falsch oder Datentresor beschädigt.');
 const item=await get('main','workspace');if(!item)throw Error('Verschlüsselte Haushaltsdaten fehlen.');
 const ws=JSON.parse(await unseal(item,key,'workspace'));
 vaultKey=key;lastWriteError=null;notify('saved','🔒 Datentresor geöffnet');
 return ws;
}
async function savePhoto(id,dataUrl){
 if(!vaultKey)throw Error('Der Datentresor ist gesperrt.');
 if(typeof id!=='string'||id.length>200)throw Error('Ungültige Foto-ID.');
 const sealed=await seal(dataUrl,vaultKey,'photo:'+id);
 await put('photos',{id,...sealed});
}
async function getPhoto(id){
 if(!vaultKey)throw Error('Der Datentresor ist gesperrt.');
 const record=await get('photos',id);
 return record?unseal(record,vaultKey,'photo:'+id):null;
}
async function deletePhoto(id){if(!vaultKey)throw Error('Der Datentresor ist gesperrt.');await remove('photos',id);}
function queueSave(ws){
 if(!enabled())throw Error('Der Datentresor ist nicht aktiv.');
 if(!vaultKey)throw Error('Bitte zuerst den Datentresor entsperren.');
 pendingSnapshot=JSON.stringify(ws);lastWriteError=null;notify('saving','🔒 Änderungen werden verschlüsselt gespeichert …');
 if(writeWorker)return;
 writeWorker=(async()=>{
  while(pendingSnapshot!==null){
   const snapshot=pendingSnapshot;pendingSnapshot=null;
   try{const sealed=await seal(snapshot,vaultKey,'workspace');await put('main',{id:'workspace',...sealed});if(pendingSnapshot===null)notify('saved','🔒 Alle Änderungen verschlüsselt gespeichert');}
   catch(e){lastWriteError=e;if(pendingSnapshot===null)pendingSnapshot=snapshot;notify('error','⚠ Speichern fehlgeschlagen – Daten sichern und Seite nicht schließen!');break;}
  }
 })().finally(()=>{writeWorker=null;});
}
async function flush(){if(writeWorker)await writeWorker;if(lastWriteError)throw lastWriteError;if(pendingSnapshot!==null)throw Error('Es sind noch ungespeicherte Änderungen vorhanden.');}
function lock(){vaultKey=null;}
function pending(){return !!(writeWorker||pendingSnapshot||lastWriteError);}
window.addEventListener('beforeunload',e=>{if(enabled()&&pending()){e.preventDefault();e.returnValue='';}});
const dialog=document.getElementById('bs-vault-dialog');
const form=document.getElementById('bs-vault-form');
const title=document.getElementById('bs-vault-title');
const subtitle=document.getElementById('bs-vault-explain');
const notice=document.getElementById('bs-vault-message');
const passwordInput=document.getElementById('bs-vault-password');
const repeatLine=document.getElementById('bs-vault-repeat-line');
const repeatInput=document.getElementById('bs-vault-password-repeat');
const cancelBtn=document.getElementById('bs-vault-cancel');
const submitBtn=document.getElementById('bs-vault-submit');
let currentMode=null,currentTask=null;
const MODES={
 enable:['Lokalen Datentresor aktivieren','Verschlüsselt alle Haushalte, Buchungen und bestehenden Bilder. Passwort niemals verlieren: Ohne dieses Passwort ist ein Entsperren nicht möglich.','Verschlüsselung aktivieren'],
 unlock:['Datentresor entsperren','Gib dein persönliches Tresorpasswort ein. Es wird nicht übertragen oder gespeichert.','Entsperren'],
 backup:['Verschlüsselte Sicherung','Lege ein Passwort für die verschlüsselte Sicherung fest und bewahre es sicher auf.','Sicherung verschlüsseln'],
 restore:['Sicherung entschlüsseln','Gib das Passwort ein, mit dem diese Sicherung erstellt wurde.','Entschlüsseln']
};
function startDialog(mode,task){
 if(!MODES[mode]||!dialog)throw Error('Passwortdialog nicht verfügbar.');
 currentMode=mode;currentTask=task;title.textContent=MODES[mode][0];subtitle.textContent=MODES[mode][1];submitBtn.textContent=MODES[mode][2];
 passwordInput.value='';repeatInput.value='';repeatLine.hidden=!['enable','backup'].includes(mode);passwordInput.minLength=['enable','backup'].includes(mode)?12:1;
 notice.hidden=true;notice.textContent='';cancelBtn.hidden=mode==='unlock';
 if(!dialog.open)dialog.showModal();passwordInput.focus();
}
dialog.addEventListener('cancel',e=>{if(currentMode==='unlock'||submitBtn.disabled){e.preventDefault();return;}currentMode=null;currentTask=null;});
cancelBtn.addEventListener('click',()=>{currentMode=null;currentTask=null;dialog.close();});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!currentTask)return;
 const pw=passwordInput.value;
 if(repeatLine.hidden===false&&pw!==repeatInput.value){notice.hidden=false;notice.textContent='Die beiden Passwörter stimmen nicht überein.';return;}
 submitBtn.disabled=true;cancelBtn.disabled=true;notice.hidden=false;notice.textContent='Bitte warten: Verschlüsselung wird vorbereitet …';
 try {await currentTask(pw);currentMode=null;currentTask=null;dialog.close();passwordInput.value='';repeatInput.value='';}
 catch(err){notice.textContent=String(err.message||err);}
 finally{submitBtn.disabled=false;cancelBtn.disabled=false;}
});
window.BudgetStudioCrypto={
 enabled,unlocked,startDialog,createVault,unlockVault,queueSave,flush,lock,pending,
 savePhoto,getPhoto,deletePhoto,encryptBackupJson,looksEncrypted,decryptBackup,notify
};
})();
