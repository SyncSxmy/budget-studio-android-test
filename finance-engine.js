/* Budget Studio 0.9.6 – independent, testable finance calculations.
   No cloud connection, no bank access, no changes to existing transaction data. */
'use strict';
const FinanceEngine=(()=>{
 const asMonth=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(s))?s:null;
 function shiftMonth(month,delta){if(!asMonth(month))throw Error('Ungültiger Monat');const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
 const endDay=month=>new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).getUTCDate();
 function period(month,cycle='calendar'){
  if(!asMonth(month))throw Error('Ungültiger Monat');
  const start=month+(cycle==='midmonth'?'-15':'-01');
  const last=cycle==='midmonth'?shiftMonth(month,1)+'-14':month+'-'+String(endDay(month)).padStart(2,'0');
  return {month,start,end:last,cycle};
 }
 function monthForDate(date,cycle='calendar'){
  if(!/^\d{4}-\d\d-\d\d$/.test(String(date)))throw Error('Ungültiges Datum');
  const month=date.slice(0,7);
  return cycle==='midmonth'&&+date.slice(8)<15?shiftMonth(month,-1):month;
 }
 function fmt(date){return date.slice(8,10)+'.'+date.slice(5,7)+'.'+date.slice(0,4)}
 function periodLabel(p){return fmt(p.start)+' – '+fmt(p.end)}
 function entriesFor(transactions,p){return (transactions||[]).filter(t=>typeof t.date==='string'&&t.date>=p.start&&t.date<=p.end);}
 function totals(entries){let income=0,expense=0;const categories={};const detail={};for(const t of entries){const n=Number(t.amount);if(!Number.isFinite(n)||n<=0)continue;if(t.type==='income')income+=n;else if(t.type==='expense'){expense+=n;const cat=String(t.category||'Unkategorisiert').trim()||'Unkategorisiert';categories[cat]=(categories[cat]||0)+n;(detail[cat]??=[]).push(t);}}
  return {income:Math.round(income*100)/100,expense:Math.round(expense*100)/100,categories,detail,count:entries.length};
 }
 function summary(transactions,month,cycle='calendar'){const p=period(month,cycle),entries=entriesFor(transactions,p);return {...p,entries,...totals(entries)};}
 function history(transactions,month,cycle='calendar',count=6){return Array.from({length:count},(_,i)=>summary(transactions,shiftMonth(month,i-count+1),cycle));}
 function merchantText(t){
  const explicit=String(t.merchant||t.merchantKey||'').trim();
  // Raw bank CSVs sometimes carry the payee only in the description.
  let raw=explicit||String(t.note||'').replace(/^Automatisch:\s*/i,'');
  raw=raw.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  raw=raw.replace(/\b(?:MANDATSREFERENZ|GLAEUBIGER.?ID|REFERENZ|BUCHUNGSTEXT|VERWENDUNGSZWECK|END.TO.END|EREF|MREF|KREF|IBAN|BIC|KONTO|RECHNUNG|RECHNUNGSNR|BESTELLUNG|NR|DATUM|AM|VOM|SEPA|LASTSCHRIFT|PAYMENT|KARTENZAHLUNG|POS|EC.?KARTE)\b/g,' ');
  raw=raw.replace(/\b(?:DE\d{20}|[A-Z]{2}\d{2}[A-Z\d]{10,30}|[A-Z0-9]{14,}|\d{2}[.\/-]\d{2}[.\/-]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{4,})\b/g,' ');
  raw=raw.replace(/[^A-Z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
  // Skip very generic payment labels: do not assign an imaginary merchant.
  const ignored=new Set(['UEBERWEISUNG','ZAHLUNG','ABBuchung'.toUpperCase(),'ENTGELT','BELASTUNG','DAUERAUFTRAG','PAYPAL']);
  if(raw.length===1&&ignored.has(raw[0]))return '';
  return raw.slice(0,5).join(' ').slice(0,70);
 }
 function daysBetween(a,b){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);}
 function median(values){const a=[...values].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
 function detectRecurring(transactions,saved=[]){
  const buckets=new Map();
  for(const t of transactions||[]){const amount=Number(t.amount);if(t.type!=='expense'||!/^\d{4}-\d\d-\d\d$/.test(t.date)||!Number.isFinite(amount)||amount<=0||!t.accountId)continue;
   const key=merchantText(t);if(!key||key.length<3)continue;const id=t.accountId+'|'+key;
   if(!buckets.has(id))buckets.set(id,[]);buckets.get(id).push({...t,amount});
  }
  const out=[];
  for(const [key,group] of buckets){if(group.length<2)continue;
   const items=[...group].sort((a,b)=>a.date.localeCompare(b.date));
   // Distinct payment dates, avoid duplicate imported lines distorting intervals.
   const dates=[...new Map(items.map(t=>[t.date+'|'+t.amount,t])).values()];
   const modes=[{frequency:'monthly',low:25,high:40},{frequency:'quarterly',low:80,high:103},{frequency:'yearly',low:330,high:400}];
   for(const mode of modes){let matchCount=0;const matched=[];
    for(let i=1;i<dates.length;i++){
     const b=dates[i],a=dates[i-1],d=daysBetween(a.date,b.date);const tolerance=Math.max(2,Math.min(a.amount,b.amount)*0.15);
     if(d>=mode.low&&d<=mode.high&&Math.abs(a.amount-b.amount)<=tolerance){matchCount++;matched.push(a,b)}
    }
    if(matchCount===0)continue;
    if(saved.some(s=>s.sourceMerchantKey===key || (s.detected&&s.sourceMerchantKey===key+'|'+mode.frequency)))continue;
    const reps=[...new Map(matched.map(t=>[t.date,t])).values()];
    // Reject samples where most same-merchant payments are irregular; exception for just two observations.
    if(dates.length>3&&matchCount/(dates.length-1)<.5)continue;
    const amount=Math.round(median(reps.map(t=>t.amount))*100)/100;
    const label=(items.find(x=>x.merchant)?.merchant||items.find(x=>x.merchantKey)?.merchantKey||items[0].note||key.split('|')[1]).replace(/^Automatisch:\s*/i,'').trim().slice(0,60);
    out.push({id:key+'|'+mode.frequency,key,merchant:label,frequency:mode.frequency,amount,count:dates.length,matches:matchCount,lastDate:items.at(-1).date,confidence:matchCount>=2?'hoch':'mittel'});
   }
  }
  return out.sort((a,b)=>b.matches-a.matches||b.lastDate.localeCompare(a.lastDate));
 }
 return {shiftMonth,period,monthForDate,periodLabel,entriesFor,totals,summary,history,merchantText,detectRecurring};
})();
