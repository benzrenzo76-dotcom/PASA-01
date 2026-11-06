# Contratos y rutas

Sesión en cookie HTTP-only administrada por Better Auth. Nunca se acepta un `userId` del navegador para acreditar identidad. Importes se calculan desde DB.

## GET /api/availability

Query: `businessId`, `serviceId`, `day=YYYY-MM-DD`, `staffId` opcional. Solo negocio publicado, no suspendido, no demo en producción. Respuesta `{slots:[{startsAt:ISO_UTC,label:"HH:mm"}]}`. No devuelve datos de otras reservas ni de sus clientes. `Cache-Control: no-store`.

## POST /api/bookings

Requiere cookie autenticada y cabecera Origin idéntica al origen de BETTER_AUTH_URL. JSON máximo 8 KiB:

```json
{
  "businessId": "id-del-negocio",
  "serviceId": "id-del-servicio",
  "startsAt": "2026-11-10T13:00:00.000Z",
  "staffId": "opcional",
  "idempotencyKey": "uuid-v4-nuevo-por-intento-logico"
}
```

El ejemplo ilustra el formato; no usar el texto de ejemplo como UUID. El contrato rechaza campos adicionales como precio, cliente o estado. 201: `{booking}`; 400 datos inválidos; 401 sin sesión; 403 origen inválido; 404 servicio/negocio no publicado; 409 turno perdido/conflicto; 413 cuerpo excesivo; 429 límite de diez reservas futuras confirmadas por cliente/negocio. Errores `{error:{code,message}}`.

## Autenticación

`/api/auth/[...all]` expone los handlers oficiales de Better Auth, consumidos con `authClient`: registro, login, logout, verificación, sesión, actualización de nombre y restablecimiento. No construir clientes propios de almacenamiento de contraseña.

## Server Actions

`src/app/actions.ts`: crear negocio, configuración, servicio, activar/desactivar, profesional/recurso, horarios, sitio, bloqueos, acceso de empleado, estado de reserva, suspensión/restauración admin. Todas resuelven sesión en servidor. Las operaciones de dueño pasan por `ownerMutation`; cambios de reservas por `transitionBooking`. Respuesta de formulario `{success}` o `{error}`. Crear negocio redirige al borrador creado.

`statusAction`: solo una cancelación propia como cliente; propietario opera su negocio; empleado solo su agenda; transiciones terminales prohibidas. Ninguna acción marca un pago o devolución.

## Salud

GET `/api/health`: 200 `{status:"ok"}` si DB responde SELECT 1, o 503 `{status:"unavailable"}` sin detalles internos.
