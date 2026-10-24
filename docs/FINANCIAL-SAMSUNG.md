# Primera prueba financiera ficticia desde Samsung

**POSIBLE NO DEMOSTRADO** — Esta guía habilita una simulación local independiente por entorno. El diagnóstico USSD real conserva su pantalla y permisos; nunca ingreses mensajes de transferencia de laboratorio como códigos reales.

1. Descargá [PASA-Financial-Lab-apk](https://github.com/benzrenzo76-dotcom/PASA-01/actions/runs/40065674630/artifacts/12549173012) de la ejecución aprobada, extraé el ZIP con Mis archivos y abrí app-debug.apk. GitHub puede requerir iniciar sesión. Si Android lo pide, habilitá temporalmente instalar apps desconocidas para Mis archivos y deshabilitalo al terminar. Si hay conflicto de firma con el APK anterior, exportá los diagnósticos que quieras conservar y desinstalá la versión anterior antes de instalar. No se afirma haber probado ese procedimiento en tu S21 FE.
2. Elegí simulación local. Las cuentas iniciales ficticias son Joaquín/Banco Alfa ($100.000 ARS) y Kiosco Pepito/Banco Beta ($20.000 ARS).
3. Consultá `kiosco.pepito`, ingresá $5.000, prepará y revisá destinatario/importe antes de confirmar. El resultado esperado tras acreditar es $95.000/$25.000. La ejecución real y sus tests determinan si eso ocurrió.
4. Observá los eventos: red virtual, gateway, procesamiento, confirmación. No se usa una operadora. Elegí pérdida de confirmación para comprobar que el saldo se modifica una sola vez y que consultar estado resuelve el resultado pendiente.
5. Abrí el panel web publicado desde Chrome para repetir el escenario, inspeccionar movimientos y exportar resultados. Ese navegador tiene su propio motor y almacenamiento: sus saldos no reflejan los del APK ni los del API loopback.
6. Reiniciá el laboratorio para restaurar cuentas ficticias. El reinicio elimina su historial local; no modifica cuentas reales. Las baterías de carga sólo ejecutan simulaciones.

**NO VERIFICADO** — Comportamiento físico de la ampliación financiera en Samsung, políticas de instalación, persistencia frente a borrado de datos y suspensión del dispositivo. Los resultados de compilación, pruebas y despliegue se registran aparte; no se infieren de esta guía.

**DEMOSTRADO POR PRUEBA** — Panel publicado: https://pasa-control-center-lab.silver-smile-5741.chatgpt.site. Acceso privado del fundador mediante Sites. El despliegue terminó con estado succeeded el2026-10-24. Su primera apertura requiere internet para descargar archivos; no simula un acceso remoto sin internet. La app Android permite su laboratorio local sin internet.
