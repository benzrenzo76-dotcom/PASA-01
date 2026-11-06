# Decisiones

2026-11-06:

1. **Repositorio:** el usuario pidió reemplazar el proyecto «pasa». La cuenta conectada tenía `benzrenzo76-dotcom/PASA-01`; main estaba en `2dc5f08d027aeff072fc0796a26456b498403363`, solo `.gitignore`. Se conserva el historial con un commit descendiente y se reemplaza el árbol de archivos. No se borran otros repositorios, issues o datos externos.
2. **Stack:** Next 16.4.5, React 19.3.1, TypeScript 7.0.2, Prisma/client 6.19.0, PostgreSQL 17, Better Auth 1.7.18. Versiones observadas en npm e instalación registrada en package-lock. `npm ci` es reproducible. Prisma 6 se eligió por su configuración tradicional conocida, sin migrar prematuramente a adaptadores Prisma 7.
3. **Overrides de tooling:** npm audit identificó GHSA-ggr8-5vv4-36mx y GHSA-38f7-945m-qr2g en dependencias de configuración de Prisma. Se fijan deepmerge-ts 8.0.2 y effect 3.22.4 en `@prisma/config`. Validar de nuevo el CLI y migraciones al actualizarlos; no usar `audit fix --force` sin revisar cambios mayores.
4. **Auth madura:** Better Auth maneja sesiones, cookies, hashing, verificación, recuperación y rate limit persistente. `isAdmin` no está expuesto como campo de registro. Verificación obligatoria en producción, cuenta de desarrollo utilizable sin proveedor SMTP.
5. **UI:** CSS y componentes propios, sin Tailwind/shadcn/React Hook Form en este corte. Formularios acotados con Server Actions, useActionState y validación Zod servidor. Reduce dependencias y mantiene funcionamiento verificable. No hay editor libre ni JS/CSS de propietarios.
6. **Capacidad:** un modelo Asset para profesionales y recursos, al menos uno por servicio. Recursos fijos requeridos, profesionales alternativos. La exclusión PostgreSQL más lock de negocio prioriza corrección frente a concurrencia máxima.
7. **Sin finanzas simuladas:** cobrar, suscripciones y sus estados no se implementan parcialmente. El valor del turno es estimado y no se contabiliza como pago. Mercado Pago requiere documentación oficial vigente y pruebas sandbox antes de integrarse.
8. **Datos demo:** seed explícito de desarrollo, nombres marcados, bloqueo de ejecución y exclusión pública en producción.
9. **Publicación:** el PDF prohíbe despliegue público y cobros sin autorización expresa. No se registra ni despliega un Site; se entrega código en el GitHub pedido. Publicar un micrositio significa cambiar estado dentro de la instalación.
10. **Pruebas HTTP:** Next App Router puede mantener HTTP 200 después de comenzar streaming aunque `notFound()` deniegue la página. El E2E comprueba contenido de denegación y ausencia de datos privados, además de tests directos de autorización. Referencia instalada: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`.
