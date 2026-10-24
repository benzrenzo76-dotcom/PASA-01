import { MockFinancialProvider, type FinancialProvider } from './provider.js';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';

export type State = 'CREATED'|'PREPARED'|'AWAITING_CONFIRMATION'|'SUBMITTED'|'PENDING'|'ACCREDITED'|'REJECTED'|'EXPIRED'|'CANCELLED';
export interface Account { id:string; bank:string; holder:string; alias:string; balanceCents:number; currency:'ARS' }
export interface Prepare { sourceId:string; alias:string; amountCents:number; idempotencyKey:string }
export interface Authorization { operationId:string; authorization:string; sourceId:string; destinationId:string; amountCents:number; currency:string; expiresAt:number; nonce:string }
export interface Operation { operationId:string; sourceId:string; destinationId:string; amountCents:number; currency:string; expiresAt:number; nonce:string; state:State; createdAt:number; completedAt:number|null; reason:string|null; receipt:string|null }
interface Stored extends Operation { authorization:string; idempotencyKey:string }
export class LabError extends Error { constructor(public code:string, public status=400) { super(code); } }
const transitions: Record<State,State[]> = { CREATED:['PREPARED','REJECTED'], PREPARED:['AWAITING_CONFIRMATION','EXPIRED','CANCELLED'], AWAITING_CONFIRMATION:['SUBMITTED','EXPIRED','CANCELLED'], SUBMITTED:['ACCREDITED','REJECTED','PENDING'], PENDING:['ACCREDITED','REJECTED'], ACCREDITED:[], REJECTED:[], EXPIRED:[], CANCELLED:[] };
const maxAmount = 10_000_000_000;
function integer(value:unknown,max=1_000_000_000_000): asserts value is number { if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1||value>max) throw new LabError('INVALID_AMOUNT'); }
function text(value:unknown,max=120): asserts value is string { if(typeof value!=='string'||!value.trim()||value.length>max)throw new LabError('INVALID_TEXT'); }
function publicOperation(op:Stored):Operation { const {authorization:_,idempotencyKey:__,...clean}=op;return clean; }
export class BankingEngine {
 readonly db:DatabaseSync;
 constructor(path=':memory:',private now:()=>number=Date.now,private provider:FinancialProvider=new MockFinancialProvider()) {
  this.db=new DatabaseSync(path);this.db.exec('PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  this.db.exec(`CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,bank TEXT NOT NULL,holder TEXT NOT NULL,alias TEXT UNIQUE NOT NULL,balanceCents INTEGER NOT NULL CHECK(balanceCents>=0 AND balanceCents<=1000000000000),currency TEXT NOT NULL CHECK(currency='ARS'));
CREATE TABLE IF NOT EXISTS providers(bank TEXT PRIMARY KEY,available INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS operations(operationId TEXT PRIMARY KEY,sourceId TEXT NOT NULL,destinationId TEXT NOT NULL,amountCents INTEGER NOT NULL,currency TEXT NOT NULL,expiresAt INTEGER NOT NULL,nonce TEXT UNIQUE NOT NULL,authorization TEXT NOT NULL,idempotencyKey TEXT UNIQUE NOT NULL,state TEXT NOT NULL,createdAt INTEGER NOT NULL,completedAt INTEGER,reason TEXT,receipt TEXT);
CREATE TABLE IF NOT EXISTS movements(id TEXT PRIMARY KEY,accountId TEXT NOT NULL REFERENCES accounts(id),operationId TEXT,deltaCents INTEGER NOT NULL,balanceAfterCents INTEGER NOT NULL,at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,operationId TEXT NOT NULL,state TEXT NOT NULL,at INTEGER NOT NULL);`);
  this.transaction(()=>{if(!(this.db.prepare('SELECT id FROM accounts LIMIT 1').get()))this.seed();});
 }
 private transaction<T>(fn:()=>T):T {this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 private seed(){for(const [id,bank,holder,alias,balance] of [['alfa-joaquin','Banco Alfa','Joaquín','joaquin.prueba',10000000],['beta-kiosco','Banco Beta','Kiosco Pepito','kiosco.pepito',2000000]] as const){this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,bank,holder,alias,balance,'ARS');this.db.prepare('INSERT INTO movements VALUES(?,?,?,?,?,?)').run(randomUUID(),id,null,balance,balance,this.now());}this.db.prepare('INSERT OR REPLACE INTO providers VALUES(?,1)').run('Banco Alfa');this.db.prepare('INSERT OR REPLACE INTO providers VALUES(?,1)').run('Banco Beta');}
 reset(){return this.transaction(()=>{this.db.exec('DELETE FROM movements;DELETE FROM events;DELETE FROM operations;DELETE FROM accounts;DELETE FROM providers;');this.seed();return this.accounts();});}
 accounts():Account[]{return this.db.prepare('SELECT * FROM accounts ORDER BY bank,id').all() as unknown as Account[];}
 account(id:string):Account {text(id);const a=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id) as unknown as Account|undefined;if(!a)throw new LabError('ACCOUNT_NOT_FOUND',404);return a;}
 resolve(alias:string):Account {text(alias);const a=this.db.prepare('SELECT * FROM accounts WHERE alias=?').get(alias.trim().toLowerCase()) as unknown as Account|undefined;if(!a)throw new LabError('ALIAS_NOT_FOUND',404);return a;}
 createAccount(input:{bank:string;holder:string;alias:string;balanceCents:number}):Account {text(input.bank);text(input.holder);text(input.alias);if(!['Banco Alfa','Banco Beta'].includes(input.bank)||!/^[a-z0-9.]{3,40}$/.test(input.alias))throw new LabError('INVALID_ACCOUNT');if(!Number.isSafeInteger(input.balanceCents)||input.balanceCents<0||input.balanceCents>1e12)throw new LabError('INVALID_AMOUNT');return this.transaction(()=>{const id=randomUUID();this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,input.bank,input.holder,input.alias,input.balanceCents,'ARS');this.db.prepare('INSERT INTO movements VALUES(?,?,?,?,?,?)').run(randomUUID(),id,null,input.balanceCents,input.balanceCents,this.now());return this.account(id);});}
 changeAlias(id:string,alias:string){text(alias);if(!/^[a-z0-9.]{3,40}$/.test(alias))throw new LabError('INVALID_ALIAS');return this.transaction(()=>{this.account(id);this.db.prepare('UPDATE accounts SET alias=? WHERE id=?').run(alias,id);return this.account(id);});}
 setProvider(bank:string,available:boolean){if(!['Banco Alfa','Banco Beta'].includes(bank)||typeof available!=='boolean')throw new LabError('INVALID_PROVIDER');this.db.prepare('UPDATE providers SET available=? WHERE bank=?').run(available?1:0,bank);}
 providers(){return this.db.prepare('SELECT * FROM providers').all();}
 private stored(id:string):Stored {text(id);const op=this.db.prepare('SELECT * FROM operations WHERE operationId=?').get(id) as unknown as Stored|undefined;if(!op)throw new LabError('OPERATION_NOT_FOUND',404);return op;}
 operation(id:string):Operation{return publicOperation(this.stored(id));}
 operations():Operation[]{return (this.db.prepare('SELECT * FROM operations ORDER BY createdAt DESC').all() as unknown as Stored[]).map(publicOperation);}
 movements(id?:string){if(id)this.account(id);return id?this.db.prepare('SELECT * FROM movements WHERE accountId=? ORDER BY at,id').all(id):this.db.prepare('SELECT * FROM movements ORDER BY at,id').all();}
 events(id?:string){return id?this.db.prepare('SELECT * FROM events WHERE operationId=? ORDER BY id').all(id):this.db.prepare('SELECT * FROM events ORDER BY id').all();}
 private transition(op:Stored,next:State,reason:string|null=null){if(!transitions[op.state].includes(next))throw new LabError('INVALID_TRANSITION',409);this.db.prepare('UPDATE operations SET state=?,reason=? WHERE operationId=?').run(next,reason,op.operationId);this.db.prepare('INSERT INTO events(operationId,state,at) VALUES(?,?,?)').run(op.operationId,next,this.now());op.state=next;op.reason=reason;}
 prepare(input:Prepare):{operation:Operation;authorization:string;source:Account;destination:Account} {
  text(input.sourceId);text(input.alias);text(input.idempotencyKey);integer(input.amountCents,maxAmount);
  return this.transaction(()=>{
   const old=this.db.prepare('SELECT * FROM operations WHERE idempotencyKey=?').get(input.idempotencyKey) as unknown as Stored|undefined;
   if(old){if(old.sourceId!==input.sourceId||old.amountCents!==input.amountCents||this.resolve(input.alias).id!==old.destinationId)throw new LabError('IDEMPOTENCY_CONFLICT',409);return {operation:publicOperation(old),authorization:old.authorization,source:this.account(old.sourceId),destination:this.account(old.destinationId)};}
   const source=this.account(input.sourceId),destination=this.resolve(input.alias);if(source.id===destination.id)throw new LabError('SELF_TRANSFER');
   const op:Stored={operationId:randomUUID(),sourceId:source.id,destinationId:destination.id,amountCents:input.amountCents,currency:'ARS',expiresAt:this.now()+120000,nonce:randomBytes(24).toString('hex'),authorization:randomBytes(32).toString('base64url'),idempotencyKey:input.idempotencyKey,state:'CREATED',createdAt:this.now(),completedAt:null,reason:null,receipt:null};
   this.db.prepare('INSERT INTO operations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(op.operationId,op.sourceId,op.destinationId,op.amountCents,op.currency,op.expiresAt,op.nonce,op.authorization,op.idempotencyKey,op.state,op.createdAt,null,null,null);
   this.db.prepare('INSERT INTO events(operationId,state,at) VALUES(?,?,?)').run(op.operationId,'CREATED',this.now());
   this.transition(op,'PREPARED');this.transition(op,'AWAITING_CONFIRMATION');return {operation:publicOperation(op),authorization:op.authorization,source,destination};
  });
 }
 execute(auth:Authorization,options:{rejectBank?:boolean}={}):Operation {
  text(auth.operationId);text(auth.authorization);return this.transaction(()=>{
   const op=this.stored(auth.operationId);
   const a=Buffer.from(auth.authorization),b=Buffer.from(op.authorization);
   if(a.length!==b.length||!timingSafeEqual(a,b)||['sourceId','destinationId','amountCents','currency','expiresAt','nonce'].some(key=>auth[key as keyof Authorization]!==op[key as keyof Stored]))throw new LabError('INVALID_AUTHORIZATION',403);
   if(['ACCREDITED','REJECTED','EXPIRED','CANCELLED'].includes(op.state))return publicOperation(op);
   if(op.state!=='AWAITING_CONFIRMATION')throw new LabError('INVALID_TRANSITION',409);
   if(this.now()>=op.expiresAt){this.transition(op,'EXPIRED','AUTHORIZATION_EXPIRED');return publicOperation(op);}
   this.transition(op,'SUBMITTED');const source=this.account(op.sourceId),destination=this.account(op.destinationId);
   const providers=this.db.prepare('SELECT available FROM providers WHERE bank IN (?,?)').all(source.bank,destination.bank) as unknown as {available:number}[];
   const rejection=this.provider.rejectReason(providers,options.rejectBank===true);
   if(rejection){this.transition(op,'REJECTED',rejection);return publicOperation(op);}
   if(source.balanceCents<op.amountCents){this.transition(op,'REJECTED','INSUFFICIENT_FUNDS');return publicOperation(op);}
   if(destination.balanceCents+op.amountCents>1e12){this.transition(op,'REJECTED','DESTINATION_LIMIT');return publicOperation(op);}
   const debit=this.db.prepare('UPDATE accounts SET balanceCents=balanceCents-? WHERE id=? AND balanceCents>=?').run(op.amountCents,source.id,op.amountCents);if(debit.changes!==1)throw new LabError('CONCURRENT_BALANCE_CONFLICT',409);
   this.db.prepare('UPDATE accounts SET balanceCents=balanceCents+? WHERE id=?').run(op.amountCents,destination.id);
   for(const [id,delta,balance] of [[source.id,-op.amountCents,source.balanceCents-op.amountCents],[destination.id,op.amountCents,destination.balanceCents+op.amountCents]] as const)this.db.prepare('INSERT INTO movements VALUES(?,?,?,?,?,?)').run(randomUUID(),id,op.operationId,delta,balance,this.now());
   this.transition(op,'ACCREDITED');op.completedAt=this.now();op.receipt='COMPROBANTE FICTICIO '+op.operationId;this.db.prepare('UPDATE operations SET completedAt=?,receipt=? WHERE operationId=?').run(op.completedAt,op.receipt,op.operationId);return publicOperation(op);
  });
 }
 close(){this.db.close();}
}
