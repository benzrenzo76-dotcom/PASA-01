# Restricciones del canal y protocolo virtual

**CONFIRMADO EN DOCUMENTACIÓN** — ETSI TS123038 V16.0.0, sección USSD packing, describe 160 octetos y hasta182 caracteres empaquetados de7bits. Los caracteres de extensión consumen más de un septeto; contar caracteres Unicode no determina tamaño. La codificación y DCS importan. Fuente consultada2026-10-24: https://www.etsi.org/deliver/etsi_ts/123000_123099/123038/16.00.00_60/ts_123038v160000p.pdf.

**CONFIRMADO EN DOCUMENTACIÓN** — La especificación de sesiones USSD es TS23.090 (Stage2), cuyo índice oficial fue consultado2026-10-24: https://www.etsi.org/deliver/etsi_ts/123000_123099/123090/. Un simulador no establece una sesión con HLR, operador ni modem. La conversión USSD→HTTP requiere un gateway comercial; no la hace automáticamente Android.

**CONFIRMADO EN DOCUMENTACIÓN** — sendUssdRequest está disponible desdeAPI26 y usa CALL_PHONE y UssdResponseCallback. La API pública expone solicitud y resultado, no una API portable para automatizar menús interactivos ni una garantía de continuidad entre llamadas. Fuente consultada2026-10-24: https://developer.android.com/reference/android/telephony/TelephonyManager.

**NO VERIFICADO** — No se han negociado límites/codificación, sesiones, timeout, códigos ni endpoints de Claro/Personal/Movistar. Los mensajes compactos del laboratorio no se envían a TelephonyManager y sólo representan etapas virtuales. No se inventa un código marcable.

**POSIBLE NO DEMOSTRADO** — Un sobre financiero completo puede superar el límite: debe presupuestar identificador de operación, destino, importe, moneda, vencimiento, nonce, firma y framing. La longitud depende de serialización y algoritmo. Esta entrega usa tokens opacos experimentales en canales locales y NO demuestra una firma bancaria dentro de USSD. La compuerta real sigue cerrada. Si el presupuesto acordado no alcanza, alternativas a evaluar: SMS firmado o tokens preautorizados de un uso vinculados a operación, destinatario, importe, vencimiento y límites; no reducir esos vínculos para que entre una demo.
