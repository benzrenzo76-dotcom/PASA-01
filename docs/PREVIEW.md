# Vista previa visual

Vista privada solicitada por el fundador el 2026-11-06:

https://pasa-vista-previa.silver-smile-5741.chatgpt.site

Recorrido: marketplace → negocio → selección de fecha/turno de prueba → Mis reservas → panel/agenda. El editor permite probar Minimal, Urban y Studio, paletas y visibilidad. Búsqueda, filtros y cambios de demo funcionan en el navegador.

Es una muestra estática interactiva del diseño de PASA-01, referencia de código 5d3d4d0dd65fc07948f6aea95789ec993165f593. Reutiliza CSS y tipografías locales del proyecto. Usa negocios de ejemplo identificados como demo, sin datos de clientes reales. Las reservas se guardan únicamente en localStorage; no conecta PostgreSQL, crea cuentas, envía emails ni procesa cobros. No sustituye un entorno de staging del backend.

Publicación privada verificada por Sites. Sintaxis JS, archivos, búsqueda con acentos, filtros, intervalos/buffers locales y cancelación comprobados con Node. QA visual y de interacción en navegador pendiente: la sesión no dispuso de herramienta de navegador.

## Continuidad

Site project_id: appgprj_6aed2d967d7481919ad0d4350d97de6a

Source commit del Site: c8f58b7b51f5f935233fac75d61cbb25499242f9

Checkout de la sesión: /workspace/sites/pasa-vista-previa. Identidad en .openai/hosting.json; archivos estáticos en dist/. El código de la vista previa está guardado en el repositorio fuente privado del Site. Para retomarlo desde otro entorno usar get_site y la credencial de ese mismo proyecto, sin crear otro Site ni cambiar su acceso privado.

La aplicación Next/PostgreSQL de este GitHub permanece independiente. Cambios futuros de su diseño deben reflejarse en la vista previa para no presentar un avance distinto del producto real.

## Abrir un negocio con un nombre

La vista previa incorpora “Abrir mi negocio” en la navegación y la portada. Ruta directa: `#/abrir-negocio`. Solo pide el nombre, valida que no esté vacío y abre el panel sin registro, correo ni contraseña de la aplicación. El nombre se conserva en este navegador y puede cambiarse desde el panel.

El nuevo espacio empieza sin reservas, servicios, equipo ni horarios y no hereda datos de los cuatro ejemplos. El editor y el micrositio propio muestran el nombre elegido. Los datos de esta función siguen siendo locales de la vista previa; la autorización del backend Next/PostgreSQL permanece independiente.

Comprobado con Node: sintaxis JS, formulario de un único campo sin email/password, nombres vacíos/largos, normalización, persistencia del nombre y ruta directa al panel. Publicación privada verificada por Sites. QA visual en navegador pendiente.
