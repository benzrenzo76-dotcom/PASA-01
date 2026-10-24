# PASA-01: arquitectura del experimento

**POSIBLE NO DEMOSTRADO** — Diagnóstico aislado autorizado por la prioridad PASA-01; no implementa las fases financieras 1–3 ni supone viable una firma por USSD.

**CONFIRMADO EN DOCUMENTACIÓN** — `sendUssdRequest` existe desde API 26. Se usan permisos oficiales `CALL_PHONE` y `READ_PHONE_STATE` (este último para SIM activas y estado de servicio); `ACCESS_NETWORK_STATE` permite observar la red de datos. Fuentes y fecha en FACTIBILIDAD.md.

**POSIBLE NO DEMOSTRADO** — Diseño implementado: Compose Material 3 → `LabViewModel` → `UssdTransport` → `TelephonyManager.createForSubscriptionId`. El ViewModel sobrevive a rotación y usa Application, sin retener Activity. Sin persistencia de código/respuesta, sin logs de esos datos y sin permiso INTERNET. No necesita Keystore ni biometría: no hay credenciales ni autorizaciones financieras en este experimento. La autorización manual se limita al código exacto y a la SIM mostrados en el diálogo.

**POSIBLE NO DEMOSTRADO** — Estados del diagnóstico: `NOT_STARTED → RUNNING → RESPONSE_RECEIVED | CALLBACK_FAILURE | PERMISSION_ERROR | UNSUPPORTED | LOCAL_ERROR`. `RUNNING → PENDING_TIMEOUT` a los 60 segundos; desde allí sólo `LATE_RESPONSE | LATE_FAILURE` al recibir callback. No hay reenvío mientras esté RUNNING o PENDING_TIMEOUT. Se ignoran callbacks duplicados tras un resultado terminal. Un nuevo intento exige otra entrada y autorización. Estas etiquetas no son estados financieros.

**POSIBLE NO DEMOSTRADO** — Decisiones reversibles: Android mínimo 26; compilación API 35; versiones estables fijadas (no se afirma que sean las últimas); entrada conservadora de 2–182 caracteres sólo dígitos, * y #. Esto restringe el diagnóstico y no demuestra la capacidad de payload de una pasarela. No hay continuidad de sesiones interactivas. Sin retries ni cancelación ficticia. Se bloquean capturas de pantalla para reducir exposición de la respuesta.

**POSIBLE NO DEMOSTRADO** — El informe usa una lista cerrada de metadatos: API de Android, ranura SIM, estado de servicio numérico o null, estado de modo avión y red activa al inicio, estado del intento, duración monotónica y error numérico. No exporta código ni respuesta, identificadores de suscripción, teléfono, IMEI/IMSI, ICCID, operadora, IP o cuentas. La ranura puede ayudar a comparar pruebas sin identificar la SIM. La duración durante RUNNING es cero; en timeout es el tiempo hasta el umbral y en callback tardío hasta ese callback. La red activa no indica si los datos móviles están habilitados en otras SIM. `validatedInternet=false` no prueba por sí solo desconexión completa: realizar el procedimiento manual.

**POSIBLE NO DEMOSTRADO** — El simulador Python está aislado en `gateway-simulator/`, escucha sólo loopback y no lo consume Android. Representa una respuesta HTTP futura, sin USSD, dinero, saldos ni proveedor real. No constituye el gateway de Fase 2.

**NO VERIFICADO** — Reinicio/muerte del proceso pierde el diagnóstico en memoria. La app no puede recuperar ni cancelar la sesión USSD previa. No abrir otra prueba hasta verificar su finalización con la operadora. Un servicio persistente o recuperación se evaluará sólo si el experimento lo requiere.
