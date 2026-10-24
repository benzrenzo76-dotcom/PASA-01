# Seguridad experimental v0.1

**POSIBLE NO DEMOSTRADO** — Laboratorio ficticio: sin cuentas reales, claves bancarias ni custodia. Autorización opaca de uso único generada con aleatoriedad estándar; validación de todos los campos y vencimiento en el motor. El perfil local no representa una frontera de seguridad contra el dueño del dispositivo. API sólo loopback por defecto, sin despliegue público autorizado implícitamente.

SQLite usa transacciones para los dos saldos y el comprobante. Navegador usa una transacción IndexedDB de lectura/escritura para integridad entre pestañas. Android usa SQLite local. Los tres laboratorios locales son independientes y se etiquetan así. Un API remoto futuro debe agregar autenticación y políticas de acceso antes de exponerse. No se implementa criptografía propia ni se declara seguridad bancaria certificada.
