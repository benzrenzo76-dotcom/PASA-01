# Verificación

Pruebas ejecutadas sobre PostgreSQL 17 real, no mocks de disponibilidad. Base exclusiva `pasa_test`; las suites se niegan a usar una base sin sufijo `_test`. Los fixtures identifican y eliminan únicamente sus propios registros. No ejecutar sobre datos reales.

## Suites

- `npm test`: Vitest, dominio e integración. Registro de negocio, configuración/publicación, disponibilidad, snapshots de precio, buffers, horarios propios, ausencias, bloqueos y eliminación autorizada; idempotencia; dos clientes simultáneos sobre el mismo recurso; asignación alternativa de profesional; cancelación dentro/fuera de plazo; transiciones y finalización de turno; aislamiento entre negocios; alteración de precio; cliente ajeno; empleado y revocación; admin protegido; restricción SQL de exclusión; reglas puras.
- `npm run test:e2e`: Playwright APIRequestContext, recorrido HTTP integrado con servidor Next en puerto 3100 y sesiones reales. Registra propietario/cliente, consulta sesión, publica fixtures por el dominio, verifica páginas SSR del marketplace/micrositio, consulta horarios, confirma turno, reintenta, rechaza duplicado, precio adulterado y origen ajeno; consulta historial y agenda; niega panel de otro tenant y admin; prueba logout/login y endpoint sin sesión.
- `npm run typecheck`: TypeScript estricto.
- `npm run build`: generación Prisma, compilación Next, TypeScript y rutas.
- `npm audit --omit=dev --audit-level=high`: auditoría de dependencias de producción.
- Migraciones aplicadas en DB local y DB test. Seed de cuatro negocios ejecutado en desarrollo.

Los resultados finales están registrados en PROGRESS.md. `.github/workflows/ci.yml` repite checks sobre PostgreSQL efímero, pero su ejecución remota no se presume exitosa hasta consultar GitHub.

## Alcance de E2E

La suite HTTP NO maneja un navegador ni envía los formularios Server Actions de la UI. La preparación del negocio en E2E usa el dominio con la identidad obtenida del registro. No presentar esta suite como validación de clics o de responsive.

Este entorno no expuso una herramienta de navegador utilizable. Quedan pendientes E2E de interacción visual, vista móvil/escritorio, teclado, contraste medido, lectores de pantalla, recuperación por correo real, verificación por SMTP y comprobación de los formularios en navegador. Hay estilos responsive, etiquetas, foco visible, estados de error y reducción de movimiento implementados, pero no se afirma cumplimiento WCAG 2.2 AA.

Antes de producción, probar en navegador: registrarse, crear negocio desde formulario, configurar capacidad y horarios, editar/publicar sitio, buscar en marketplace, seleccionar servicio/profesional/fecha, confirmar, ver historial, cancelar y comprobar agenda del dueño. Repetir a 375 px y escritorio con teclado. Comprobar cierre de sesión, recuperación, suspensión administrativa, aislamiento entre sesiones y ausencia de información financiera en acceso de empleado.

## Pendientes de módulos no implementados

No hay resultados de stock concurrente, webhooks, pagos, reembolsos o planes: esos módulos no existen en este corte. Al construirlos deben añadirse las pruebas del PDF y ejecutarse sin eliminar estas suites. La ausencia de un módulo se declara como pendiente, no como un test aprobado.
