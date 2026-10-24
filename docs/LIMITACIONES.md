# Limitaciones de PASA-01

- **NO VERIFICADO**: ejecución en Samsung Galaxy S21 FE, comportamiento de One UI, callbacks sin datos móviles, doble SIM y condiciones reales de cobertura.
- **NO VERIFICADO**: transporte interactivo y capacidad para una firma completa. No hay app financiera ni backend financiero.
- **DEPENDE DE TERCEROS**: código legítimo verificado y autorizado por el fundador; acceso al teléfono físico; repositorio GitHub para correr Actions; futuros acuerdos con operadoras y bancos.
- **POSIBLE NO DEMOSTRADO**: diagnóstico en memoria, una solicitud activa, sin cancelación por API ni recuperación después de muerte de proceso. En timeout se conserva el estado desconocido; no hay retry.
- **POSIBLE NO DEMOSTRADO**: exportación sólo del último intento, sin código ni texto de respuesta. No incluye operadora ni versión One UI; el fundador debe registrarlas por separado sin datos personales. Al cerrar el proceso se pierde el resultado no exportado.
- **POSIBLE NO DEMOSTRADO**: el indicador de conectividad describe la red de datos activa al inicio. No verifica acceso a un servidor y no describe todas las SIM/redes disponibles. El estado de servicio puede ser null si Android restringe el acceso.
- **POSIBLE NO DEMOSTRADO**: la validación de sintaxis no certifica legitimidad, costo ni ausencia de efectos del código ingresado. Eso exige verificación humana con la operadora antes de autorizar el envío.
- **POSIBLE NO DEMOSTRADO**: HTTP sólo en el simulador de escritorio aislado. No es un canal sin internet, ni un gateway USSD conectado a PASA.
