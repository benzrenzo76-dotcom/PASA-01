/** Policy for a fictitious atomic laboratory settlement, never a real bank adapter. */
export interface FinancialProvider {
 readonly simulation: true;
 rejectReason(availability:readonly {available:number}[], forcedLaboratoryRejection:boolean):string|null;
}
export class MockFinancialProvider implements FinancialProvider {
 readonly simulation=true as const;
 rejectReason(availability:readonly {available:number}[], forcedLaboratoryRejection:boolean){
  if(forcedLaboratoryRejection)return 'SIMULATED_BANK_REJECTION';
  if(availability.some(provider=>!provider.available))return 'PROVIDER_UNAVAILABLE';
  return null;
 }
}
