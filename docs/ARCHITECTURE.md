# Arquitectura

Monolito Next.js App Router y React con TypeScript estricto. PostgreSQL 17 y Prisma 6.19, Zod, Better Auth. UI con componentes propios y CSS responsive. Módulos actuales: autenticación, negocios, catálogo/capacidad, disponibilidad, reservas, micrositios, marketplace, administración y notificaciones.

## Fronteras

Las páginas y Server Actions resuelven la sesión. El dominio recibe la identidad desde el servidor y verifica membresías. Un `businessId` enviado por el cliente nunca acredita acceso. Consultas compuestas `businessId/id` y FKs compuestas impiden asociaciones cruzadas. Administradores se determinan por `User.isAdmin` en DB, no por campos del registro ni por un correo especial. No se activa una cuenta admin por seed.

Las operaciones del propietario se ejecutan en `ownerMutation`, con transacción, permiso y auditoría. Los empleados solo reciben agenda y pueden operar las reservas asignadas a su `assetId`. Los clientes consultan exclusivamente sus reservas; un negocio ve solo los clientes de sus propias reservas.

## Reserva y concurrencia

1. Validar el contrato estricto; descartar cualquier precio enviado por navegador.
2. Transacción PostgreSQL y `SELECT Business ... FOR UPDATE` sobre el negocio. Todas las mutaciones de capacidad y bloqueos usan la misma fila.
3. Volver a leer servicio, horarios, membresía cuando corresponda, bloqueos, ocupaciones y política.
4. Evaluar duración y buffers con intervalos semiabiertos `[inicio, fin)`. Elegir un profesional libre de los habilitados y ocupar todos los recursos físicos requeridos.
5. Crear reserva con snapshots de nombre, importe, tipo de precio y plazo de cancelación. Crear asignaciones, historial, avisos y auditoría en la misma transacción.
6. PostgreSQL aplica además `EXCLUDE USING gist` sobre recurso e intervalo activo. Una escritura que saltee el dominio también enfrenta la restricción de solapamiento.

La serialización es por negocio, elegida por simplicidad y bajo volumen inicial. Negocios diferentes operan en paralelo. Timeout de transacción y espera acotados; conflicto devuelve HTTP 409. Si crece la demanda, medir antes de usar locks más finos. La comprobación previa de disponibilidad no garantiza que el turno siga libre: la confirmación siempre la repite.

Claves idempotentes por cliente. Un reintento idéntico devuelve la misma reserva; cambiar el contenido con la misma clave produce conflicto. No reenviar ciegamente una reserva con una clave nueva tras una desconexión.

## Estados

CONFIRMED → IN_PROGRESS → COMPLETED. Desde CONFIRMED: cancelación por cliente, negocio o NO_SHOW; desde IN_PROGRESS: cancelación por negocio. Los terminales no se reabren. No iniciar o marcar ausencia de turnos futuros. No hay estados de pago implementados porque no hay procesador integrado. Reservas confirmadas no significan pagadas.

Cancelación conserva snapshots y auditoría, desactiva ocupaciones y encola correos. Nunca genera reembolso. Cambiar horario o servicio conserva las reservas anteriores, que deben coordinarse si el negocio necesita reprogramarlas. Un bloqueo que colisiona con reservas se rechaza.

## Notificaciones

Outbox transaccional en `Notification`. Worker con `FOR UPDATE SKIP LOCKED`, hasta veinte mensajes por ejecución y cinco intentos por mensaje. SMTP obligatorio en producción; consola explícita en desarrollo. El estado de envío local significa procesado por el adaptador de desarrollo, no entregado a una persona.

Semántica al menos una vez: si el proveedor acepta y el proceso cae antes del commit puede repetirse el correo. No se promete entrega exactamente una vez; para reducir duplicados se necesita un proveedor con clave idempotente y reconciliación. Después de cinco fallos revisar la causa y habilitar un nuevo intento manualmente. No incluir secretos ni datos de tarjeta. La tabla contiene correo y datos de reserva: limitar acceso y retención.

## Límites actuales

Una franja por día, sin horarios nocturnos que crucen medianoche. Horarios de recursos vacíos heredan el negocio. No hay selección de recursos alternativos ni capacidades mayores a una por recurso: representar cada unidad física por separado. Los profesionales se asignan por orden de registro, sin rotación comercial prometida. Listas acotadas a 60 negocios, 100 reservas y 50 bloqueos/auditorías; paginación y mejor cálculo por lotes pendientes antes de grandes volúmenes. En producción, agregar rate limiting perimetral a endpoints públicos.
