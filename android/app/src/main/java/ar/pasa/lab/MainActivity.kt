package ar.pasa.lab

import android.Manifest
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        enableEdgeToEdge()
        setContent {
            var financial by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(true) }
            if (financial) {
                MaterialTheme(colorScheme = lightColorScheme(primary = androidx.compose.ui.graphics.Color(0xFF006B5E))) {
                    FinancialScreen(onDiagnostic = { financial = false })
                }
                return@setContent
            }
            val model: LabViewModel = viewModel()
            var confirm by remember { mutableStateOf(false) }
            var exportStatus by remember { mutableStateOf("") }
            val permissions = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { model.refresh() }
            val export = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
                if (uri != null) {
                    exportStatus = try {
                        val stream = contentResolver.openOutputStream(uri) ?: error("No stream")
                        stream.bufferedWriter().use { it.write(model.diagnostic.export()) }
                        "Informe exportado sin código ni respuesta."
                    } catch (_: Exception) { "No se pudo guardar el informe." }
                }
            }
            LaunchedEffect(Unit) { model.refresh() }
            MaterialTheme(colorScheme = lightColorScheme(primary = androidx.compose.ui.graphics.Color(0xFF006B5E))) {
                Scaffold(topBar = {
                    Surface(color = androidx.compose.ui.graphics.Color(0xFFFFE7B8)) {
                        Text("DIAGNÓSTICO USSD REAL · autorización manual", Modifier.fillMaxWidth().statusBarsPadding().padding(12.dp), style = MaterialTheme.typography.labelLarge)
                    }
                }) { padding ->
                    Column(Modifier.padding(padding).padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("PASA Lab", style = MaterialTheme.typography.headlineLarge)
                        OutlinedButton(onClick = { financial = true }, enabled = !model.busy) { Text("Volver al laboratorio financiero local") }
                        Text("PASA-01 · Diagnóstico USSD real", style = MaterialTheme.typography.titleMedium)
                        Text("Sin internet para enviar USSD. Requiere señal móvil. No realiza transferencias ni contacta un backend PASA.")
                        Text(if (model.supported) "API 26+ y telefonía detectadas. Soporte efectivo: pendiente de prueba." else "Dispositivo sin requisitos de telefonía para esta prueba.")
                        Button(onClick = { permissions.launch(arrayOf(Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE)) }, enabled = !model.busy) { Text("Solicitar permisos oficiales") }
                        OutlinedButton(onClick = { model.refresh() }, enabled = !model.busy) { Text("Actualizar SIM") }
                        Text(model.notice)
                        model.sims.forEach { sim ->
                            Row { RadioButton(selected = model.selected == sim, onClick = { model.selected = sim; model.authorized = false }, enabled = !model.busy); Text("SIM · ranura ${sim.slot + 1}", modifier = Modifier.padding(top = 12.dp)) }
                        }
                        OutlinedTextField(value = model.code, onValueChange = { model.code = it; model.authorized = false }, label = { Text("Código verificado de tu operadora") }, enabled = !model.busy, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth())
                        Text("No hay códigos precargados. Admitimos dígitos, * y #, hasta 182 caracteres como límite conservador de esta herramienta; no garantiza aceptación de la red.")
                        Row { Checkbox(checked = model.authorized, onCheckedChange = { model.authorized = it }, enabled = !model.busy); Text("Verifiqué este código con mi operadora y autorizo su ejecución y cualquier costo informado.") }
                        Button(onClick = { confirm = true }, enabled = model.supported && model.selected != null && validCode(model.code) && model.authorized && !model.busy) { Text("Revisar y enviar USSD") }
                        HorizontalDivider()
                        Text("Estado: ${model.diagnostic.state}")
                        Text("Duración: ${model.diagnostic.durationMs} ms · Error: ${model.diagnostic.errorCode ?: "—"}")
                        Text(model.response.ifEmpty { "Todavía no se recibió una respuesta." })
                        Text("Respuesta sólo en memoria; se pierde al cerrar el proceso. Un callback no demuestra éxito financiero. No hay reintentos automáticos.")
                        OutlinedButton(onClick = { export.launch("PASA-01-diagnostico.json") }, enabled = model.diagnostic.state != "NOT_STARTED") { Text("Exportar diagnóstico sin datos sensibles") }
                        Text(exportStatus)
                        Text("Si queda PENDING_TIMEOUT, no se puede cancelar la solicitud con esta API. Esperá el callback; antes de otra prueba, verificá con tu operadora que la sesión terminó.")
                    }
                }
                if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text("Confirmá el envío real") }, text = { Text("Se enviará ${model.code} por la SIM en ranura ${model.selected?.slot?.plus(1)}. Confirmá que es el código legítimo autorizado. Puede tener costo según tu operadora.") }, confirmButton = { TextButton(onClick = { confirm = false; model.send() }) { Text("Autorizo y envío") } }, dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancelar") } })
            }
        }
    }
}
