# PASA Financial Laboratory

**DEMOSTRADO POR PRUEBA** — Laboratorio ficticio con motores transaccionales, red virtual, panel móvil y app Android; conserva el diagnóstico USSD anterior. No se usa dinero real ni se integra una operadora o banco comercial.

- [Abrir PASA Control Center](https://pasa-control-center-lab.silver-smile-5741.chatgpt.site) — publicado con Sites, privado para el fundador; puede requerir iniciar sesión. Motor IndexedDB de ese navegador, independiente del APK.
- [Probar desde Samsung](docs/FINANCIAL-SAMSUNG.md).
- [Resultados de tests y CI](docs/FINANCIAL-PRUEBAS.md).
- [Métricas medidas y artificiales](docs/METRICAS.md).
- [Arquitectura](docs/ARQUITECTURA.md), [seguridad experimental](docs/SEGURIDAD.md), [protocolo v0.1](docs/PROTOCOLO.md), [restricciones USSD](docs/USSD-RESTRICCIONES.md).
- [Backend SQLite y API loopback](backend/README.md), [VirtualUssdGateway y HTTP real de laboratorio](gateway-simulator/README.md), [panel estático](control-center/README.md), [Android](android/README.md).
- [Diagnóstico PASA-01 original](docs/PASA-01.md) y [pruebas originales](docs/PRUEBAS.md).

## Ejecutar con herramientas de desarrollo

**DEMOSTRADO POR PRUEBA** — Node24 y JDK17/SDK35 se usaron localmente. Instalar dependencias con `npm ci` en backend, gateway-simulator y control-center; ejecutar `npm run build` y `npm test` en ese orden (gateway requiere backend compilado para sus pruebas HTTP). `node scripts/financial-evidence.mjs` ejecuta10 transferencias HTTP loopback con SQLite y emite métricas sin tokens. Android: `cd android` y `./gradlew testDebugUnitTest lintDebug assembleDebug`. GitHub Actions instala herramientas y publica APK, componentes y reportes.

**POSIBLE NO DEMOSTRADO** — Escenario para el fundador: abrir panel/APK local, alias kiosco.pepito, preparar $5.000, confirmar, observar $95.000/$25.000; activar pérdida de confirmación, consultar ID y comprobar que no se duplicó. Las pruebas automatizadas verifican esos comportamientos; la ejecución en Samsung físico sigue pendiente.

**NO VERIFICADO** — API pública sincronizada entre dispositivos, gateway comercial, sandbox bancario, autenticación bancaria y capacidad de una firma financiera en un canal de operadora. Son P1. El despliegue del panel sirve archivos estáticos y no publica el API SQLite. Las simulaciones del navegador, APK y backend son independientes.
