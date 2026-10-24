import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createLabServer} from '../../backend/dist/server.js';
import {BankingEngine} from '../../backend/dist/engine.js';
import {VirtualNetwork,VirtualUssdGateway,ideal,exportRun} from '../dist/src/index.js';

test('actual HTTP gateway: lost confirmation after SQLite commit, query then retry cannot duplicate money',async()=>{
 const engine=new BankingEngine();const server=createLabServer(engine);server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const gateway=new VirtualUssdGateway(base,new VirtualNetwork({...ideal}));
  const prepared=await gateway.request('prepare-1','PREPARE','/prepare',{sourceId:'alfa-joaquin',alias:'kiosco.pepito',amountCents:500000,idempotencyKey:'network-e2e-1'});
  assert.equal(prepared.state,'DELIVERED');const {operation,authorization}=prepared.value;const body={...operation,authorization};
  const lostGateway=new VirtualUssdGateway(base,new VirtualNetwork({...ideal,duplicate:1,loseConfirmation:true}));
  const lost=await lostGateway.request(operation.operationId,'EXECUTE','/execute',body);
  assert.equal(lost.state,'PENDING');assert.equal(lost.value,undefined);assert.equal(lost.submitted,true);assert.equal(lost.duplicateRequests,1);
  assert.ok(lost.events.some(e=>e.stage==='HTTP_RESPONSE'&&e.status==='COMPLETED'));
  assert.ok(lost.events.some(e=>e.stage==='USSD_RESPONSE'&&e.status==='TIMEOUT'));
  const status=await gateway.request(operation.operationId,'STATUS','/operations/'+operation.operationId);
  assert.equal(status.value.operation.state,'ACCREDITED');
  const replay=await gateway.request(operation.operationId,'EXECUTE','/execute',body);assert.equal(replay.value.operation.state,'ACCREDITED');
  const accounts=await gateway.request('balances','BALANCE','/accounts');
  assert.equal(accounts.value.accounts.find(a=>a.id==='alfa-joaquin').balanceCents,9500000);
  assert.equal(accounts.value.accounts.find(a=>a.alias==='kiosco.pepito').balanceCents,2500000);
  assert.equal(engine.movements().filter(m=>m.operationId===operation.operationId).length,2);
  assert.ok(!JSON.stringify(exportRun(prepared)).includes(authorization));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));engine.close();}
});

test('bank refusal injection crosses actual HTTP boundary and records coherent rejection without money creation',async()=>{
 const engine=new BankingEngine();const server=createLabServer(engine);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const base=`http://127.0.0.1:${server.address().port}`;const normal=new VirtualUssdGateway(base,new VirtualNetwork({...ideal}));
  const prepared=await normal.request('prep-reject','PREPARE','/prepare',{sourceId:'alfa-joaquin',alias:'kiosco.pepito',amountCents:500000,idempotencyKey:'network-reject'});
  const rejecting=new VirtualUssdGateway(base,new VirtualNetwork({...ideal,bankRejection:1}));
  const result=await rejecting.request(prepared.value.operation.operationId,'EXECUTE','/execute',{...prepared.value.operation,authorization:prepared.value.authorization});
  assert.equal(result.state,'DELIVERED');assert.equal(result.value.operation.state,'REJECTED');assert.equal(engine.movements().filter(m=>m.operationId===prepared.value.operation.operationId).length,0);
  assert.equal(engine.accounts().reduce((sum,a)=>sum+a.balanceCents,0),12000000);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));engine.close();}
});
