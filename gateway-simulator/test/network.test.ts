import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VirtualNetwork,ideal,profiles,encodeEnvelope,decodeEnvelope,exportRun} from '../src/index.js';
function runtime(){let time=0;return {sleep:async(ms:number)=>{time+=ms;},now:()=>time,wall:()=>new Date(time).toISOString()};}
test('observed profile is artificial, bounded and deterministic, with timestamped actual events',async()=>{
 const scenario={...profiles['Red congestionada'],seed:123};
 const a=await new VirtualNetwork(scenario,runtime()).run('op1','EXECUTE',async()=>({ok:true}));
 const b=await new VirtualNetwork(scenario,runtime()).run('op1','EXECUTE',async()=>({ok:true}));
 assert.deepEqual(a,b);assert.equal(a.state,'DELIVERED');assert.ok(a.artificialDelayMs>=1250&&a.artificialDelayMs<=2015);assert.equal(a.measuredActionMs,0);assert.equal(a.events.at(-1)?.stage,'HANDSET');
 assert.ok(a.events.every((e,i)=>e.sequence===i+1&&e.timestamp));
});
test('gateway and pre-request loss do not invoke banking action',async()=>{
 let calls=0;for(const config of [{...ideal,gatewayFailure:1},{...ideal,loss:1}])await new VirtualNetwork(config,runtime()).run('op1','EXECUTE',async()=>++calls);
 assert.equal(calls,0);
});
test('duplicated message uses same operation context, lost confirmation hides committed response',async()=>{
 let calls=0;const run=await new VirtualNetwork({...ideal,duplicate:1,loseConfirmation:true},runtime()).run('op1','EXECUTE',async()=>{calls++;return {authorization:'must-not-export',state:'ACCREDITED'};});
 assert.equal(calls,2);assert.equal(run.duplicateRequests,1);assert.equal(run.state,'PENDING');assert.equal(run.value,undefined);assert.equal(run.submitted,true);assert.equal(run.events.at(-1)?.status,'TIMEOUT');assert.ok(!JSON.stringify(exportRun(run)).includes('must-not-export'));
});
test('disabled faults execute without artificial wait or duplicate',async()=>{
 let calls=0;const result=await new VirtualNetwork({...ideal,enabled:false,duplicate:1,loss:1,timeout:1,fixedMs:900,serverDelayMs:900},runtime()).run('op1','EXECUTE',async()=>++calls);
 assert.equal(result.state,'DELIVERED');assert.equal(result.artificialDelayMs,0);assert.equal(calls,1);
});
test('invalid envelope/config rejected and compact message never represents dialable code',()=>{
 assert.throws(()=>new VirtualNetwork({...ideal,loss:2}));assert.throws(()=>encodeEnvelope('*invented#','E'));
 const message=encodeEnvelope('opaque-operation_1','E');assert.deepEqual(decodeEnvelope(message),{version:'V1',phase:'E',operationId:'opaque-operation_1'});assert.throws(()=>decodeEnvelope('V1:X:id'));assert.ok(!message.includes('*'));
});
test('out of order configuration emits real response retention events',async()=>{
 const run=await new VirtualNetwork({...ideal,outOfOrder:1},runtime()).run('op1','STATUS',async()=>({state:'ACCREDITED'}));
 assert.equal(run.state,'DELIVERED');assert.equal(run.artificialDelayMs,100);assert.ok(run.events.some(e=>e.stage==='HANDSET'&&e.status==='RUNNING'));
});
test('retained first response is actually overtaken by a concurrent fast response',async()=>{
 const completions:string[]=[];
 const slow=new VirtualNetwork({...ideal,outOfOrder:1});
 const fast=new VirtualNetwork({...ideal});
 await Promise.all([
  slow.run('slow-first','STATUS',async()=>({state:'ACCREDITED'})).then(()=>completions.push('slow-first')),
  fast.run('fast-second','STATUS',async()=>({state:'ACCREDITED'})).then(()=>completions.push('fast-second'))
 ]);
 assert.deepEqual(completions,['fast-second','slow-first']);
});
