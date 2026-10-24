// Reproducible local evidence only; never telephony, remote bank or external API.
import {BankingEngine} from '../backend/dist/engine.js';
import {createLabServer} from '../backend/dist/server.js';
import {VirtualNetwork,VirtualUssdGateway,ideal,profiles,exportRun} from '../gateway-simulator/dist/src/index.js';
import {randomUUID} from 'node:crypto';
const engine=new BankingEngine(':memory:');
const server=createLabServer(engine);
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const normal=new VirtualUssdGateway(base,new VirtualNetwork(ideal));
const runs=[];
try {
 for(let i=0;i<10;i++) {
  const p=await normal.request('prepare-'+i,'PREPARE','/prepare',{sourceId:'alfa-joaquin',alias:'kiosco.pepito',amountCents:100,idempotencyKey:randomUUID()});
  const {operation,authorization}=p.value;
  const net=new VirtualUssdGateway(base,new VirtualNetwork({...profiles['PASA-01 Observado'],seed:i+1}));
  runs.push(await net.request(operation.operationId,'EXECUTE','/execute',{...operation,authorization}));
 }
 const numbers=runs.map(x=>x.measuredElapsedMs).sort((a,b)=>a-b);
 console.log(JSON.stringify({simulation:true,scope:'actual loopback HTTP + SQLite; artificial 300ms profile; NOT carrier/banking latency',sampleSize:runs.length,medianRealMs:(numbers[4]+numbers[5])/2,p95RealMs:numbers[9],p99RealMs:numbers[9],tailWarning:'n=10; insufficient to characterize tail percentiles',meanArtificialMs:runs.reduce((s,x)=>s+x.artificialDelayMs,0)/runs.length,meanActualActionMs:runs.reduce((s,x)=>s+x.measuredActionMs,0)/runs.length,finalAccounts:engine.accounts(),runs:runs.map(exportRun)},null,2));
} finally {await new Promise(r=>server.close(r));engine.close();}
