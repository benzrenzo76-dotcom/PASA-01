# Verificación de PASA Financial Laboratory

Fecha: 2026-10-24. Este registro se limita al laboratorio ficticio y distingue ejecución local, CI y dispositivo físico. El diagnóstico anterior conserva sus evidencias en PRUEBAS.md; esos resultados no demuestran el nuevo sistema financiero.

## Compuerta v0.1

**CONFIRMADO EN DOCUMENTACIÓN** — El contrato local `contracts/v0.1.json` congela estados, moneda ARS, centavos enteros y vínculo de autorización antes de la implementación. No prueba que una autorización quepa en un canal comercial USSD.

## Comprobaciones automatizadas en CI

**POSIBLE NO DEMOSTRADO** — El workflow `.github/workflows/pasa01.yml` ejecuta trabajos independientes para backend, red virtual, panel web y Android. Los componentes Node usan Node 24, lockfiles y `npm ci`; cada uno debe proporcionar `npm run build` y `npm test`. El APK usa JDK 17, SDK 35 y los tests/lint de Gradle. Las fallas de un componente no ocultan las de otro.

**POSIBLE NO DEMOSTRADO** — Se publicarán los directorios `dist/` de backend, red y panel como artifacts separados; el APK se publicará como `PASA-Financial-Lab-apk`. El workflow también guarda salidas de tests y reportes Android. Los artifacts sólo existen después de una ejecución real que los publique; un YAML escrito no equivale a CI aprobado.

**DEMOSTRADO POR PRUEBA** — [GitHub Actions financiero aprobado](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40065674630) el2026-10-24, commit de código b3cab92893aadc3adb8d75d6022ef89d82f3fac1. Los cuatro jobs terminaron success: backend15 tests, gateway9, panel13, Android16 JVM y3 Python; total56. Gradle terminó BUILD SUCCESSFUL en2m11s. Se publicaron8artifacts, incluidos APK, dist de cada componente y reportes. El primer intento financiero falló por omitir el index.html del panel en la subida; se incluyó el HTML ya probado y el nuevo workflow completo pasó. La publicación Sites no estaba afectada por esa omisión.

**DEMOSTRADO POR PRUEBA** — [APK generado](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40065674630/artifacts/12549173012) y [reportes Android](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40065674630/artifacts/12549397175) publicados y no expirados al consultar el2026-10-24. La actualización posterior de estos enlaces sólo modifica documentación; app, motores y workflow no cambian respecto al código verificado.

## Resultados locales

**DEMOSTRADO POR PRUEBA** — Backend: se ejecutó `npm ci`, `npm run build` y `npm test` el 2026-10-24 con Node v24.19.0. Resultado: **15 pruebas aprobadas, 0 fallas**, duración del runner Node 374,60435 ms (una ejecución local; no es una métrica de USSD ni un benchmark representativo).

Las pruebas ejecutadas incluyen transferencia ficticia de $5.000 con saldos finales $95.000/$25.000; rechazo por fondos insuficientes; duplicación y replay con único débito; pérdida de confirmación y consulta por ID; alias cambiado sin redirección; saldo del cliente ignorado; proveedor receptor indisponible sin débito; alteración de cada campo de autorización y caducidad; valores inválidos; dos procesos de trabajo concurrentes contra el mismo SQLite; rollback ante falla SQL después del débito; API HTTP real en loopback; reinicio del laboratorio y rechazo bancario inyectado.

**DEMOSTRADO POR PRUEBA** — Red virtual: se ejecutó `npm ci`, `npm run build` y `npm test` el 2026-10-24 con Node v24.19.0, después de compilar el backend. Resultado: **9 pruebas aprobadas, 0 fallas**, duración del runner Node 301,069919 ms en la ejecución final. Incluye perfil artificial reproducible, eventos con marcas temporales, pérdida/falla antes del motor sin ejecución bancaria, duplicación y confirmación perdida, desactivación de fallas, validación de mensajes compactos no discables y retención por respuesta fuera de orden. Una prueba concurrente usa timers reales y comprueba que una respuesta retenida 100 ms llegue después de una segunda respuesta rápida. Dos pruebas cruzan HTTP real contra SQLite: confirmación perdida tras commit seguida de consulta y replay sin segundo débito, y rechazo bancario sin creación/pérdida de dinero.

**DEMOSTRADO POR PRUEBA** — Panel web: se ejecutó `npm ci`, `npm run build` y `npm test` el 2026-10-24 con Node v24.19.0. El build estático produjo `control-center/dist/`. Resultado: **12 pruebas aprobadas, 0 fallas** en esa ejecución; después se agregó cancelación y el responsable del panel ejecutó **13/13 aprobadas**, duración del runner Node 116,077113 ms. El almacenamiento de pruebas usa fake-indexeddb; esto ejercita las transacciones y conexiones independientes, pero no equivale a probar la UI en Chrome Samsung.

Las pruebas del panel cubren el ejemplo $5.000 con ledger y conservación; fondos insuficientes; dos gastos simultáneos desde conexiones distintas; duplicación y colisión de IDs; respuesta perdida y consulta/reintento; cambio de alias; saldo cliente falso; Banco Beta caído; alteración de todos los campos de autorización; caducidad; idempotencia; validación entera; exportación sin secretos y eventos de preparación sólo tras entregar al motor. Las métricas reales y artificiales se verifican por separado.

**DEMOSTRADO POR PRUEBA** — El resultado local final de Android ampliado se detalla abajo (16 tests y build aprobados). **NO VERIFICADO** — La UI en Chrome del Samsung físico y el nuevo APK en ese teléfono siguen pendientes.

**DEMOSTRADO POR PRUEBA** — Se volvió a ejecutar `python3 -m unittest discover -s gateway-simulator -v`: **3 pruebas aprobadas**, sin fallas. Cubre el simulador HTTP original en loopback y la política de permisos del manifiesto Android observada en esta ejecución. No prueba comportamiento de telefonía real.

## Límites de verificación

**NO VERIFICADO** — No se ejecutó el nuevo APK financiero en el Samsung físico ni se probó el panel desde Chrome Android. Las simulaciones locales de Android, navegador y backend no comparten datos entre sí. Sólo un backend remoto configurado y autorizado puede sincronizar dispositivos; su despliegue persistente sigue siendo P1.

**NO VERIFICADO independientemente** — Las mediciones 190, ~300, 436, 1350 y 1915 ms fueron reportadas por el fundador para diagnóstico USSD. No se dispone aquí de muestras crudas ni de un análisis estadístico reproducible; no se calculan percentiles reales con esos cinco valores. Los percentiles del simulador deben identificarse como métricas de ejecuciones artificiales.

**DEPENDE DE TERCEROS** — Instalar el APK y probar el diagnóstico USSD real requiere el teléfono del fundador y un código legítimo autorizado. Las baterías de carga sólo se ejecutan contra simuladores; no se generan solicitudes masivas a una operadora.

## Verificación Chromium móvil en el entorno de desarrollo

**DEMOSTRADO POR PRUEBA** — El 2026-10-24 se ejecutó Chromium headless con Playwright Core y viewport393×852 sobre el panel servido por HTTP loopback. Pasó: consulta de alias, preparación y confirmación de $5.000, saldos95.000/25.000, persistencia tras recargar, pérdida de confirmación después de acreditar, consulta posterior que recupera ACCREDITED sin segundo débito y ausencia de desbordamiento horizontal. No hubo errores JavaScript. Evidencia: artifacts/checks/browser-financial.json y control-center-mobile.png. El primer intento del script de QA esperó la etiqueta inglesa PENDING cuando la UI muestra PENDIENTE; se corrigió el selector y la prueba completa pasó. No fue una falla de acreditación.

**NO VERIFICADO** — Esta prueba Chromium no equivale a ejecutar Chrome sobre el Samsung físico. El almacenamiento del navegador puede perderse al borrar datos del sitio.

**POSIBLE NO DEMOSTRADO** — Para reproducir la QA de navegador fuera de CI: servir control-center/dist por HTTP local, instalar Playwright Core como herramienta de desarrollo y ejecutar `scripts/browser-financial-check.mjs` con PASA_PLAYWRIGHT_MODULE apuntando al módulo instalado, PASA_CHROMIUM al binario Chromium y PASA_PANEL_URL a la URL local. El workflow de GitHub no ejecuta esta QA visual; ejecuta tests del motor y builds.

## Android financiero compilado localmente

**DEMOSTRADO POR PRUEBA** — `testDebugUnitTest lintDebug assembleDebug` sobre las fuentes finales terminó BUILD SUCCESSFUL en47s. Pasaron16 tests JVM:11 financieros,3 de ciclo USSD y2 de diagnóstico. El APK0.2-financial-lab (versionCode2) se generó y apksigner verificó firma v2. No declara INTERNET. Evidencia: artifacts/checks/financial-android-build.txt y TEST-ar.pasa.lab.FinancialEngineTest.xml. Las11 pruebas financieras usan almacenamiento transaccional de memoria con rollback, no son pruebas instrumentadas de SQLite Android.

**DEMOSTRADO POR PRUEBA** — Total local de suites automatizadas:15backend+9gateway+13panel+16JVM+3Python=56 aprobadas. La QA de Chromium y las10 transferencias HTTP de métricas son evidencia adicional, no pruebas físicas del Samsung.

**DEMOSTRADO POR PRUEBA** — Sites publicó el panel estático privado con estado succeeded: https://pasa-control-center-lab.silver-smile-5741.chatgpt.site. El código estático publicado coincide byte a byte con los assets verificados; no despliega el API SQLite.
