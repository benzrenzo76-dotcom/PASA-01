# Simulador HTTP separado — SIMULACIÓN

**POSIBLE NO DEMOSTRADO** — Representa exclusivamente una futura respuesta HTTP del backend. No es USSD extremo a extremo ni lo llama Android. Sin integración bancaria ni datos financieros.

Desde la raíz: `python3 gateway-simulator/server.py`. En otra terminal: `curl http://127.0.0.1:8081/simulated/diagnostic`. Sólo escucha en loopback. Para pruebas: `python3 -m unittest discover -s gateway-simulator -v`.

**DEPENDE DE TERCEROS** — Un adaptador empresarial futuro necesitaría contrato con operadora/agregador, código asignado y autorizado, endpoint documentado para webhook y respuestas, autenticación acordada, límites de sesión/codificación, identificación segura, protección de replay y entorno de pruebas. Este endpoint local no es un endpoint de una operadora. El simulador de fallas completo de Fase 2 no está implementado.
