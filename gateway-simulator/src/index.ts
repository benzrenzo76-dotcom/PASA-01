/** SIMULATION ONLY. This module never calls telephony APIs or dials a code. */
export type Stage = 'PASA_LAB'|'VIRTUAL_CELLULAR'|'USSD_GATEWAY'|'HTTP_REQUEST'|'PASA_API'|'HTTP_RESPONSE'|'USSD_RESPONSE'|'HANDSET';
export interface NetworkEvent { sequence:number; stage:Stage; phase:string; status:'RUNNING'|'COMPLETED'|'ERROR'|'TIMEOUT'; operationId:string; timestamp:string; elapsedMs:number; artificialMs:number; detail:string }
export interface Config { enabled:boolean; seed:number; fixedMs:number|null; minMs:number; maxMs:number; variabilityMs:number; loss:number; timeout:number; duplicate:number; outOfOrder:number; gatewayFailure:number; apiFailure:number; bankRejection:number; serverDelayMs:number; loseConfirmation:boolean }
export const ideal:Config={enabled:true,seed:1,fixedMs:0,minMs:0,maxMs:0,variabilityMs:0,loss:0,timeout:0,duplicate:0,outOfOrder:0,gatewayFailure:0,apiFailure:0,bankRejection:0,serverDelayMs:0,loseConfirmation:false};
export const profiles:Record<string,Config>={
 'Red ideal':{...ideal},
 'PASA-01 Observado':{...ideal,fixedMs:300},
 'Red lenta':{...ideal,fixedMs:1350},
 'Red congestionada':{...ideal,fixedMs:null,minMs:1350,maxMs:1915,variabilityMs:100},
 'Red inestable':{...ideal,fixedMs:436,loss:.15,timeout:.1,duplicate:.1,outOfOrder:.1},
 'Gateway parcialmente caído':{...ideal,fixedMs:300,gatewayFailure:.4},
 'Respuesta bancaria demorada':{...ideal,fixedMs:300,serverDelayMs:1500},
 'Pérdida de confirmación':{...ideal,fixedMs:300,loseConfirmation:true}
};
export const observed={source:'REPORTED_BY_FOUNDER',diagnosticOnly:true,valuesMs:[190,300,436,1350,1915],apiLevel:36,statisticalDistribution:false,note:'Mediciones reportadas de diagnóstico USSD; perfiles artificiales ilustrativos, no percentiles reales.'};
export interface RunResult<T> { simulation:true; transport:'VIRTUAL_USSD_TO_HTTP'; operationId:string; state:'DELIVERED'|'PENDING'|'ERROR'|'REJECTED'; submitted:boolean; value?:T; events:NetworkEvent[]; measuredElapsedMs:number; measuredActionMs:number; measuredWaitMs:number; artificialDelayMs:number; duplicateRequests:number }
export interface ActionContext { duplicate:boolean; bankRejection:boolean }
export interface Runtime { sleep:(ms:number)=>Promise<void>; now:()=>number; wall:()=>string }
const defaultRuntime:Runtime={sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),now:()=>performance.now(),wall:()=>new Date().toISOString()};
function valid(config:Config) {
 for(const k of ['loss','timeout','duplicate','outOfOrder','gatewayFailure','apiFailure','bankRejection'] as const) if(!Number.isFinite(config[k])||config[k]<0||config[k]>1) throw Error('Invalid probability: '+k);
 for(const k of ['minMs','maxMs','variabilityMs','serverDelayMs'] as const) if(!Number.isFinite(config[k])||config[k]<0||config[k]>10000) throw Error('Invalid bounded delay: '+k);
 if(config.maxMs<config.minMs||config.fixedMs!==null&&(!Number.isFinite(config.fixedMs)||config.fixedMs<0||config.fixedMs>10000)||!Number.isSafeInteger(config.seed))throw Error('Invalid configuration');
}
function generator(seed:number){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export class VirtualNetwork {
 private random:()=>number;
 constructor(readonly config:Config={...ideal},private runtime:Runtime=defaultRuntime,private onEvent?:(e:NetworkEvent)=>void){valid(config);this.random=generator(config.seed);}
 async run<T>(operationId:string,phase:string,action:(context:ActionContext)=>Promise<T>):Promise<RunResult<T>>{
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(operationId)||!['PREPARE','EXECUTE','STATUS','ALIAS','BALANCE'].includes(phase))throw Error('Invalid virtual envelope');
  const start=this.runtime.now(),events:NetworkEvent[]=[];let artificial=0,waitMeasured=0,actionMeasured=0,submitted=false,duplicates=0;
  const chance=(p:number)=>this.config.enabled&&this.random()<p;
  const emit=(stage:Stage,status:NetworkEvent['status'],detail:string)=>{const e:NetworkEvent={sequence:events.length+1,stage,phase,status,operationId,timestamp:this.runtime.wall(),elapsedMs:this.runtime.now()-start,artificialMs:artificial,detail};events.push(e);this.onEvent?.(e);};
  const delay=async(ms:number)=>{artificial+=ms;const t=this.runtime.now();if(ms>0)await this.runtime.sleep(ms);waitMeasured+=this.runtime.now()-t;};
  const result=(state:RunResult<T>['state'],value?:T):RunResult<T>=>({simulation:true,transport:'VIRTUAL_USSD_TO_HTTP',operationId,state,submitted,value,events,measuredElapsedMs:this.runtime.now()-start,measuredActionMs:actionMeasured,measuredWaitMs:waitMeasured,artificialDelayMs:artificial,duplicateRequests:duplicates});
  const budget=this.config.enabled?Math.max(0,(this.config.fixedMs??this.config.minMs+this.random()*(this.config.maxMs-this.config.minMs))+(this.random()*2-1)*this.config.variabilityMs):0;
  emit('PASA_LAB','COMPLETED','SIMULACIÓN: solicitud virtual creada');
  emit('VIRTUAL_CELLULAR','RUNNING','Tránsito artificial; no operadora');await delay(budget/2);
  if(chance(this.config.loss)){emit('VIRTUAL_CELLULAR','TIMEOUT','Pérdida artificial antes del gateway; resultado desconocido para el cliente');return result('PENDING');}
  emit('VIRTUAL_CELLULAR','COMPLETED','Solicitud virtual entregada');
  emit('USSD_GATEWAY','RUNNING','Adaptador USSD virtual → HTTP');
  if(chance(this.config.gatewayFailure)){emit('USSD_GATEWAY','ERROR','Falla artificial de gateway antes de enviar HTTP');return result('ERROR');}
  emit('USSD_GATEWAY','COMPLETED','Mensaje convertido a solicitud HTTP de laboratorio');emit('HTTP_REQUEST','COMPLETED','Solicitud HTTP preparada');
  emit('PASA_API','RUNNING','Invocando acción real del motor/adaptador');
  if(chance(this.config.apiFailure)){emit('PASA_API','ERROR','Falla artificial de API antes del procesamiento');return result('ERROR');}
  if(this.config.enabled)await delay(this.config.serverDelayMs);
  let value:T;const t=this.runtime.now();
  try{const bankRejection=chance(this.config.bankRejection);submitted=true;value=await action({duplicate:false,bankRejection});if(chance(this.config.duplicate)){duplicates++;await action({duplicate:true,bankRejection});emit('HTTP_REQUEST','COMPLETED','Duplicado artificial: mismo ID y autorización; el motor debe deduplicar');}}
  catch {actionMeasured+=this.runtime.now()-t;emit('PASA_API','TIMEOUT','Acción falló después de enviar; consultar estado por ID, nunca reenviar como nueva operación');return result('PENDING');}
  actionMeasured+=this.runtime.now()-t;emit('PASA_API','COMPLETED','Acción del motor completada');emit('HTTP_RESPONSE','COMPLETED','Respuesta del adaptador recibida');
  if(chance(this.config.timeout)||this.config.enabled&&this.config.loseConfirmation){emit('USSD_RESPONSE','TIMEOUT','Confirmación perdida artificialmente después del procesamiento; consultar estado');return result('PENDING');}
  emit('USSD_RESPONSE','RUNNING','Convirtiendo respuesta HTTP a respuesta USSD virtual');await delay(budget/2);emit('USSD_RESPONSE','COMPLETED','Respuesta virtual lista');
  if(chance(this.config.outOfOrder)){emit('HANDSET','RUNNING','Respuesta tardía artificial retenida; el ID mantiene correlación');await delay(100);}
  emit('HANDSET','COMPLETED','Respuesta entregada al cliente virtual');return result('DELIVERED',value);
 }
}
/** Compact envelope deliberately excludes authorization and financial payload from exported events. */
export function encodeEnvelope(operationId:string,phase:'P'|'E'|'S'){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(operationId))throw Error('Invalid ID');return `V1:${phase}:${operationId}`;}
export function decodeEnvelope(message:string){const m=/^V1:([PES]):([a-zA-Z0-9_-]{1,128})$/.exec(message);if(!m)throw Error('Invalid simulated message');return {version:'V1',phase:m[1],operationId:m[2]};}

/** Actual HTTP adapter, never a commercial USSD gateway. Does not expose tokens in events. */
export class VirtualUssdGateway {
 constructor(readonly baseUrl:string,readonly network:VirtualNetwork){const url=new URL(baseUrl);if(!['http:','https:'].includes(url.protocol))throw Error('HTTP URL required');}
 request<T>(id:string,phase:'PREPARE'|'EXECUTE'|'STATUS'|'ALIAS'|'BALANCE',path:string,body?:unknown){
  if(!/^\/(?:prepare|execute|operations\/[a-zA-Z0-9_-]+|accounts|aliases\/[a-zA-Z0-9_.-]+)$/.test(path))throw Error('Unsupported lab route');
  return this.network.run<T>(id,phase,async context=>{
   const payload=context.bankRejection&&phase==='EXECUTE'&&body&&typeof body==='object'?{...body,rejectBank:true}:body;
   const response=await fetch(new URL(path,this.baseUrl),{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Lab API returned '+response.status);return await response.json() as T;
  });
 }
}

/** Safe export: deliberately excludes API result, payload and authorization. */
export function exportRun<T>(run:RunResult<T>){const {value:_,...safe}=run;return safe;}
