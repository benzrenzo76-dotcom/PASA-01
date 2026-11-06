# Vista previa: negocio, cliente y agenda conectados

Enlace privado: https://pasa-vista-previa.silver-smile-5741.chatgpt.site

## Recorrido para el fundador

1. Abrir negocio en `#/abrir-negocio`, con un único nombre y sin cuenta de la aplicación.
2. El negocio aparece primero en el marketplace (`#/explorar`) y en la búsqueda por nombre o categoría Otros servicios.
3. Abrir su tarjeta o Reservar como cliente. Incluye un servicio de prueba de 30 minutos y horario lunes a sábado, 09–18 h de Buenos Aires, para poder reservar sin configuración previa.
4. Elegir fecha/hora y confirmar con el nombre Cliente de prueba (editable). Mis reservas muestra el turno y un botón Ver este turno en el panel del negocio.
5. En `#/panel/agenda`, consultar ese mismo turno, cliente, servicio, fecha, duración y estado. Iniciar, completar o cancelar la prueba actualiza también la vista de cliente y las métricas.
6. En Servicios se puede cambiar nombre/duración/precio del servicio. Los turnos anteriores conservan esos datos originales. El editor permite probar Minimal, Urban y Studio.

El negocio guardado en la versión anterior se migra automáticamente; no hay que borrarlo ni crearlo otra vez. Sus turnos se separan de los negocios de ejemplo.

## Alcance

Es una demostración interactiva que reutiliza CSS y fuentes del proyecto PASA-01, referencia de diseño 5d3d4d0dd65fc07948f6aea95789ec993165f593. Negocio y turnos se guardan en localStorage y comparten estado entre las vistas y pestañas del mismo navegador. **No comparte datos entre dispositivos o navegadores diferentes**. No envía correos, crea cuentas reales, conecta PostgreSQL ni procesa pagos.

El nombre Cliente de prueba permite verificar el flujo sin ingresar datos personales. Las etiquetas demo permanecen visibles. Iniciar/completar puede simularse antes del horario elegido para probar estados; esto no cambia las reglas temporales de la aplicación Next/PostgreSQL.

## Verificación

Diez pruebas aprobadas con `node tests/journey.test.mjs`, sobre las funciones que usa la UI: creación/búsqueda, migración del negocio anterior, recorrido crear-descubrir-reservar-agenda, recarga de datos, ocupación/buffers, separación de negocios, estados, cancelación, snapshots e inputs inválidos. Sintaxis JS y existencia de recursos HTML comprobadas.

Publicación privada verificada por Sites. QA visual y clics en navegador pendientes: la sesión no dispuso de herramienta de navegador. No confundir estas pruebas de datos con E2E en navegador.

## Continuidad

Site project_id: appgprj_6aed2d967d7481919ad0d4350d97de6a

Source commit del Site: 8526c5726bc2bb1d6b03738a24dc0c11c11ba44d

Checkout de la sesión: /workspace/sites/pasa-vista-previa. Identidad en .openai/hosting.json; estáticos en dist/ y pruebas en tests/. El código de esta demo está guardado en el repositorio fuente privado del Site. Para retomarlo, usar get_site y una credencial del mismo proyecto; no crear otro Site ni cambiar su audiencia.

La aplicación Next/PostgreSQL de este GitHub permanece independiente y conserva sus permisos y autenticación. Los cambios de diseño de la aplicación deben reflejarse en esta demo.
