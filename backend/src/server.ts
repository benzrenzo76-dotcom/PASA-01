import { createServer, type IncomingMessage } from 'node:http';
import { pathToFileURL } from 'node:url';
import { BankingEngine, LabError, type Authorization, type Prepare } from './engine.js';

async function body(req:IncomingMessage):Promise<Record<string,unknown>> {let text='';for await(const chunk of req){text+=String(chunk);if(text.length>16384)throw new LabError('BODY_TOO_LARGE',413);}try{const parsed=JSON.parse(text||'{}');if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();return parsed;}catch{throw new LabError('INVALID_JSON');}}
export function createLabServer(engine=new BankingEngine()) {
 return createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  const origin=req.headers.origin;
  if(origin){const allowed=process.env.PASA_ALLOWED_ORIGIN;let local=false;try{const source=new URL(origin);local=['localhost','127.0.0.1'].includes(source.hostname);}catch{}if(!local&&origin!==allowed){res.writeHead(403);res.end(JSON.stringify({simulation:true,error:'ORIGIN_NOT_ALLOWED'}));return;}res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  try{
   const url=new URL(req.url??'/', 'http://localhost');const route=url.pathname;let data:Record<string,unknown>;
   if(req.method==='GET'&&route==='/health')data={status:'ok',mode:'HTTP_SIMULATED',simulation:true};
   else if(req.method==='GET'&&route==='/accounts')data={accounts:engine.accounts(),providers:engine.providers()};
   else if(req.method==='GET'&&route.startsWith('/aliases/'))data={account:engine.resolve(decodeURIComponent(route.slice(9)))};
   else if(req.method==='GET'&&route==='/operations')data={operations:engine.operations()};
   else if(req.method==='GET'&&route.startsWith('/operations/'))data={operation:engine.operation(route.slice(12)),events:engine.events(route.slice(12))};
   else if(req.method==='GET'&&route==='/movements')data={movements:engine.movements(url.searchParams.get('accountId')??undefined)};
   else if(req.method==='POST'&&route==='/prepare')data=engine.prepare(await body(req) as unknown as Prepare);
   else if(req.method==='POST'&&route==='/execute'){const input=await body(req);if(input.rejectBank!==undefined&&typeof input.rejectBank!=='boolean')throw new LabError('INVALID_FAULT');data={operation:engine.execute(input as unknown as Authorization,{rejectBank:input.rejectBank===true})};}
   else if(req.method==='POST'&&route==='/reset')data={accounts:engine.reset()};
   else if(req.method==='POST'&&route==='/accounts')data={account:engine.createAccount(await body(req) as never)};
   else if(req.method==='POST'&&route==='/providers'){const input=await body(req);engine.setProvider(input.bank as string,input.available as boolean);data={providers:engine.providers()};}
   else if(req.method==='POST'&&route.startsWith('/aliases/')){const input=await body(req);data={account:engine.changeAlias(route.slice(9),input.alias as string)};}
   else throw new LabError('NOT_FOUND',404);
   res.writeHead(200);res.end(JSON.stringify({simulation:true,...data}));
  }catch(error){const status=error instanceof LabError?error.status:500;res.writeHead(status);res.end(JSON.stringify({simulation:true,error:error instanceof LabError?error.code:'LAB_INTERNAL_ERROR'}));}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const engine=new BankingEngine(process.env.PASA_DB_PATH??'pasa-lab.sqlite');const server=createLabServer(engine);server.listen(Number(process.env.PORT??8080),'127.0.0.1',()=>console.log('SIMULACIÓN HTTP: http://127.0.0.1:'+String(process.env.PORT??8080)));for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>{engine.close();process.exit(0);}));}
