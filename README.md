# Plataforma de servicios · núcleo V1

Base funcional de SaaS multiempresa y marketplace para Argentina, implementada a partir de `docs/SPECIFICATION.txt` (PDF del fundador). Marca provisional configurable. Este repositorio contiene una entrega inicial del núcleo; **la especificación completa todavía no está terminada**. Estado detallado en [docs/PROGRESS.md](docs/PROGRESS.md).

## Qué se puede usar

- Registro, login, sesiones, perfil y recuperación de contraseña con Better Auth. Verificación de correo obligatoria en producción.
- Un usuario puede crear varios negocios. Roles de propietario y empleado con permisos en servidor; administración global restringida.
- Negocio en borrador, categoría, ubicación, configuración y política de cancelación.
- Profesionales y recursos físicos, servicios de precio fijo/estimado/presupuesto, duración y buffers.
- Horario semanal del negocio y de cada recurso, ausencias y bloqueos.
- Disponibilidad calculada en servidor, asignación de profesionales y reservas con transacción, bloqueo de fila y restricción de exclusión PostgreSQL.
- Agenda de lista con filtros, estados controlados, cancelaciones, historial del cliente y auditoría.
- Micrositios Minimal, Urban y Studio, editor de paleta/texto/visibilidad con borrador y publicación.
- Marketplace con búsqueda por nombre/servicio, categoría, localidad y precio. Sin reseñas ni distancias inventadas.
- Métricas calculadas sobre reservas reales. El valor de reservas se diferencia de ingresos cobrados.
- Notificaciones de reservas mediante outbox y proveedor SMTP configurable.

No hay cobros, pagos ficticios ni servicios externos contratados. Productos, pedidos, Mercado Pago, planes comerciales, imágenes y otras ampliaciones están pendientes.

## Ejecutar en tu computadora

Necesitás **Node 24**, npm y Docker (o un PostgreSQL 17 accesible).

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:categories
npm run dev
```

Abrí `http://localhost:3000`. Antes de usar cuentas reales, reemplazá `BETTER_AUTH_SECRET` en `.env` por un secreto aleatorio de al menos 32 caracteres, por ejemplo generado con `openssl rand -base64 48`. No subas `.env` a GitHub.

El primer registro sirve como cliente y permite crear negocios: no necesitás seleccionar un rol global de propietario. Después de crear el negocio, agregá profesionales/recursos → servicios → horarios → sitio web → publicar. Los formularios verifican permisos aunque se alteren sus campos ocultos.

### Demostración opcional, solo local

```bash
SEED_DEMO=true DEMO_PASSWORD='elegi-una-clave-local-de-12-o-mas' npm run db:seed
```

Se crean cuatro negocios claramente identificados como demostración y las cuentas `dueno@example.test` y `cliente@example.test`, con la contraseña indicada. El seed es idempotente y no borra datos existentes. Se niega a ejecutarse en producción; las consultas públicas de producción excluyen negocios demo.

### Correos

Sin SMTP, en desarrollo los correos de verificación y recuperación aparecen en consola. Las reservas guardan avisos para cliente y propietario; procesalos con:

```bash
npm run mail:deliver
```

En producción configurá SMTP y ejecutá el worker periódicamente en tu infraestructura. No hay envío real verificado en esta entrega. El worker hace hasta cinco intentos por aviso. Ver las limitaciones de entrega en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Validación

Usá **otra base descartable** cuyo nombre termine en `_test`:

```bash
docker compose exec db createdb -U pasa pasa_test
DATABASE_URL='postgresql://pasa:pasa_local_only@localhost:5432/pasa_test?schema=public' npm run db:deploy
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=high
```

`TEST_DATABASE_URL` debe apuntar a esa base. Las pruebas se niegan a usar una base sin el sufijo `_test`. Playwright ejecuta un recorrido HTTP con sesiones reales y páginas renderizadas; **no representa una validación visual o de interacción en navegador**. No requiere descargar Chromium. El servidor de pruebas usa el puerto 3100 y se cierra al finalizar. CI repite estos comandos sobre PostgreSQL efímero.

## Estructura y operación

`src/domain` contiene permisos y reglas; `src/lib`, adaptadores; `src/app`, páginas, acciones y API; `prisma`, esquema y migraciones SQL; `tests`, pruebas con DB real.

- [Arquitectura](docs/ARCHITECTURE.md), [base de datos](docs/DATABASE.md) y [decisiones](docs/DECISIONS.md).
- [Pruebas](docs/TESTING.md), [despliegue y recuperación](docs/DEPLOYMENT.md) y [contratos](docs/API.md).
- [Visión](docs/PRODUCT_VISION.md), [plan](docs/ROADMAP.md) y [continuidad](docs/PROGRESS.md).

La publicación de un micrositio dentro de la aplicación cambia su visibilidad en esa instalación; no despliega la aplicación a Internet. **No se desplegó producción ni se activaron cobros**.
