# PASA Lab · PASA-01

**POSIBLE NO DEMOSTRADO** — Experimento Android nativo para evaluar USSD en un Samsung Galaxy S21 FE. Sin bancos ni transferencias. La compatibilidad física sigue pendiente.

- [Descargar APK compilado en GitHub](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40063598577/artifacts/12548447755)
- [Instalación desde el celular y prueba](docs/PASA-01.md)
- [Factibilidad y fuentes](docs/FACTIBILIDAD.md)
- [Arquitectura y privacidad](docs/ARQUITECTURA.md)
- [Resultados de pruebas ejecutadas](docs/PRUEBAS.md)
- [Simulador HTTP separado](gateway-simulator/README.md)

**POSIBLE NO DEMOSTRADO** — Build reproducible: JDK 17+, SDK 35, `cd android` y `./gradlew testDebugUnitTest lintDebug assembleDebug`. GitHub Actions configura estas herramientas y publica el APK debug como artifact cuando se ejecuta en un repositorio.

**DEMOSTRADO POR PRUEBA** — [GitHub Actions aprobado](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40063598577) para el commit `4919078`: tests, lint, compilación y artifacts publicados. La prueba física sigue pendiente.
