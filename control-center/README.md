# PASA Control Center

**DEMOSTRADO POR PRUEBA** — Motor de laboratorio IndexedDB transaccional, probado con `fake-indexeddb` en Node. `npm ci && npm test && npm run build` genera `dist/`. La validación visual en Chrome se registra por QA, por separado.

**POSIBLE NO DEMOSTRADO** — Publicar `dist/` como sitio estático HTTPS. Abrir index.html mediante file:// puede impedir módulos/IndexedDB; no es el procedimiento soportado. Sin dependencias de ejecución externas, CDN, modelos, operadoras o bancos. La simulación persiste en el almacenamiento de ese origen del navegador; no comparte datos con Android ni backend remoto.

**POSIBLE NO DEMOSTRADO** — Flujo: consultar alias → preparar $5.000 → verificar nombre/cuenta/importe → confirmar → ver comprobante ficticio. El perfil observado agrega 300 ms ilustrativos por recorrido; las referencias 190, 436, 1350 y 1915 ms son reportes del fundador sobre diagnóstico USSD, no muestras estadísticas validadas ni mediciones bancarias. Los valores del panel distinguen duración real total del software, demora artificial y ejecución del motor.

**POSIBLE NO DEMOSTRADO** — Pérdida de confirmación procesa atómicamente el débito/crédito y muestra PENDING en el cliente. Consultar estado por ID reconcilia ese intento; no prepara ni ejecuta otro pago. Autorizar un duplicado exacto devuelve el resultado ya registrado. Los secretos opacos quedan sólo en IndexedDB y memoria; JSON/CSV exportan listas cerradas sin autorización, nonce ni clave idempotente. El laboratorio no es una frontera de seguridad contra el dueño del navegador ni ofrece seguridad bancaria certificada.

**POSIBLE NO DEMOSTRADO** — El módulo de carga ejecuta como máximo 1000 transferencias de $1 ficticio, con hasta cuatro solicitudes simultáneas y cancelación cooperativa. Sólo usa el motor del navegador; nunca envía códigos telefónicos ni solicitudes masivas externas. Las métricas muestran percentiles empíricos del simulador y una advertencia de muestra insuficiente para P99 con menos de 100 resultados. Las últimas 20 ejecuciones se grafican separando tiempo real total y demora artificial. Se retienen hasta 1500 recorridos y 20000 eventos para limitar almacenamiento; el libro contable y operaciones se conservan hasta reiniciar.

**DEPENDE DE TERCEROS** — API remota compartida y USSD empresarial se mantienen fuera de este modo. La representación USSD → API son llamadas locales; no es una solicitud HTTP ni una transferencia financiera real. El diagnóstico telefónico legítimo permanece en la app Android y no se invoca desde este panel.
