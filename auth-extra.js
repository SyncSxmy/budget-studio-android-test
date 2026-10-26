/* Budget Studio 0.9.5 — Supabase beta authentication. No financial sync. */
(() => {
'use strict';
const BASE = 'https://octimjkrwiueowppivph.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_RAA36s60nKKc5tKJbK4nCA_B3jE7lEy';
const SESSION_KEY = 'budget-studio-beta-auth-session';
const dialog = document.getElementById('bs-account-dialog');
const body = document.getElementById('bs-account-body');
const message = document.getElementById('bs-account-message');
let session = null;
let busy = false;
function readSession(){
 try {const val=sessionStorage.getItem(SESSION_KEY);return val?JSON.parse(val):null;}catch{return null;}
}
function saveSession(value){
 session=value;
 try {if(value)sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));else sessionStorage.removeItem(SESSION_KEY);}catch{}
}
function escapeHtml(input){return String(input ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function alertBox(value,kind='info'){message.textContent=String(value||'');message.dataset.kind=kind;message.hidden=!value;}
async function request(method,path,payload,token,query=''){
 const headers={'apikey':PUBLISHABLE_KEY,'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(BASE+'/auth/v1/'+path+query,{method,headers,body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.msg || data.error_description || data.message || data.error || 'Anfrage fehlgeschlagen (HTTP '+response.status+').');
 return data;
}
async function api(method,path,payload,token){
 const response=await fetch(BASE+'/rest/v1/'+path,{method,headers:{'apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json','Prefer':method==='POST'?'return=representation':'return=representation'},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>[]);
 if(!response.ok)throw Error(data.message||'Datenbankzugriff abgelehnt ('+response.status+').');
 return data;
}
function formMarkup(){return `
 <div class="bs-auth-banner"><strong>Supabase-Testkonto</strong><p>Hier kannst du deine Registrierung ausprobieren. Deine bestehenden Haushalte, Buchungen und Gutachterfotos werden <b>nicht</b> hochgeladen.</p></div>
 <form id="bs-signin-form" class="bs-auth-form">
  <label>E-Mail-Adresse<input required type="email" autocomplete="username" name="email" placeholder="name@beispiel.de" maxlength="254"></label>
  <label>Passwort<input required type="password" autocomplete="current-password" name="password" minlength="8" maxlength="128" placeholder="Mindestens 8 Zeichen"></label>
  <button class="primary" type="submit">Anmelden</button>
  <button type="button" data-bs-auth="signup">Neues Konto registrieren</button>
 </form>
 <p class="muted">Nach der Registrierung kann eine Bestätigung per E-Mail erforderlich sein. Das Supabase-Projekt muss die richtige Weiterleitungsadresse eingetragen haben.</p>`;}
function signedInMarkup(user,workspaces){return `
 <div class="bs-auth-banner"><strong>Angemeldet</strong><p>${escapeHtml(user.email||'Testnutzer')}</p><p>Deine App-Daten werden nur bei ausdrücklichem Hoch- oder Herunterladen über <b>Mehr → Geräte-Sicherung (Beta)</b> ausgetauscht.</p></div>
 <h3>Cloud-Testarbeitsflächen</h3>
 <div class="bs-workspace-list">${workspaces.length?workspaces.map(w=>`<div class="bs-workspace-item"><strong>${escapeHtml(w.name)}</strong><small>${w.kind==='business'?'Betrieb':w.kind==='shared'?'Gemeinsamer Haushalt':'Privat'} · ${escapeHtml(w.id)}</small></div>`).join(''):'<p class="muted">Noch keine Cloud-Testarbeitsfläche angelegt.</p>'}</div>
 <form class="bs-auth-form" id="bs-create-workspace">
  <label>Name<input required maxlength="120" name="name" placeholder="z. B. Testhaushalt"></label>
  <label>Art<select name="kind"><option value="personal">Privat</option><option value="shared">Gemeinsam</option><option value="business">Betrieb</option></select></label>
  <button type="submit">Leere Test-Arbeitsfläche anlegen</button>
 </form>
 <button type="button" data-bs-auth="logout">Abmelden</button>`;}
async function ensureSession(){
 if(!session?.access_token)return null;
 const expires=Number(session.expires_at||0);
 if(expires > Date.now()/1000+90)return session.access_token;
 if(!session.refresh_token){saveSession(null);return null;}
 try {
  const data=await request('POST','token',{refresh_token:session.refresh_token},null,'?grant_type=refresh_token');
  persistToken(data);return data.access_token;
 }catch{saveSession(null);return null;}
}
function persistToken(data){
 if(!data.access_token)throw Error('Anmeldung hat kein Zugriffstoken zurückgegeben.');
 saveSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});
}
async function render(){
 alertBox('');
 if(busy)return;
 const token=await ensureSession();
 if(!token){body.innerHTML=formMarkup();return;}
 try{
  const user=await request('GET','user',null,token);
  const ws=await api('GET','workspaces?select=id,name,kind,created_at&order=created_at.desc',null,token);
  body.innerHTML=signedInMarkup(user,Array.isArray(ws)?ws:[]);
 }catch(err){
  saveSession(null);
  body.innerHTML=formMarkup();alertBox('Sitzung nicht mehr gültig: '+err.message,'error');
 }
}
async function handleSubmit(evt){
 const form=evt.target;
 if(!form.matches('#bs-signin-form,#bs-create-workspace'))return;
 evt.preventDefault();if(busy)return;
 busy=true;const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
 try{
  if(form.id==='bs-signin-form'){
   const f=new FormData(form);
   const data=await request('POST','token',{email:String(f.get('email')).trim(),password:String(f.get('password'))},null,'?grant_type=password');
   persistToken(data);
   busy=false;await render();alertBox('Anmeldung erfolgreich. Deine lokalen Daten bleiben unverändert.','ok');return;
  }
  const name=String(new FormData(form).get('name')||'').trim();
  const kind=String(new FormData(form).get('kind'));
  if(!name||name.length>120||!['personal','shared','business'].includes(kind))throw Error('Bitte gültige Angaben machen.');
  const token=await ensureSession();if(!token)throw Error('Bitte neu anmelden.');
  const user=await request('GET','user',null,token);
  await api('POST','workspaces', {name,kind,owner_id:user.id},token);
  busy=false;await render();alertBox('Leere Cloud-Testarbeitsfläche erstellt. Keine App-Daten hochgeladen.','ok');return;
 }catch(err){alertBox('Das hat nicht geklappt: '+err.message,'error');}
 finally{busy=false;if(submit)submit.disabled=false;}
}
async function register(){
 if(busy)return;
 const f=document.getElementById('bs-signin-form');if(!f)return;
 if(!f.reportValidity())return;
 const data=new FormData(f);busy=true;
 try{
  const response=await request('POST','signup',{email:String(data.get('email')).trim(),password:String(data.get('password'))});
  if(response.access_token){persistToken(response);busy=false;await render();alertBox('Registrierung und Anmeldung erfolgreich.','ok');}
  else alertBox('Registrierungsanfrage übermittelt. Falls eine Bestätigungsmail kommt, bestätige zuerst deine E-Mail-Adresse.','ok');
 }catch(err){alertBox('Registrierung nicht möglich: '+err.message,'error');}
 finally{busy=false;}
}
async function logout(){
 if(busy)return;busy=true;
 try{const token=await ensureSession();if(token)await request('POST','logout',null,token);}catch{}finally{saveSession(null);busy=false;await render();alertBox('Abgemeldet.','ok');}
}
dialog.addEventListener('submit',handleSubmit);
dialog.addEventListener('click',e=>{
 const action=e.target.closest('[data-bs-auth]')?.dataset.bsAuth;
 if(action==='signup')register();
 if(action==='logout')logout();
 if(action==='close')dialog.close();
});
dialog.addEventListener('close',()=>alertBox(''));
window.BudgetStudioAuth={
 open:async()=>{if(!dialog.open)dialog.showModal();await render();},
 getSessionForSync:async()=>{
  const token=await ensureSession();if(!token)throw Error('Bitte zuerst im Cloud-Konto anmelden.');
  const user=await request('GET','user',null,token);
  if(!user||!user.id)throw Error('Angemeldeter Benutzer konnte nicht geprüft werden.');
  return {id:user.id,token};
 }
};
session=readSession();
})();
