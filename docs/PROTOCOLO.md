# Contrato v0.1 — laboratorio financiero

**POSIBLE NO DEMOSTRADO** — Contrato congelado antes de la implementación financiera simulada. `contracts/v0.1.json` define importes, estados, transiciones y API. La nueva orden del fundador habilita exclusivamente simulación, sin abrir la compuerta financiera real. No se afirma que la autorización quepa en USSD comercial.

Cada preparación resuelve alias a un ID inmutable y emite una autorización de laboratorio aleatoria ligada a operación, origen, destino, importe entero, ARS, vencimiento y nonce. No es autenticación bancaria: el usuario controla su laboratorio. EXECUTE compara todos los campos y consume el token en la misma transacción que débito/crédito. Repetir la misma operación consulta el resultado, nunca vuelve a debitar. Un cambio de alias no cambia el destino ya preparado. El cliente no puede autorizar usando su saldo local.

**POSIBLE NO DEMOSTRADO** — CREATED → PREPARED → AWAITING_CONFIRMATION → SUBMITTED → ACCREDITED/REJECTED/PENDING. CREATED puede rechazarse; PREPARED/AWAITING_CONFIRMATION pueden expirar o cancelarse. PENDING se resuelve consultando operación. Estados terminales no cambian. Para el proveedor ficticio local, débito, crédito, movimientos y ACCREDITED se confirman en una transacción. Un timeout de transporte no cambia ese resultado: el cliente muestra PENDING hasta consultar por ID.

Los mensajes compactos virtuales son sólo representaciones de laboratorio. Nunca se entregan a TelephonyManager. Las autorizaciones y mensajes completos no se exportan a reportes.

**POSIBLE NO DEMOSTRADO** — Extensión administrativa del laboratorio propuesta por el responsable de contrato en el PR financiero: `contracts/lab-admin.v0.1.json`. `rejectBank` es opcional y sólo permite inyectar rechazo, nunca conceder una aprobación. Los endpoints administrativos crean datos ficticios, cambian alias y disponibilidad y no se exponen públicamente. No alteran los campos financieros vinculados a la autorización. El esquema de EXECUTE explicita esa extensión opcional para no ocultar un campo implementado fuera del contrato.
