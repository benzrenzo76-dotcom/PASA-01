# Pruebas PASA-01

Fecha: **2026-10-24**. Este registro separa verificación local, CI y teléfono físico.

## Ejecutado localmente

**DEMOSTRADO POR PRUEBA** — `python3 -m unittest discover -s gateway-simulator -v`: **3 pruebas, OK**. Se abrió un servidor HTTP real en loopback, se verificó la marca explícita de simulación y el 404 de una ruta ajena. También se comprobó el conjunto exacto de permisos del manifiesto y la ausencia de servicios declarados. Esto no demuestra cómo actúa Android en ejecución.

**DEMOSTRADO POR PRUEBA** — `./gradlew --no-daemon testDebugUnitTest lintDebug assembleDebug`: **BUILD SUCCESSFUL**, ejecutado con Gradle Wrapper 8.11.1 (SHA-256 de distribución verificado por el wrapper), JDK Temurin 17 y SDK 35. Los 5 tests JVM pasaron: 3 para timeout/bloqueo de doble envío/callbacks duplicados o antiguos y 2 para sintaxis/restricción del informe. El APK debug se generó y se verificó su firma v2 con `apksigner verify --verbose`. `aapt dump badging` confirmó nombre PASA Lab, mínimo API 26 y target API 35. `aapt dump permissions` confirmó ausencia de INTERNET y permisos privilegiados; AndroidX agrega el permiso interno `ar.pasa.lab.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.

**DEMOSTRADO POR PRUEBA** — Se verificó el ícono propio dentro del APK final. Se repitió lint sobre las fuentes finales para evitar conservar un reporte de recursos anterior. Resultado final de lint: **0 errors, 5 warnings** (4 advertencias por versiones más nuevas de dependencias y 1 por ausencia de fullBackupContent para Android anterior a 12; allowBackup=false y los datos del diagnóstico sólo viven en memoria). Los resultados descargables se guardan en `artifacts/checks/`; no incluyen claves de firma.

**DEMOSTRADO POR PRUEBA** — Intentos iniciales fallaron por configuración del entorno: Gradle sin directorio escribible, caché Android en HOME de sólo lectura y Java inicial sin `javac`. Se descargaron SDK/Gradle/JDK a `/tmp` y se configuraron directorios temporales para continuar. No fueron resultados del S21 FE.

## CI en GitHub

**DEMOSTRADO POR PRUEBA** — El 2026-10-24 se verificó acceso de lectura y escritura a https://github.com/benzrenzo76-dotcom/PASA-01 y se abrió el PR #1 con el proyecto existente. La primera ejecución de CI falló antes de compilar: setup-android intentó instalar el paquete obsoleto `tools`, inexistente en el repositorio SDK. Ejecución: https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40063512095. Se corrigió la configuración para instalar sólo `platform-tools`; SDK 35 y Build Tools se instalan en el paso siguiente.

**DEMOSTRADO POR PRUEBA** — La configuración corregida pasó en GitHub Actions el 2026-10-24: https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40063598577. Commit de código probado: `4919078512ae4429736becb80546ffec816db503`. Job `android`: success; `testDebugUnitTest lintDebug assembleDebug`: BUILD SUCCESSFUL en 2m 35s. El paso Python pasó sus 3 pruebas en el runner. El código Android contiene los mismos 5 tests JVM aprobados localmente. Esto demuestra compilación y checks en CI, no funcionamiento físico de USSD.

**DEMOSTRADO POR PRUEBA** — Artifacts publicados y no expirados al consultar el 2026-10-24:

- [PASA-01-debug-apk](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40063598577/artifacts/12548447755), ZIP de 8327839 bytes; digest del archivo de artifact informado por GitHub: `sha256:4d46cd67d79c7ebd7b8a6628fde73d68c34907bedd576e97ac0e19ccf2cdd3d2` (no es el hash del APK extraído).
- [PASA-01-check-reports](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40063598577/artifacts/12547959769), reportes de tests/lint.

**CONFIRMADO EN DOCUMENTACIÓN** — Según los metadatos de artifact de esa ejecución, la expiración programada es 2027-01-22. Fuente API consultada el 2026-10-24: https://api.github.com/repos/benzrenzo76-dotcom/PASA-01/actions/runs/40063598577/artifacts. Se puede generar otro APK al cambiar código o workflow. La actualización posterior de estos enlaces sólo modifica documentación; no cambia el código compilado.

## Dispositivo físico

**NO VERIFICADO** — No se instaló ni se ejecutó el APK en Galaxy S21 FE, no se envió ningún código USSD y no se concedieron permisos desde un teléfono. No hubo prueba de respuesta en One UI, doble SIM, modo sin internet o timeout real. El procedimiento está en PASA-01.md.

**DEPENDE DE TERCEROS** — El fundador debe verificar y autorizar el código legítimo con su operadora y ejecutar la prueba física. No se necesita ni se solicita una credencial bancaria.

## Alcance financiero

**NO VERIFICADO** — No se ejecutaron tests financieros, concurrencia de saldos, firmas ni replay financiero: no hay código financiero. Las pruebas de callbacks antiguos sólo cubren el ciclo del diagnóstico local y no sustituyen protección criptográfica contra replay.
