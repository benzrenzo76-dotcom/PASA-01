# Instalación y prueba PASA-01 en Android

**POSIBLE NO DEMOSTRADO** — Procedimiento para el fundador; los resultados físicos siguen pendientes. No hay códigos USSD incluidos. Usá exclusivamente una consulta legítima, verificada con tu operadora y autorizada por vos; evitá altas/bajas, desvíos y cualquier código cuyo costo o efecto no conozcas.

## APK entregado en esta sesión

**POSIBLE NO DEMOSTRADO** — Para la prueba física podés descargar el APK entregado previamente en el chat y abrirlo con Mis archivos. El APK no se almacena en Git: las compilaciones de GitHub se distribuyen por Artifacts. Seguí los pasos de instalación desde el punto 4 de la sección siguiente. El ZIP de fuentes entregado en el chat incluye el proyecto y el workflow; no hace falta Android Studio para instalar el APK.

## Obtener e instalar el APK sin PC

**POSIBLE NO DEMOSTRADO** — Una vez subido este proyecto al repositorio elegido:

1. Abrí GitHub en el navegador del celular, entrá al repositorio → Actions → **PASA-01 APK**.
2. Ejecutá **Run workflow** si no existe una ejecución automática. Esperá que termine en verde.
3. Abrí la ejecución y descargá **PASA-01-debug-apk** en Artifacts (GitHub puede requerir iniciar sesión). Extraé el ZIP con Mis archivos de Samsung.
4. Abrí `app-debug.apk`. Si Android lo solicita, habilitá temporalmente “Instalar apps desconocidas” sólo para Mis archivos o el navegador usado y deshabilitalo tras instalar. Las políticas del dispositivo o Auto Blocker de Samsung pueden impedirlo; no se afirma que la instalación se haya probado.
5. Verificá que el nombre visible sea **PASA Lab**. El APK es debug para diagnóstico, firmado con una clave de desarrollo generada en el entorno de build; no es una versión de producción. Builds de distintos entornos pueden tener firmas distintas y requerir desinstalar el anterior.

**DEPENDE DE TERCEROS** — No se puede publicar el artifact hasta contar con un repositorio GitHub y una ejecución del workflow. El código del workflow por sí solo no demuestra que corrió en GitHub.

## Ejecutar en el Galaxy S21 FE

**POSIBLE NO DEMOSTRADO** — Pasos de prueba manual:

1. Anotá por separado la versión de Android y One UI y la operadora (sin números de línea ni datos de cuentas). Asegurate de tener una SIM activa y cobertura. No actives modo avión para probar “sin internet”: también puede quitar la señal móvil.
2. Desactivá Wi-Fi y datos móviles desde Ajustes. Mantené la telefonía activa. La app no pide permiso INTERNET y no usa HTTP.
3. Abrí PASA Lab, tocá **Solicitar permisos oficiales** y concedé teléfono. READ_PHONE_STATE se usa para listar las SIM y consultar servicio; no se leen números ni identificadores de la SIM.
4. Tocá **Actualizar SIM**. Si hay varias, elegí la ranura correcta según Ajustes → Administrador de SIM. La app no muestra números ni nombres personales de SIM. Con dos SIM exige selección; con una la elige automáticamente.
5. Ingresá el código autorizado de consulta. Marcá la declaración de verificación y revisá código/SIM en el diálogo **Confirmá el envío real**. Sólo **Autorizo y envío** inicia `sendUssdRequest`.
6. Mantené la app abierta. Registrá si aparece la respuesta dentro de PASA, si Android abre alguna UI externa y el estado/duración/error. No publiques el texto de respuesta si contiene información personal.
7. Tocá **Exportar diagnóstico sin datos sensibles** y guardá el JSON con el selector oficial de archivos. Podés elegir almacenamiento local sin internet. El informe excluye código y respuesta completos en lugar de intentar anonimizarlos parcialmente.
8. Si hay timeout, el resultado es desconocido: esperá el callback tardío y no reenvíes. La API no ofrece cancelación en esta app. Si el proceso murió o la sesión queda trabada, verificá con la operadora que terminó antes de iniciar otra.

## Interpretar los resultados

| Estado | Interpretación |
|---|---|
| RESPONSE_RECEIVED / LATE_RESPONSE | **POSIBLE NO DEMOSTRADO** hasta ejecutar: el framework devolvió texto. Leerlo; no equivale a una operación financiera exitosa. |
| CALLBACK_FAILURE / LATE_FAILURE | Fallo reportado por Android/red; revisar error numérico. No intentar corregirlo con automatización de pantallas. |
| PENDING_TIMEOUT | No hubo callback dentro de 60 s; resultado desconocido y nuevos envíos bloqueados. |
| PERMISSION_ERROR / UNSUPPORTED / LOCAL_ERROR | No se pudo iniciar normalmente; revisar permisos, features y SIM. |

**POSIBLE NO DEMOSTRADO** — Pruebas adicionales independientes, sólo con un código legítimo autorizado: denegar permisos (sin envío), no tener SIM (sin envío), rotar durante una solicitud (no debe duplicar), consultar cada SIM por separado y comparar una ejecución con datos móviles desactivados frente a otra habilitada. Cada envío requiere autorización explícita. No provocar costos ni reintentos para completar una matriz.

**NO VERIFICADO** — Hasta recibir los informes reales no se afirma que USSD funcione en el S21 FE sin datos. La prueba no demuestra un gateway empresarial ni acceso a bancos.
