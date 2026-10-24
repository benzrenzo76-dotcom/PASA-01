package ar.pasa.lab

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun FinancialScreen(onDiagnostic: () -> Unit) {
    val model: FinancialViewModel = viewModel()
    val context = LocalContext.current
    var section by rememberSaveable { mutableStateOf("Inicio") }
    var confirm by remember { mutableStateOf(false) }
    var reset by remember { mutableStateOf(false) }
    var exportStatus by remember { mutableStateOf("") }
    var newAlias by remember { mutableStateOf("") }
    var newHolder by remember { mutableStateOf("") }
    var bank by remember { mutableStateOf("Banco Alfa") }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) exportStatus = try {
            val stream = context.contentResolver.openOutputStream(uri) ?: error("No se pudo abrir el archivo")
            stream.bufferedWriter().use { it.write(model.export()) }; "Informe ficticio exportado sin autorizaciones."
        } catch (_: Exception) { "No se pudo exportar." }
    }
    val canPrepare = !model.busy && model.displayedState !in listOf("PENDING", "SUBMITTED", "AWAITING_CONFIRMATION")
    Scaffold(containerColor = Color(0xFFF2F6F5), topBar = {
        Surface(color = Color(0xFF006B5E), contentColor = Color.White) {
            Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 20.dp, vertical = 10.dp)) {
                Text("PASA Lab · SIMULACIÓN LOCAL", style = MaterialTheme.typography.titleSmall)
                Text("OFFLINE · datos independientes del panel web", style = MaterialTheme.typography.labelSmall)
            }
        }
    }) { padding ->
        Column(Modifier.padding(padding).padding(horizontal = 20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Spacer(Modifier.height(4.dp))
            Text("PASA / FINANCIAL LAB", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            Text("Tu laboratorio,\nsin dinero real.", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Surface(color = Color(0xFFFFE7B8), shape = MaterialTheme.shapes.medium) {
                Text("SIMULACIÓN LOCAL · OFFLINE\nMotor SQLite de este teléfono. No sincroniza con el panel web ni contacta bancos u operadoras.", Modifier.padding(14.dp), style = MaterialTheme.typography.bodyMedium)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Inicio", "Transferir", "Monitor").forEach { page -> FilterChip(selected = section == page, onClick = { section = page }, label = { Text(page) }) }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Red", "Carga", "Ajustes").forEach { page -> FilterChip(selected = section == page, onClick = { section = page }, label = { Text(page) }) }
            }
            if (model.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            Text(model.notice, style = MaterialTheme.typography.bodyMedium)
            when (section) {
                "Inicio" -> {
                    Text("Cuentas ficticias", style = MaterialTheme.typography.titleLarge)
                    Text(model.lastBalanceKind, style = MaterialTheme.typography.labelMedium)
                    model.accounts.forEach { a ->
                        val tint = if (a.bank == "Banco Alfa") Color(0xFF006B5E) else Color(0xFF5D428D)
                        Card(colors = CardDefaults.cardColors(containerColor = tint), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(a.bank.uppercase(), color = Color.White, style = MaterialTheme.typography.labelLarge)
                                Text(labMoney(a.balance), color = Color.White, style = MaterialTheme.typography.headlineMedium)
                                Text("${a.holder}\n${a.alias}\nCuenta ${a.id}", color = Color.White, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                    Button(onClick = { model.refreshBalances() }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("Consultar saldos en el motor local") }
                    OutlinedButton(onClick = { section = "Transferir" }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("Preparar transferencia ficticia") }
                    Text("Movimientos e historial", style = MaterialTheme.typography.titleLarge)
                    Text("${model.operations.count { it.state == "ACCREDITED" }} acreditadas · ${model.operations.count { it.state == "REJECTED" }} rechazadas · ${model.operations.count { it.state == "AWAITING_CONFIRMATION" }} sin confirmar")
                    model.movements.takeLast(20).reversed().forEach { m ->
                        Text("${m.accountId} · ${labMoney(m.delta)}\nSaldo posterior ${labMoney(m.balanceAfter)}\n${m.operationId}", style = MaterialTheme.typography.bodySmall)
                        HorizontalDivider()
                    }
                    model.operations.takeLast(20).reversed().forEach { o -> Text("${o.state} · ${labMoney(o.amountCents)}\n${o.id}\n${o.reason}", style = MaterialTheme.typography.bodySmall) }
                }
                "Transferir" -> {
                    Text("Banco Alfa → Banco Beta", style = MaterialTheme.typography.titleLarge)
                    Text("Emisor ficticio: Joaquín · joaquin.prueba")
                    OutlinedTextField(value = model.alias, onValueChange = { model.alias = it }, label = { Text("Alias destino") }, enabled = canPrepare, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedButton(onClick = { model.lookup() }, enabled = canPrepare) { Text("Consultar alias") }
                    model.recipient?.let { a -> Text("${a.holder} · ${a.bank}\nCuenta ${a.id}", fontWeight = FontWeight.Medium) }
                    OutlinedTextField(value = model.amount, onValueChange = { model.amount = it }, label = { Text("Importe en pesos ARS · ej. 5000") }, supportingText = { Text("Hasta dos decimales; sin puntos de miles. Se guarda en centavos enteros.") }, enabled = canPrepare, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Button(onClick = { model.prepare() }, enabled = canPrepare, modifier = Modifier.fillMaxWidth()) { Text("Preparar por USSD virtual") }
                    Text("Estado del cliente: ${model.displayedState}", fontWeight = FontWeight.Bold)
                    model.prepared?.let { o ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Revisión / comprobante ficticio", style = MaterialTheme.typography.titleMedium)
                                Text("${model.recipient?.holder ?: o.destinationId}\n${model.recipient?.bank ?: ""}\nCuenta ${o.destinationId}")
                                Text(labMoney(o.amountCents), style = MaterialTheme.typography.headlineSmall)
                                Text("Operación ${o.id}\nMoneda ${o.currency}\nAutorización vinculada a esta operación, destino e importe. No se muestra ni se exporta el token.", style = MaterialTheme.typography.bodySmall)
                                if (model.displayedState == "AWAITING_CONFIRMATION") Button(onClick = { confirm = true }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("Revisar y confirmar transferencia ficticia") }
                                if (model.displayedState == "AWAITING_CONFIRMATION") OutlinedButton(onClick = { model.cancelPrepared() }, enabled = !model.busy) { Text("Cancelar preparación ficticia") }
                                if (model.displayedState == "PENDING") Text("Pendiente / resultado desconocido. No prepares otro pago: consultá el ID de esta operación.", color = MaterialTheme.colorScheme.error)
                                OutlinedButton(onClick = { model.queryStatus() }, enabled = !model.busy) { Text("Consultar estado por ID") }
                                OutlinedButton(onClick = { model.execute() }, enabled = !model.busy && model.displayedState in listOf("ACCREDITED", "REJECTED", "EXPIRED", "PENDING")) { Text("Reintentar misma operación · sin duplicar") }
                            }
                        }
                    }
                    if (!model.busy && model.displayedState in listOf("ACCREDITED", "REJECTED", "EXPIRED")) OutlinedButton(onClick = { model.newTransfer() }) { Text("Nueva transferencia") }
                }
                "Monitor" -> {
                    Text("Recorrido real del simulador", style = MaterialTheme.typography.titleLarge)
                    Text("Software medido: ${model.softwareMs} ms · demora artificial configurada: ${model.artificialMs} ms. La medición de software resta las esperas configuradas e incluye sobrecarga de planificación; no representa latencia bancaria real.")
                    if (model.events.isEmpty()) Text("Prepará una operación para observar sus eventos.")
                    model.events.forEach { e ->
                        var expanded by remember(e) { mutableStateOf(false) }
                        OutlinedCard(onClick = { expanded = !expanded }, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text("${e.stage} · ${e.state}", fontWeight = FontWeight.Bold)
                                Text("t=${e.at} · software ${e.softwareMs} ms · artificial ${e.artificialMs} ms", style = MaterialTheme.typography.labelSmall)
                                if (expanded) Text(e.detail, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                    Text("Últimos 100 eventos de esta sesión; el historial de dinero ficticio permanece en SQLite.", style = MaterialTheme.typography.bodySmall)
                }
                "Red" -> {
                    Text("Condiciones de red virtual", style = MaterialTheme.typography.titleLarge)
                    Toggle("Inyectar demoras y fallas", model.inject, !model.busy) { model.inject = it }
                    labProfiles.forEachIndexed { i, p ->
                        Row { RadioButton(selected = !model.custom && model.profileIndex == i, onClick = { model.profileIndex = i; model.custom = false }, enabled = !model.busy); Text("${p.name} · SIMULACIÓN", Modifier.padding(top = 12.dp)) }
                    }
                    Text("PASA-01 Observado usa un rango ilustrativo uniforme de 190–1915 ms. Datos reportados por el fundador: habitual ≈300 ms, medición 436 ms, pico 1350 ms, API 36, sin Wi-Fi/datos. Son consultas de diagnóstico; no constituyen una distribución estadística ni tiempos de transferencias.", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(model.seed, { model.seed = it }, label = { Text("Semilla reproducible") }, enabled = !model.busy, modifier = Modifier.fillMaxWidth())
                    Toggle("Usar parámetros personalizados", model.custom, !model.busy) { model.custom = it }
                    if (model.custom) {
                        Parameter("Mínimo artificial ms (0–5000)", model.minLatency, !model.busy) { model.minLatency = it }
                        Parameter("Máximo artificial ms (variabilidad)", model.maxLatency, !model.busy) { model.maxLatency = it }
                        Parameter("Fijo ms (vacío = rango)", model.fixedLatency, !model.busy) { model.fixedLatency = it }
                        Parameter("Pérdida %", model.loss, !model.busy) { model.loss = it }
                        Parameter("Timeout %", model.timeout, !model.busy) { model.timeout = it }
                        Parameter("Duplicación %", model.duplication, !model.busy) { model.duplication = it }
                        Parameter("Fallo gateway %", model.gatewayFailure, !model.busy) { model.gatewayFailure = it }
                        Parameter("Fallo API %", model.apiFailure, !model.busy) { model.apiFailure = it }
                        Parameter("Demora adicional servidor ms", model.serverDelay, !model.busy) { model.serverDelay = it }
                    }
                    Toggle("Respuesta antigua retrasada (se descarta por ID)", model.reorder, !model.busy) { model.reorder = it }
                    Toggle("Banco Beta ficticio disponible", model.betaAvailable, !model.busy) { model.toggleBeta(it) }
                    Text("La pérdida de confirmación se activa con su perfil. Las probabilidades afectan sólo al simulador local; ninguna de estas opciones envía códigos USSD reales.")
                }
                "Carga" -> {
                    Text("Carga al motor local", style = MaterialTheme.typography.titleLarge)
                    Text("Cada operación mueve $1 ficticio de Joaquín al kiosco. Hasta 1000 operaciones secuenciales; sin red externa. La carga omite demoras y fallas del transporte para medir exclusivamente el motor SQLite. El banco indisponible y los fondos siguen validándose.")
                    listOf(10, 50, 100, 1000).forEach { count -> OutlinedButton(onClick = { model.load(count) }, enabled = !model.busy) { Text("Ejecutar $count transferencias ficticias") } }
                    Text(model.loadSummary)
                }
                "Ajustes" -> {
                    Text("Conectividad y laboratorio", style = MaterialTheme.typography.titleLarge)
                    Text("Modo activo: SIMULACIÓN LOCAL independiente. Funciona sin internet. El modo SIMULACIÓN REMOTA requiere una API HTTPS desplegada y autenticada: P1, todavía no disponible en esta app. No se finge sincronización entre el panel y Android.")
                    OutlinedButton(onClick = onDiagnostic, enabled = !model.busy) { Text("Abrir diagnóstico USSD REAL") }
                    Text("El diagnóstico real conserva permisos oficiales, selección de SIM y autorización manual. No recibe mensajes del simulador financiero.")
                    HorizontalDivider()
                    Text("Crear cuenta ficticia · saldo inicial cero", style = MaterialTheme.typography.titleMedium)
                    Parameter("Alias ficticio", newAlias, !model.busy) { newAlias = it }
                    Parameter("Titular ficticio", newHolder, !model.busy) { newHolder = it }
                    Row { RadioButton(selected = bank == "Banco Alfa", onClick = { bank = "Banco Alfa" }); Text("Banco Alfa", Modifier.padding(top = 12.dp)); RadioButton(selected = bank == "Banco Beta", onClick = { bank = "Banco Beta" }); Text("Banco Beta", Modifier.padding(top = 12.dp)) }
                    OutlinedButton(onClick = { model.createAccount(newAlias, newHolder, bank) }, enabled = !model.busy) { Text("Crear cuenta") }
                    OutlinedButton(onClick = { reset = true }, enabled = !model.busy) { Text("Reiniciar laboratorio ficticio") }
                }
            }
            HorizontalDivider()
            OutlinedButton(onClick = { export.launch("PASA-financial-local.json") }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("Exportar informe JSON ficticio") }
            Text(exportStatus)
            Spacer(Modifier.height(18.dp))
        }
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text("Confirmá el pago ficticio") }, text = { Text("${labMoney(model.prepared?.amountCents ?: 0)} a ${model.recipient?.holder}, cuenta ${model.prepared?.destinationId}. Se ejecutará exclusivamente en el motor SQLite de este teléfono.") }, confirmButton = { TextButton(onClick = { confirm = false; model.execute() }) { Text("Confirmar SIMULACIÓN") } }, dismissButton = { TextButton(onClick = { confirm = false }) { Text("Volver") } })
    if (reset) AlertDialog(onDismissRequest = { reset = false }, title = { Text("Reiniciar datos ficticios") }, text = { Text("Se eliminan operaciones, cuentas adicionales y movimientos locales. Joaquín vuelve a $100.000 y el kiosco a $20.000. No afecta al panel web ni a un banco real.") }, confirmButton = { TextButton(onClick = { reset = false; model.reset() }) { Text("Reiniciar") } }, dismissButton = { TextButton(onClick = { reset = false }) { Text("Cancelar") } })
}

@Composable private fun Toggle(label: String, value: Boolean, enabled: Boolean, change: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(label, Modifier.weight(1f).padding(top = 12.dp)); Switch(checked = value, onCheckedChange = change, enabled = enabled) }
}
@Composable private fun Parameter(label: String, value: String, enabled: Boolean, change: (String) -> Unit) {
    OutlinedTextField(value = value, onValueChange = change, label = { Text(label) }, enabled = enabled, singleLine = true, modifier = Modifier.fillMaxWidth())
}
