'use strict';
/* Budget Studio 0.9.6.1: easily accessible tool planning on the business start page.
   Local/session draft only until explicitly saved within a customer order.
   Uses the same transparent rule-based toolPlannerSuggest as the order form. */
const homeToolDrafts = new Map();
let homeToolTransfer = false;
let homeToolTransferWorkspace = null;
function homeToolDraft() {
  const id = workspace.activeId;
  if (!homeToolDrafts.has(id)) homeToolDrafts.set(id, {task:'',team:1,plan:null});
  return homeToolDrafts.get(id);
}
function homeToolUI() {
  const d=homeToolDraft();
  return `<section class="panel home-tool-card" id="home-tool-card" aria-labelledby="home-tool-title">
    <div class="home-tool-head"><span class="home-tool-symbol" aria-hidden="true">⚒</span><div><small>SCHNELL & OHNE VORLAGEN</small><h3 id="home-tool-title">Welche Werkzeuge brauche ich?</h3><p class="muted">Beschreibe deine Arbeit. Die Checkliste erscheint sofort hier auf der Startseite.</p></div></div>
    <label class="home-tool-task">Tätigkeit und Menge<input id="home-tool-task" type="text" maxlength="120" autocomplete="off" value="${esc(d.task)}" placeholder="z. B. 20 m² Kalksandstein mauern"></label>
    <div class="home-tool-controls"><label>Personen<input id="home-tool-team" type="number" min="1" max="20" step="1" value="${d.team}"></label><button type="button" class="primary" data-home-generate>⚒ Werkzeuge ermitteln</button></div>
    <div class="home-tool-examples" aria-label="Beispiel-Tätigkeiten"><span>Beispiele:</span><button type="button" data-home-example="20 m² Kalksandstein mauern">20 m² Mauerwerk</button><button type="button" data-home-example="50 m² Rollrasen verlegen">50 m² Rollrasen</button><button type="button" data-home-example="30 m² Fliesen verlegen">30 m² Fliesen</button></div>
    <div id="home-tool-result" aria-live="polite">${homeToolResult(d.plan)}</div>
    <p class="muted home-tool-note">Beta: Automatische <b>regelbasierte</b> Vorschläge, noch keine echte KI. Die Liste ist unverbindlich. Fachgerechte Ausrüstung und Arbeitsschutz vor Ort prüfen.</p>
  </section>`;
}
function homeToolResult(p) {
  if (!toolPlannerValid(p)) return '<div class="home-tool-empty">Einfach Tätigkeit eingeben und auf <b>„Werkzeuge ermitteln“</b> tippen. Du brauchst vorher keinen Kunden anzulegen.</div>';
  const done=p.items.filter(i=>i.checked).length;
  return `<div class="home-tool-results"><div class="home-tool-result-head"><div><strong>${esc(p.matched.join(', ')||'Keine Tätigkeit erkannt')}</strong><small>${p.areaM2?`ca. ${p.areaM2.toLocaleString('de-DE')} m² · `:''}${p.teamSize} Person(en) · <span class="home-tool-counter">${done} von ${p.items.length}</span> abgehakt</small></div><button type="button" data-home-generate class="home-tool-retry">↻ Neu ermitteln</button></div>
    ${p.items.length?`<div class="toolplan-list home-tool-list">${p.items.map(i=>toolPlannerItem(i,false)).join('')}</div>`:'<p class="muted">Noch keine passenden Werkzeuge erkannt. Beschreibe die Tätigkeit genauer oder ergänze einzelne Werkzeuge.</p>'}
    ${p.warnings.length?`<details class="home-tool-hints"><summary>Wichtige Hinweise (${p.warnings.length})</summary>${p.warnings.map(w=>`<p>${esc(w)}</p>`).join('')}</details>`:''}
    <div class="home-tool-add"><label>Werkzeug ergänzen<input type="text" id="home-tool-add-name" maxlength="120" placeholder="z. B. Fugenkelle"></label><button type="button" data-home-add>＋ Hinzufügen</button></div>
    <div class="home-tool-actions"><button type="button" class="primary" data-home-to-order>✓ In Auftrag übernehmen</button><button type="button" data-home-copy>Liste kopieren</button></div><small class="home-tool-save-note">Bis zum Speichern eines Auftrags ist dies nur ein Entwurf auf diesem Gerät.</small></div>`;
}
function homeToolSync() {
  const result=document.querySelector('#home-tool-result');const d=homeToolDraft();
  if(!result||!toolPlannerValid(d.plan))return false;
  const items=[...result.querySelectorAll('.toolplan-item')].map(row=>{
    const old=d.plan.items.find(i=>i.id===row.dataset.toolId);
    return old?{...old,name:row.querySelector('.toolplan-item-name').value.trim(),qty:Number(row.querySelector('[data-tool-qty]').value),checked:row.querySelector('[data-tool-check]').checked}:null;
  });
  const updated={...d.plan,items};
  if(!toolPlannerValid(updated))return false;
  if(JSON.stringify(d.plan.items)!==JSON.stringify(items))d.edited=true;
  d.plan=updated;
  const progress=result.querySelector('.home-tool-counter');if(progress)progress.textContent=`${items.filter(i=>i.checked).length} von ${items.length}`;
  return true;
}
function homeToolGenerate() {
  const task=String(document.querySelector('#home-tool-task')?.value||'').trim();
  const team=Number(document.querySelector('#home-tool-team')?.value);
  if(!task||task.length>120)return alert('Bitte eine Tätigkeit eingeben (maximal 120 Zeichen).');
  if(!Number.isInteger(team)||team<1||team>20)return alert('Bitte 1 bis 20 Personen eingeben.');
  const d=homeToolDraft();
  if(toolPlannerValid(d.plan) && (d.edited||d.plan.items.some(i=>i.checked)) && !confirm('Deine Änderungen an der Werkzeugliste durch neue Vorschläge ersetzen?'))return;
  d.task=task;d.team=team;d.edited=false;d.plan=toolPlannerSuggest({title:task,description:'',lines:[]},team);
  document.querySelector('#home-tool-result').innerHTML=homeToolResult(d.plan);
}
function homeToolAwaitingCustomer(){return homeToolTransfer && homeToolTransferWorkspace===workspace.activeId;}
function homeToolOpenOrder(){
  const d=homeToolDraft();
  if(!toolPlannerValid(d.plan)||!homeToolSync())return alert('Bitte die Werkzeugliste prüfen. Alle Namen und Mengen müssen gültig sein.');
  homeToolTransfer=true;homeToolTransferWorkspace=workspace.activeId;
  orderEditingId=null;orderActiveId=null;
  if(!orderCustomersData().length){orderCustomerEditId=null;setView('orderCustomerForm');return;}
  homeToolDisplayNewOrder();
}
function homeToolDisplayNewOrder(){
  setView('orderForm');
  homeToolApplyToOrderForm();
}
function homeToolApplyToOrderForm(){
  if(!homeToolAwaitingCustomer())return false;
  const d=homeToolDraft(),form=document.querySelector('#order-edit-form');
  if(!form||!toolPlannerValid(d.plan))return false;
  form.elements.namedItem('title').value=d.task;
  const position=form.elements.namedItem('positionDesc');if(position)position.value=d.task;
  const qty=form.elements.namedItem('positionQty'),unit=form.elements.namedItem('positionUnit');
  if(d.plan.areaM2 && qty&&unit){qty.value=String(d.plan.areaM2);unit.value='m²';}
  const host=form.querySelector('#toolplan-form-panel'),result=host?.querySelector('#toolplan-form-result');
  if(host&&result){host.__toolPlan=structuredClone(d.plan);host.dataset.toolManual='1';host.dataset.toolSource=toolPlannerFingerprint(form);result.dataset.generated='1';result.innerHTML=toolPlannerInner(host.__toolPlan,true);}
  orderUpdatePreview();homeToolTransfer=false;homeToolTransferWorkspace=null;
  return true;
}
function homeToolAfterCustomerCreated(){
  if(!homeToolAwaitingCustomer())return false;
  homeToolDisplayNewOrder();return true;
}
async function homeToolCopy(){
  if(!homeToolSync())return alert('Bitte die Werkzeugliste prüfen.');
  const d=homeToolDraft(),p=d.plan;
  const lines=[`Werkzeuge für: ${d.task}`,`${p.teamSize} Person(en)${p.areaM2?' · '+p.areaM2+' m²':''}`,'',...p.items.map(i=>`${i.checked?'[x]':'[ ]'} ${i.qty} × ${i.name}`),'','Unverbindliche Planungshilfe – vor Ort prüfen.'];
  try{await navigator.clipboard.writeText(lines.join('\n'));alert('Werkzeugliste kopiert.');}
  catch{const t=document.createElement('textarea');t.value=lines.join('\n');t.style.cssText='position:fixed;left:-10000px;top:0';document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();alert(ok?'Werkzeugliste kopiert.':'Kopieren nicht möglich. Bitte die Liste direkt auf der Seite verwenden.');}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!document.querySelector('#home-tool-card')?.contains(b))return;
  if(b.dataset.homeExample){document.querySelector('#home-tool-task').value=b.dataset.homeExample;homeToolGenerate();return;}
  if(b.hasAttribute('data-home-generate')){homeToolGenerate();return;}
  if(b.hasAttribute('data-home-to-order')){homeToolOpenOrder();return;}
  if(b.hasAttribute('data-home-copy')){homeToolCopy();return;}
  const d=homeToolDraft();
  if(b.hasAttribute('data-home-add')){
    if(!toolPlannerValid(d.plan)||!homeToolSync())return alert('Bitte zuerst Werkzeuge ermitteln und die Eingaben prüfen.');
    const input=document.querySelector('#home-tool-add-name'),name=input?.value.trim();
    if(!name||name.length>120)return alert('Bitte einen Werkzeugnamen eingeben.');
    if(d.plan.items.length>=TOOLPLAN_MAX)return alert('Maximal 65 Werkzeuge.');
    d.edited=true;d.plan.items.push({id:uid(),name,qty:1,unit:'Stk.',category:'Ergänzt',reason:'Manuell hinzugefügt',checked:false});
    document.querySelector('#home-tool-result').innerHTML=homeToolResult(d.plan);return;
  }
  if(b.hasAttribute('data-tool-remove')){
    if(!homeToolSync())return alert('Bitte die Werkzeugliste prüfen.');
    const id=b.closest('[data-tool-id]')?.dataset.toolId;
    d.edited=true;d.plan.items=d.plan.items.filter(i=>i.id!==id);
    document.querySelector('#home-tool-result').innerHTML=homeToolResult(d.plan);
  }
});
document.addEventListener('change',e=>{
  if(!e.target.closest('#home-tool-card'))return;
  if(e.target.matches('[data-tool-check],[data-tool-qty],.toolplan-item-name')){
    if(!homeToolSync())alert('Bitte gültige Werkzeugnamen und Mengen zwischen 1 und 30 eingeben.');
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='home-tool-task')homeToolDraft().task=e.target.value;
  if(e.target.id==='home-tool-team'){const v=Number(e.target.value);if(Number.isInteger(v)&&v>=1&&v<=20)homeToolDraft().team=v;}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(b&&homeToolTransfer&&view==='orderCustomerForm'&&b.dataset.openView==='orderCustomers'){homeToolTransfer=false;homeToolTransferWorkspace=null;}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='home-tool-task'){e.preventDefault();homeToolGenerate();}
});
