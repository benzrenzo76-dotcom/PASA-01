# Continuidad · 2026-11-06

Especificación: Prompt_Maestro_Codex_Plataforma_V1.pdf, preservada como SPECIFICATION.txt.
Repositorio seleccionado: `benzrenzo76-dotcom/PASA-01`, rama `main`. Base inspeccionada: `2dc5f08d027aeff072fc0796a26456b498403363`, con solo .gitignore. Se conserva el historial; no se destruyeron datos de producción.

## IMPLEMENTADO

Entrega inicial del núcleo de fases 1–5 y parte de 6/8:

- Proyecto Next/React/TypeScript, monolito, PostgreSQL, migraciones, validación y Better Auth.
- Registro, login/logout, sesión, perfil, recuperación y verificación por adaptador de correo. Roles OWNER/EMPLOYEE y admin DB; varias membresías por usuario, acceso y revocación de empleados.
- Negocio borrador, categoría configurable, nombre/slug/localidad/dirección/contacto, política de cancelación y configuración.
- Servicios universales con duración, precio/tipo, anticipación, buffers, profesionales y recursos físicos; alta y activar/desactivar. Profesionales/recursos con horarios y bloqueos eliminables por dueño.
- Disponibilidad, reserva real, bloqueo de fila por negocio y exclusión PostgreSQL; snapshots e idempotencia; estado/historial; cancelación con política; outbox de confirmación/cancelación para dueño y cliente.
- Micrositios Minimal/Urban/Studio y editor acotado de plantilla, paleta, frase y visibilidad, borrador/publicación y vista previa del diseño.
- Marketplace con nombre/servicio, categoría, localidad y precio. Perfil público, servicios, equipo, horarios y widget de reserva. Marca configurable, sin ratings, distancias o ingresos ficticios.
- Historial y próximas reservas del cliente; agenda de lista con filtros, estados y operaciones autorizadas. Métricas reales de reservas y clientes, valor estimado distinto de facturación.
- Administración inicial: acceso restringido, conteos de cuentas, negocios, suspensión/restauración con motivo y confirmación, auditoría.
- Health check, worker SMTP/console, seed local explícito de cuatro rubros, CI, README y documentos de continuidad. Fuentes servidas desde paquetes locales, sin petición de Google Fonts del visitante.

Archivos principales: `src/domain/{business,availability,bookings,permissions,validation}.ts`, `src/lib/{auth,db,mail}.ts`, `src/app/actions.ts`, páginas en `src/app`, componentes en `src/components`, `prisma/schema.prisma`, dos migraciones SQL, `tests`, `scripts`, `.github/workflows/ci.yml` y documentación.

## PROBADO

Verificación ejecutada en esta sesión:

- Migraciones PostgreSQL aplicadas sobre bases local y descartable de pruebas.
- Seed demo ejecutado, cuatro negocios y cuentas locales.
- TypeScript estricto y build Next de producción ejecutados.
- Vitest: **25 pruebas aprobadas**, reservas válidas, duplicadas/concurrentes, idempotencia, horario/buffers/ausencias/bloqueos, cancelación y estados, precio servidor, SQL de exclusión, aislamiento/empleado/admin, finalización de turno y revocación.
- Playwright: **1 recorrido HTTP aprobado** con varias comprobaciones, sesiones y SSR real. No ejecuta navegador ni los formularios de onboarding.
- Auditoría npm: cero vulnerabilidades reportadas después de overrides documentados.

Se corrigió un fallo real detectado por tests en las altas anidadas con FKs compuestas de Prisma: se separan entidad y asignaciones dentro de la misma transacción. Se corrigió la prueba de acceso SSR para verificar la denegación y ausencia de datos después del streaming, según la documentación oficial incluida con Next. No se eliminó la prueba de permisos.

## PENDIENTE

Esta entrega **no es la V1 completa del PDF**. Falta cerrar el núcleo con pruebas de navegador y ampliar:

- Edición completa y baja/archivo de servicios y personal (hoy se crean servicios y se activan/desactivan); fotos, especialidades y otros metadatos.
- Reservas manuales, reprogramación y vistas día/semana; múltiples franjas y turnos nocturnos; paginación y optimización por lotes de disponibilidad.
- Editor: imágenes/logo/galería con validación, orden de secciones, tipografías, banners, redes y WhatsApp. Almacenamiento S3 sin integrar.
- Invitaciones por correo a empleados, perfil de contacto más amplio y política de eliminación. Cambio de categoría/slug después del alta y flujos admin completos de categorías/planes/incidencias.
- Filtro de disponibilidad en marketplace, proximidad real cuando haya coordenadas, métricas por períodos, servicios populares y visitas respetuosas de privacidad.
- Productos, inventario, carrito, pedidos y tests de stock concurrente.
- Mercado Pago sandbox, verificación de webhooks, pagos/reembolsos, conciliación, planes/capacidades/suscripciones. No hay tablas financieras de adorno ni finanzas simuladas.
- S3, puntos/fidelización y extensiones futuras según alcance del PDF.
- Validación visual móvil/escritorio, interacción de formularios, accesibilidad y rendimiento/carga. No afirmar WCAG AA ni pruebas visuales aprobadas.
- Endurecimiento y operación de producción conforme DEPLOYMENT.md.

## BLOQUEADO

- Envío real y verificación SMTP: sin credenciales/proveedor en esta sesión. Desarrollo usa consola explícita.
- Pagos: sin credenciales, investigación contractual/oficial ni pruebas sandbox; sin cobros reales.
- QA de navegador: la sesión no expuso herramienta de navegador utilizable. Solo se ejecutó E2E HTTP.
- Producción: no autorizada por el PDF. No se desplegó ni se contrataron servicios.

## Siguiente tarea

Ejecutar el flujo completo con navegador y formularios a 375 px y escritorio; corregir hallazgos y verificar recuperación/SMTP en un entorno de pruebas. Después cerrar edición de catálogo y reservas manuales/reprogramación; recién entonces iniciar productos e inventario. No comenzar pagos antes de que el núcleo esté estable. Mantener los tests existentes, permisos servidor y exclusión PostgreSQL.
