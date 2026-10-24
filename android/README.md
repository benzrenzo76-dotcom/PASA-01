# PASA Lab Android · Financial Laboratory

**POSIBLE NO DEMOSTRADO** — App Kotlin/Compose ampliada sobre PASA-01; la instalación y navegación en el Samsung físico de esta versión siguen pendientes. El diagnóstico real conserva su código y transportes originales. La pantalla inicial nueva es el laboratorio financiero local.

## Recorrido desde el Samsung

**POSIBLE NO DEMOSTRADO** — Procedimiento manual para validar la APK:

1. Instalá la APK debug de la ejecución aprobada de GitHub Actions. Una firma debug distinta de la APK anterior puede exigir desinstalar la anterior. Exportá antes los resultados que quieras conservar.
2. Abrí PASA Lab sin internet. El banner permanente debe decir **SIMULACIÓN LOCAL · OFFLINE**. Los saldos iniciales son Joaquín/Banco Alfa $100.000 ARS y Kiosco Pepito/Banco Beta $20.000 ARS.
3. Entrá en **Transferir**, consultá `kiosco.pepito`, ingresá `5000` (pesos sin separador de miles) y tocá **Preparar por USSD virtual**.
4. Revisá titular, cuenta, banco e importe. Confirmá la **SIMULACIÓN**. Los saldos del motor SQLite deben quedar en $95.000 y $25.000. El comprobante y todos los movimientos son ficticios.
5. **Monitor** muestra eventos emitidos por el simulador durante su ejecución; tocá un evento para abrir el detalle. Los tiempos de espera configurados se separan de la medición del software.
6. En **Red**, elegí **Pérdida de confirmación**. Una transferencia se procesa, pero el cliente queda PENDING y conserva el último saldo conocido. **Consultar estado por ID** recupera el resultado del motor. **Reintentar misma operación** reutiliza la misma autorización vinculada y debe devolver el mismo comprobante sin un segundo débito.
7. Las otras opciones de Red permiten perfiles ilustrativos, semilla, probabilidades y demoras personalizadas. Todos los mensajes son virtuales y permanecen dentro del teléfono. El perfil PASA-01 Observado usa un rango uniforme artificial 190–1915 ms; los datos reportados por el fundador no son una distribución estadística de transferencias.
8. **Carga** ejecuta 10/50/100/1000 transferencias ficticias de $1 directamente contra el motor local, sin esperas artificiales ni red externa. Informa métricas del software SQLite; los percentiles describen esa muestra y no la red USSD.
9. En **Ajustes** podés crear cuentas ficticias con saldo cero o reiniciar toda la base local previa confirmación. El panel web y los bancos reales no se modifican.
10. **Exportar informe JSON ficticio** usa el selector oficial de archivos y excluye tokens, nonces y datos telefónicos.

## Separación de modos

**POSIBLE NO DEMOSTRADO** — Android local utiliza `SqliteLabStore`; el panel web y el backend de escritorio son laboratorios independientes. La app no simula sincronización y no tiene permiso INTERNET. El modo remoto HTTPS es P1 y no está habilitado. La cuenta local y su autorización son controles de integridad del laboratorio, no autenticación bancaria certificada.

**POSIBLE NO DEMOSTRADO** — **Ajustes → Abrir diagnóstico USSD REAL** conserva permisos oficiales, selección de SIM, código manual y confirmación antes del envío. Ningún mensaje del laboratorio financiero llega a `TelephonyManager`. No se ejecutan cargas en telefonía real.

## Integridad y verificación

**POSIBLE NO DEMOSTRADO** — `FinancialEngine` valida autorización opaca generada con `SecureRandom`, ID, origen, destino, importe, moneda, vencimiento y nonce. Resuelve el alias al preparar y conserva el destino por ID; no reevalúa el alias al ejecutar. El motor ignora el saldo presentado por la interfaz. Importe en centavos `Long`, máximo 10000000000 centavos por operación. SQLite actualiza saldos, movimientos y estado dentro de una única transacción; una excepción revierte el snapshot completo. Se recupera la última operación persistida al volver a abrir la app.

**DEMOSTRADO POR PRUEBA** — Se ejecutaron 16 tests JVM locales (11 financieros y 5 del diagnóstico) sin errores. Los financieros usan el código de dominio de producción con un store de memoria que implementa aislamiento y rollback. Cubren fondos insuficientes, dos gastos simultáneos, doble envío concurrente, respuesta descartada y consulta, alteración de todos los campos de autorización, replay de token entre operaciones, vencimiento, alias cambiado, saldo de UI falso, Banco Beta caído, idempotencia, cancelación y parseo de importes.

**NO VERIFICADO** — Los tests JVM no ejecutan SQLite de Android, Compose ni telefonía; no sustituyen una prueba en dispositivo o instrumentación. No se afirma que esta APK financiera se haya instalado en un Samsung. La compilación y lint se ejecutan separadamente mediante `./gradlew testDebugUnitTest lintDebug assembleDebug` y GitHub Actions.

**POSIBLE NO DEMOSTRADO** — Límites intencionales: últimos 100 eventos en memoria, histórico de movimientos SQLite persistido, hasta 1000 operaciones por carga. Las cargas directas no ejecutan el simulador de red ni sus fallas; prueban el motor. Los ajustes de red no persisten al cerrar el proceso. La exportación es JSON; el CSV está disponible en el centro de control web, no en Android.
