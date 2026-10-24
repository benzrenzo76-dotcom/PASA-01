import {parentPort,workerData} from 'node:worker_threads';
import {BankingEngine} from '../dist/engine.js';
const engine=new BankingEngine(workerData.path);
try{parentPort.postMessage(engine.execute(workerData.auth).state);}finally{engine.close();}
