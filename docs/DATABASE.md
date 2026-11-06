# Base de datos

`prisma/schema.prisma` es la referencia; las migraciones contienen restricciones SQL adicionales que **no se pueden reemplazar por `prisma db push`**.

Entidades utilizadas: User, Session, Account, Verification, RateLimit (Better Auth); BusinessCategory; Business; BusinessMembership; BusinessHours; Asset, AssetHours; Service, ServiceAsset; Booking, BookingAllocation, BookingStatusHistory; BookingBlock; Notification; AuditLog.

`Asset.kind` representa profesionales o recursos físicos. `AssetHours` combina disponibilidad del personal y recursos; `BookingBlock` representa ausencias, mantenimiento o cierre global. Se evita crear tablas sin flujos implementados. La relación negocio-cliente se deriva de Booking; todavía no hay CRM ni un perfil independiente por negocio.

- Índices por negocio, fecha, estado y cliente. Slug de negocio y email únicos.
- FKs compuestas para servicios, asignaciones de servicios, recursos, horarios, membresías y ocupaciones evitan mezclar tenants.
- Importe entero en centavos ARS; nunca `float`. QUOTE no presenta cero como precio final.
- Instantes de reservas, bloques y ocupaciones con `timestamptz(3)`, UTC. Horarios semanales en minutos locales y zona IANA del negocio.
- Restricción `no_asset_overlap`: exclusión GiST de intervalos activos por recurso, con `btree_gist`.
- CHECK de intervalos positivos, horarios válidos, cancelación y cantidades monetarias no negativas.
- Sesiones/cuentas se eliminan en cascada al borrar usuario. Reservas históricas restringen la eliminación accidental de usuarios/negocios. No se ofrece borrado irreversible desde la UI.
- Secretos del proveedor y contraseñas no se guardan en auditoría. Better Auth administra hash de contraseñas y tokens de sesión.

Las tablas financieras, productos, pedidos, planes, imágenes y fidelización están pendientes. No hay ledger ni obligaciones de puntos ficticias. Una futura integración financiera debe mantener estados separados e importar el importe desde el servidor.

Para nuevas migraciones: `npm run db:migrate -- --name nombre`. Revisar SQL, incluyendo constraints no representables por Prisma, y probar sobre una DB descartable antes de producción. La clave administrativa de DB usada aquí es solo local; producción necesita usuario de aplicación con privilegios mínimos y rol de migraciones separado.
