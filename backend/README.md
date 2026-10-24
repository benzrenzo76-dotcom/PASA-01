# PASA Banking Engine — SIMULACIÓN

**POSIBLE NO DEMOSTRADO** — Backend modular de laboratorio ficticio, sin bancos externos ni dinero real. Node.js >=22.13, TypeScript y SQLite (`node:sqlite`). El servidor sólo escucha en `127.0.0.1`; el despliegue remoto compartido es P1 y no está realizado. Android y el navegador pueden usar sus motores locales independientes sin este servidor.

## Ejecutar

**DEMOSTRADO POR PRUEBA** — Se ejecutaron `npm install`, `npm run build` y `npm test` en Node 24.19.0 el 2026-10-24. Resultado: **15 tests aprobados**, 0 fallos. Instalación reproducible: `npm ci` desde `backend/`. Para levantar la API: `npm run build` y `npm start`; usa SQLite persistido en `pasa-lab.sqlite`. `.env.example` documenta `PORT`, `PASA_DB_PATH`; este ejemplo no carga automáticamente variables: configurarlas en el entorno antes de ejecutar. No introducir claves bancarias.

**POSIBLE NO DEMOSTRADO** — CORS sólo permite orígenes loopback o el valor exacto de `PASA_ALLOWED_ORIGIN`, si se configura. Esto es una barrera de navegador y no es autenticación. Cualquier proceso con acceso local controla el laboratorio. No exponer esta API públicamente sin autenticación, aislamiento y límites. Autenticación bancaria avanzada queda fuera de P0.

## API v0.1 de simulación

**POSIBLE NO DEMOSTRADO** — Todos los importes están en centavos enteros ARS. Saldo inicial Banco Alfa / Joaquín (`alfa-joaquin`, `joaquin.prueba`): 10000000; Banco Beta / Kiosco Pepito (`beta-kiosco`, `kiosco.pepito`): 2000000. No son entidades ni cuentas reales.

- `GET /accounts`: cuentas y disponibilidad de proveedores ficticios.
- `GET /aliases/kiosco.pepito`: resolución central de alias.
- `POST /prepare`: `{ "sourceId": "alfa-joaquin", "alias": "kiosco.pepito", "amountCents": 500000, "idempotencyKey": "identificador-unico-del-intento" }`. Devuelve operación, origen, destino y autorización **de laboratorio**. El token no es un saldo ni una aprobación genérica; queda ligado a esa operación y sus campos.
- `POST /execute`: enviar `operationId`, `sourceId`, `destinationId`, `amountCents`, `currency`, `expiresAt`, `nonce` de la operación más `authorization`. `rejectBank: true` es una extensión opcional de inyección de fallas exclusivamente simuladas. La validación financiera se ejecuta igualmente antes del rechazo artificial.
- `GET /operations/:id`: estado, comprobante ficticio y eventos, sin token.
- `GET /operations`: historial sin tokens; `GET /movements?accountId=alfa-joaquin`: movimientos/saldo histórico.
- `POST /reset`: reinicia el laboratorio a los saldos de apertura; invalida operaciones y autorizaciones anteriores.
- `POST /accounts`: `{bank, holder, alias, balanceCents}` crea una cuenta adicional ficticia y un movimiento de apertura explícito. Sólo Banco Alfa o Banco Beta, alias `[a-z0-9.]` de 3–40 caracteres.
- `POST /providers`: `{bank, available}` modifica disponibilidad ficticia.
- `POST /aliases/:accountId`: `{alias}` cambia un alias sin cambiar destinos ya preparados.
- `GET /health`: `HTTP_SIMULATED`, `simulation: true`.

**POSIBLE NO DEMOSTRADO** — Límites de laboratorio: importe máximo por operación 10000000000 centavos; saldo máximo por cuenta 1000000000000 centavos; cuerpo HTTP máximo 16384 caracteres; preparación vence a los 120 segundos. La autorización se genera con `crypto.randomBytes` y se compara con `timingSafeEqual`. Se almacena sólo en la base local, excluida de Git y de diagnósticos; nunca enviarla en reportes. No es una firma para USSD real ni un mecanismo bancario certificado.

## Atomicidad y estados

**DEMOSTRADO POR PRUEBA** — SQLite realiza débito, crédito, movimientos, comprobante y transición a ACCREDITED dentro de una transacción `BEGIN IMMEDIATE`. Un test con un trigger que falla al acreditar verificó rollback del débito y de la transición. Dos workers de Node contra la misma base WAL intentaron transferir $60000 ARS cada uno desde $100000: sólo uno se acreditó y los saldos sumaron exactamente $120000. Se comprobaron rechazo por fondos insuficientes, proveedor Beta caído y token/campos alterados.

**DEMOSTRADO POR PRUEBA** — Se verificaron también expiración, idempotencia, alias modificado después de preparar, saldo falso del cliente, rechazo artificial y reintento tras descartar una respuesta procesada. El test HTTP atraviesa un servidor local real y la lógica SQLite. La prueba de pérdida de respuesta del motor descarta el resultado de `execute`; las fallas de transporte completas pertenecen al gateway virtual y tienen pruebas separadas.

**POSIBLE NO DEMOSTRADO** — La máquina implementa CREATED → PREPARED → AWAITING_CONFIRMATION → SUBMITTED → ACCREDITED/REJECTED y expiración desde AWAITING_CONFIRMATION. Los estados PENDING y CANCELLED del contrato están reservados para reconciliación/cancelación futura; no existe un endpoint que permita transiciones arbitrarias. Si se pierde una respuesta después de ejecutar, el transporte muestra PENDING, mientras el motor puede haber confirmado ACCREDITED. Consultar el ID antes de reintentar; repetir la misma operación autorizada devuelve su estado terminal y nunca duplica el débito.

**NO VERIFICADO** — No hubo integración bancaria real, validación física de este motor desde el Samsung ni despliegue público. `MockFinancialProvider` aplica disponibilidad/rechazo de laboratorio. Un proveedor real necesitará otra implementación de liquidación y conciliación asíncrona: no se puede asumir que dos bancos reales compartan esta transacción SQLite.
