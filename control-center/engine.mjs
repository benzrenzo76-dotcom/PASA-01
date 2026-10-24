export const defaults={enabled:true,min:190,max:1915,fixed:300,variation:0,loss:0,timeout:0,duplicate:0,outOfOrder:false,gateway:0,api:0,reject:0,serverDelay:0,seed:1,lostConfirmation:false};
export const profiles={
 'Red ideal':{...defaults,fixed:0,min:0,max:0},
 'PASA-01 Observado':{...defaults},
 'Red lenta':{...defaults,fixed:1350},
 'Red congestionada':{...defaults,fixed:1915,variation:300},
 'Red inestable':{...defaults,loss:.15,timeout:.1,duplicate:.2,outOfOrder:true},
 'Gateway parcialmente caído':{...defaults,gateway:.3},
 'Respuesta bancaria demorada':{...defaults,serverDelay:1500},
 'Pérdida de confirmación':{...defaults,lostConfirmation:true}
};
const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const initial=()=>({accounts:[{id:'alfa-joaquin',bank:'Banco Alfa',holder:'Joaquín',alias:'joaquin.prueba',balance:10000000},{id:'beta-kiosco',bank:'Banco Beta',holder:'Kiosco Pepito',alias:'kiosco.pepito',balance:2000000}],operations:[],ledger:[],events:[],runs:[],betaAvailable:true});
const uid=()=>crypto.randomUUID();
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
const safe=n=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
const fields=['operationId','sourceId','destinationId','amountCents','currency','expiresAt','nonce'];
export class Lab {
 constructor(name='pasa-financial-v01'){this.name=name;}
 async open(){this.db=await new Promise((ok,no)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('lab');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});await this.change(s=>s);return this;}
 async change(fn){return new Promise((ok,no)=>{const tx=this.db.transaction('lab','readwrite'),store=tx.objectStore('lab');let result;tx.oncomplete=()=>ok(result);tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||new Error('Transacción abortada'));const get=store.get('state');get.onsuccess=()=>{try{const s=get.result||initial();result=fn(s);store.put(s,'state')}catch(e){tx.abort();no(e)}}})}
 async state(){const tx=this.db.transaction('lab','readonly');return (await req(tx.objectStore('lab').get('state')))||initial();}
 async reset(){await this.change(s=>{Object.assign(s,initial());});}
 async alias(alias){const s=await this.state();return s.accounts.find(a=>a.alias===alias)||null;}
 async account({bank,holder,alias}){if(!['Banco Alfa','Banco Beta'].includes(bank)||!holder.trim()||!/^[-a-z0-9.]{3,40}$/.test(alias))throw Error('Datos ficticios inválidos');return this.change(s=>{if(s.accounts.some(a=>a.alias===alias))throw Error('Alias existente');const a={id:uid(),bank,holder:holder.slice(0,60),alias,balance:0};s.accounts.push(a);return a;});}
 async setBeta(available){await this.change(s=>{s.betaAvailable=available;});}
 async rename(id,alias){return this.change(s=>{if(s.accounts.some(a=>a.alias===alias))throw Error('Alias ocupado');s.accounts.find(a=>a.id===id).alias=alias;});}
 async prepare(sourceId,alias,amountCents,key=uid(),operationId=uid()){
  if(!safe(amountCents))throw Error('Importe inválido: centavos enteros positivos, máximo $1.000.000.');
  const id=operationId,token=secret(),nonce=uid();
  return this.change(s=>{const old=s.operations.find(o=>o.key===key);if(old){if(old.sourceId!==sourceId||old.alias!==alias||old.amountCents!==amountCents)throw Error('Clave idempotente con datos diferentes');return structuredClone(old);}
   if(s.operations.some(o=>o.operationId===id))throw Error('ID de operación existente');
   const from=s.accounts.find(a=>a.id===sourceId),to=s.accounts.find(a=>a.alias===alias);
   if(!from||!to||from.id===to.id)throw Error('Origen o destinatario inválido');
   const op={operationId:id,sourceId,destinationId:to.id,amountCents,currency:'ARS',expiresAt:Date.now()+300000,nonce,authorization:token,key,alias,state:'AWAITING_CONFIRMATION',transitions:['CREATED','PREPARED','AWAITING_CONFIRMATION'],createdAt:Date.now(),recipient:to.holder,bank:to.bank};s.operations.push(op);return structuredClone(op);
  });
 }
 async execute(auth,{reject=false}={}){return this.change(s=>{
  const op=s.operations.find(o=>o.operationId===auth.operationId);if(!op)throw Error('Operación inexistente');
  if(fields.some(f=>auth[f]!==op[f])||op.authorization!==auth.authorization)throw Error('Autorización o datos alterados');
  if(['ACCREDITED','REJECTED','EXPIRED','CANCELLED'].includes(op.state))return structuredClone(op);
  if(op.expiresAt<=Date.now()){op.state='EXPIRED';op.transitions.push('EXPIRED');op.reason='Autorización vencida';return structuredClone(op)}
  const from=s.accounts.find(a=>a.id===op.sourceId),to=s.accounts.find(a=>a.id===op.destinationId);
  op.state='SUBMITTED';op.transitions.push('SUBMITTED');
  if(!from||!to||from.balance<op.amountCents||reject||(to.bank==='Banco Beta'&&!s.betaAvailable)){op.state='REJECTED';op.transitions.push('REJECTED');op.reason=!s.betaAvailable?'Banco Beta no disponible':reject?'Rechazo inyectado':'Fondos insuficientes';return structuredClone(op)}
  if(!Number.isSafeInteger(to.balance+op.amountCents))throw Error('Límite de saldo');
  from.balance-=op.amountCents;to.balance+=op.amountCents;op.state='ACCREDITED';op.transitions.push('ACCREDITED');op.completedAt=Date.now();op.receipt='FICTICIO-'+op.operationId;
  s.ledger.push({operationId:op.operationId,at:Date.now(),accountId:from.id,delta:-op.amountCents,balance:from.balance},{operationId:op.operationId,at:Date.now(),accountId:to.id,delta:op.amountCents,balance:to.balance});return structuredClone(op);
 });}
 async cancel(id){return this.change(s=>{const op=s.operations.find(o=>o.operationId===id);if(!op)throw Error('Operación inexistente');if(op.state==='AWAITING_CONFIRMATION'){op.state='CANCELLED';op.transitions.push('CANCELLED');}return sanitize(op);});}
 async reconcile(id){return this.change(s=>{const op=s.operations.find(o=>o.operationId===id);if(op)for(const r of s.runs.filter(r=>r.operationId===id&&r.clientState==='PENDING')){r.resolvedAt=Date.now();r.resolvedState=op.state;}return sanitize(op);});}
 async status(id){const s=await this.state();return sanitize(s.operations.find(o=>o.operationId===id));}
 async saveRun(run){await this.change(s=>{s.runs.push(run);s.events.push(...run.events);if(s.runs.length>1500)s.runs.splice(0,s.runs.length-1500);if(s.events.length>20000)s.events.splice(0,s.events.length-20000)});}
}
export function sanitize(o){if(!o)return null;const {authorization,nonce,key,...rest}=o;return rest;}
export function seeded(seed){let x=(Number(seed)||1)>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function transmit(lab,op,cfg={},notify=()=>{},phase='execute'){
 const c={...defaults,...cfg},random=seeded(c.seed),start=performance.now(),events=[];let artificial=0;
 const event=(stage,state,detail='')=>{const e={operationId:op.operationId,phase,stage,state,at:Date.now(),elapsedRealMs:Math.round(performance.now()-start),detail};events.push(e);notify(e);};
 const delay=async ms=>{ms=Math.max(0,Math.min(5000,ms));artificial+=ms;await sleep(ms);};
 const base=c.enabled?Math.max(c.min,Math.min(c.max,c.fixed+(random()-.5)*2*c.variation)):0;
 let result,clientState='PENDING',reason='',engineRealMs=null;
 try{
  event('PASA Lab','COMPLETED','Mensaje compacto virtual '+(phase==='execute'?'E':'P')+'|'+op.operationId+'|'+op.amountCents+'|ARS');
  event('USSD Virtual','RUNNING');await delay(base/2);
  if(c.enabled&&(random()<c.loss||random()<c.timeout)){event('USSD Virtual','TIMEOUT','Sin entrega; no se reenvía automáticamente');throw Error('Pérdida o timeout antes del gateway')}
  event('USSD Virtual','COMPLETED');event('Gateway','RUNNING');
  if(c.enabled&&random()<c.gateway){event('Gateway','ERROR');throw Error('Fallo artificial de gateway')}
  event('Gateway','COMPLETED','Conversión virtual USSD → llamada al motor local (sin HTTP real)');event('API PASA','RUNNING');
  if(c.enabled&&random()<c.api){event('API PASA','ERROR');throw Error('Fallo artificial de API')}
  await delay(c.enabled?c.serverDelay:0);event('API PASA','COMPLETED');event('Banco Alfa','RUNNING');event('Banco Beta','RUNNING');
  const engineStart=performance.now();result=phase==='prepare'?await lab.prepare(op.sourceId,op.alias,op.amountCents,op.key,op.operationId):await lab.execute(op,{reject:c.enabled&&random()<c.reject});
  engineRealMs=performance.now()-engineStart;
  const bankState=['REJECTED','EXPIRED','CANCELLED'].includes(result.state)?'ERROR':'COMPLETED';event('Banco Alfa',bankState);event('Banco Beta',bankState,phase==='prepare'?'Consulta y preparación sin movimientos':result.state==='ACCREDITED'?'Débito y crédito confirmados en una única transacción IndexedDB':'Sin movimientos: '+result.state);
  if(phase==='execute'&&c.enabled&&random()<c.duplicate){const again=await lab.execute(op);event('Gateway','COMPLETED','Duplicado entregado: resultado idempotente '+again.state)}
  event('Confirmación','RUNNING');await delay(base/2);
  if(c.enabled&&c.outOfOrder){event('Gateway','COMPLETED','Respuesta atrasada de etapa anterior, correlacionada por ID; no cambia el resultado')}
  if(c.enabled&&c.lostConfirmation){event('Confirmación','TIMEOUT','Procesamiento posible; consultá el estado por ID');throw Error('Se perdió la respuesta después del procesamiento')}
  clientState=result.state;event('Confirmación','COMPLETED');
  const run={operationId:op.operationId,phase,clientState,realMs:performance.now()-start,artificialMs:artificial,engineRealMs,events,at:Date.now()};await lab.saveRun(run);return {...run,result:sanitize(result),prepared:phase==='prepare'?result:undefined};
 }catch(e){reason=e.message;const last=events.at(-1);if(last?.state==='RUNNING')event(last.stage,'ERROR',reason);const run={operationId:op.operationId,phase,clientState,reason,realMs:performance.now()-start,artificialMs:artificial,engineRealMs,events,at:Date.now()};await lab.saveRun(run);return run;}
}
export function metrics(runs){const values=runs.map(r=>r.realMs).sort((a,b)=>a-b),pick=p=>values.length?values[Math.ceil(p*values.length)-1]:null;return{count:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,median:pick(.5),p95:pick(.95),p99:pick(.99),min:values[0]??null,max:values.at(-1)??null,artificialMean:runs.length?runs.reduce((a,b)=>a+b.artificialMs,0)/runs.length:null,engineMean:runs.filter(r=>r.engineRealMs!==null).length?runs.filter(r=>r.engineRealMs!==null).reduce((a,b)=>a+b.engineRealMs,0)/runs.filter(r=>r.engineRealMs!==null).length:null,errors:runs.filter(r=>!['ACCREDITED','AWAITING_CONFIRMATION'].includes(r.clientState)).length};}
