# Factibilidad: alcance PASA-01

Fecha de consulta: **2026-10-24**. PASA-01 prioriza un diagnóstico físico aislado por instrucción expresa del fundador. Este documento **no declara terminada la Fase 0 financiera** ni habilita backend, contrato financiero o transferencias.

| Pregunta | Estado y conclusión |
|---|---|
| API y permiso | **CONFIRMADO EN DOCUMENTACIÓN**: `TelephonyManager.sendUssdRequest` desde API 26, requiere CALL_PHONE y telefonía/radio. Envía una solicitud y entrega callback; puede lanzar UnsupportedOperationException. |
| Doble SIM | **CONFIRMADO EN DOCUMENTACIÓN**: `SubscriptionManager.getActiveSubscriptionInfoList` permite listar suscripciones activas con READ_PHONE_STATE; `createForSubscriptionId` vincula TelephonyManager a la elegida. **NO VERIFICADO**: ruteo efectivo del S21 FE y su firmware. |
| Errores y callback | **CONFIRMADO EN DOCUMENTACIÓN**: callback de respuesta o fallo; constantes USSD_RETURN_FAILURE y USSD_ERROR_SERVICE_UNAVAIL. El código numérico se conserva, incluso si no se reconoce. **NO VERIFICADO**: tiempos y entrega real en One UI. |
| Sesión de un disparo / interactiva | **CONFIRMADO EN DOCUMENTACIÓN**: el método expone solicitud y callback. **NO VERIFICADO**: continuidad interactiva portable; este diagnóstico no implementa navegación ni respuestas a menús. No automatiza el dialer. |
| Samsung One UI | **NO VERIFICADO**: no se ejecutó en un Samsung físico. Se requiere versión Android/One UI, operadora y prueba autorizada. Una feature detectada no demuestra compatibilidad de la red. |
| Longitud, caracteres, codificación | **NO VERIFICADO**: no se verificó todavía una especificación de transporte empresarial aplicable a las operadoras argentinas. El límite de entrada local 182 y el alfabeto restringido no prueban un límite universal de USSD. |
| ¿Cabe una autorización firmada? | **NO VERIFICADO**: no hay análisis cerrado de serialización, firma, framing, codificación ni límites negociados de gateway. No se responde sí. Se mantiene cerrada la compuerta financiera. |
| Claro, Personal y Movistar: USSD empresarial | **DEPENDE DE TERCEROS / NO VERIFICADO**: faltan documentación comercial verificable, cobertura, acuerdos, credenciales y límites por canal. No se inventan códigos ni endpoints. |
| Banco Comafi API Banking sandbox | **NO VERIFICADO**: alias, CVU/CBU, saldo, transferencias, autenticación y estados no se investigaron en este experimento; no se integra ningún banco. |

## Fuentes consultadas

**CONFIRMADO EN DOCUMENTACIÓN** — Todas las siguientes URL se consultaron el 2026-10-24; ninguna prueba documental reemplaza la ejecución física:

- https://developer.android.com/reference/android/telephony/TelephonyManager — `sendUssdRequest`, `createForSubscriptionId`, permisos y features. La documentación actual también describe restricciones para desvíos de llamadas; no usar esos códigos en este experimento.
- https://developer.android.com/reference/android/telephony/TelephonyManager.UssdResponseCallback — métodos de respuesta/fallo.
- https://developer.android.com/reference/android/telephony/SubscriptionManager — suscripciones activas.
- https://developer.android.com/build/releases/agp-8-9-0-release-notes — AGP 8.9.2 estable; compatibilidad API 35, Gradle 8.11.1, Build Tools 35.0.0 y JDK mínimo 17.
- https://kotlinlang.org/docs/releases.html — Kotlin 2.0.21 como versión estable publicada.

- https://developer.android.com/develop/ui/compose/bom/bom-mapping — mapa oficial de versiones Compose (consulta 2026-10-24).
- https://developer.android.com/jetpack/androidx/releases/activity — notas de Activity, incluida la serie estable 1.9 (consulta 2026-10-24).
- https://developer.android.com/jetpack/androidx/releases/lifecycle — notas de Lifecycle, incluida la serie estable 2.8 (consulta 2026-10-24).

## Compuerta financiera

**NO VERIFICADO** — PASA-01 no valida firmas ni comunicación teléfono → USSD → backend propio. Si el análisis futuro demuestra que una firma por operación no cabe, se detendrá ese diseño y se evaluarán SMS firmados o tokens preautorizados con límite, expiración y protección contra replay. Ninguna alternativa está implementada o demostrada. Incluso una respuesta USSD exitosa sólo demuestra ese intercambio con la operadora.
