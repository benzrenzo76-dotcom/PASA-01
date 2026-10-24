// SIMULATION ONLY: one actual HTTP banking transaction, never telephony.
import {randomUUID} from 'node:crypto';
import {VirtualNetwork,VirtualUssdGateway,ideal,exportRun} from '../dist/src/index.js';
const base=process.argv[2]??'http://127.0.0.1:8080';
const url=new URL(base);
if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Demo is restricted to a loopback backend.');
const normal=new VirtualUssdGateway(base,new VirtualNetwork({...ideal}));
const prepare=await normal.request('prepare-demo','PREPARE','/prepare',{sourceId:'alfa-joaquin',alias:'kiosco.pepito',amountCents:500000,idempotencyKey:randomUUID()});
if(!prepare.value)throw Error('Preparation unavailable');
const {operation,authorization}=prepare.value;
const uncertain=await new VirtualUssdGateway(base,new VirtualNetwork({...ideal,duplicate:1,loseConfirmation:true})).request(operation.operationId,'EXECUTE','/execute',{...operation,authorization});
const reconciled=await normal.request(operation.operationId,'STATUS','/operations/'+operation.operationId);
console.log(JSON.stringify({simulation:true,prepare:exportRun(prepare),execute:exportRun(uncertain),reconciledState:reconciled.value?.operation?.state,operationId:operation.operationId},null,2));
