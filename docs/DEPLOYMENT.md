# Despliegue y operación

**No se desplegó producción.** El PDF requiere autorización expresa antes de publicar o activar cobros. La entrega es código versionado y ejecución local verificable.

## Entorno

Node 24 en runtime con soporte Next.js y PostgreSQL 17 persistente. No usar exportación estática: sesiones, acciones y disponibilidad requieren servidor. `.env.example` documenta las variables sin secretos. Para servidor: `DATABASE_URL`, `BETTER_AUTH_SECRET` aleatorio, `BETTER_AUTH_URL` con URL HTTPS exacta, SMTP_HOST/PORT/USER/PASS y MAIL_FROM de un remitente validado; `NEXT_PUBLIC_APP_NAME` se incorpora al build.

Instalar `npm ci`, generar Prisma, aplicar `npm run db:deploy`, cargar solo categorías con `npm run db:categories`, compilar `npm run build` y arrancar `npm start`. No ejecutar seed demo ni `prisma migrate reset/db push` en producción. La DB requiere `btree_gist`; provisionar la extensión con rol de migraciones si el usuario de aplicación no tiene privilegios. Los scripts `db:categories` y `mail:deliver` cargan `.env`; en contenedores que solo inyecten variables, ejecutar `node --import tsx scripts/categories.ts` y `node --import tsx scripts/deliver-notifications.ts` directamente. Asegurar que tsx esté disponible en la imagen del worker o compilar esos scripts antes.

Usar un usuario de aplicación con privilegios mínimos, migraciones con rol separado, HTTPS, cookies seguras y proxy inverso configurado con el origen público. Better Auth exige correo verificado en producción. No cambiar ese requisito para ocultar una falta de SMTP.

## Checklist antes de autorizar producción

- Completar las pruebas de navegador, accesibilidad y formularios indicadas en TESTING.md.
- SMTP real, dominio remitente validado, prueba de registro/verificación/recuperación, entrega y cancelación.
- Worker de outbox periódico con supervisión; alertar fallos y agotamiento de reintentos.
- Rate limiting perimetral de consultas públicas, reservas y creación de negocios; validar cabeceras de IP según el proxy real. Better Auth ya limita sus endpoints en DB.
- Sesiones expiradas y RateLimit requieren una política de limpieza; definir jobs y retención de notificaciones/auditoría, sin borrar evidencia financiera futura.
- Configurar monitoreo de `/api/health`, errores 5xx y latencias; logs sin contraseñas/tokens/correos en producción. El código solo registra clases de error y IDs de trabajo.
- Respaldos cifrados y prueba de recuperación sobre otra DB. Rotación de claves y control de accesos.
- Revisar políticas de datos personales, privacidad, eliminación y condiciones de cancelación con asesoramiento local. No se afirma cumplimiento legal completo.
- Configurar CSP compatible con Next/nonce, HSTS en el proxy HTTPS, política de cookies y retención acordes al despliegue. Cabeceras anti-sniffing, anti-frame y referrer ya implementadas.
- Revisar paginación, índices/planes de consulta, cotas de recursos, comportamiento a carga y alertas por abuso.
- Para administrador inicial, un operador autorizado de DB debe promover una cuenta verificada específica mediante `User.isAdmin`, con evidencia y auditoría externa. No existe un email o password admin fijo ni ruta pública de promoción.

## Backups y recuperación

Con credenciales del rol de backup suministradas por el gestor de secretos (nunca pegadas en logs), ejecutar `pg_dump --format=custom --file=backup.dump "$DATABASE_URL"`. El nombre del archivo no debe contener datos personales. Mantener backup cifrado fuera del servidor, acceso restringido y retención acordada.

Para restaurar, crear **otra base vacía**, usar `pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" backup.dump`, verificar extensiones/migraciones, ejecutar salud y smoke tests con esa URL. Restaurar o reemplazar datos reales necesita autorización. No usar `--clean` contra producción por defecto.

Una reversión de aplicación se hace al commit anterior compatible con el esquema; no eliminar migraciones ya aplicadas ni hacer force-push. Para un rollback de datos, usar el procedimiento de recuperación probado. Git conserva el estado anterior del repo.

## Integraciones bloqueadas o pendientes

No hay integración Mercado Pago, S3, facturación ni WhatsApp. No agregar credenciales vacías para fingir éxito. Antes de Mercado Pago: consultar documentación oficial argentina vigente, validar marketplace/split y requisitos contractuales, implementar sandbox, verificar webhooks e idempotencia/conciliación y ejecutar pruebas de pagos pendientes/rechazados/reembolsados. Google Pay no se promete. Puntos y comisiones no se activan.
