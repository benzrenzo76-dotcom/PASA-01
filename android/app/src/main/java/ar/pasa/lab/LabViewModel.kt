package ar.pasa.lab

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel

class LabViewModel(application: Application) : AndroidViewModel(application) {
    private val transport = UssdTransport(application)
    val supported get() = transport.supported
    var sims by mutableStateOf(emptyList<UssdTransport.Sim>()); private set
    var selected by mutableStateOf<UssdTransport.Sim?>(null)
    var code by mutableStateOf("")
    var authorized by mutableStateOf(false)
    var diagnostic by mutableStateOf(Diagnostic()); private set
    var response by mutableStateOf(""); private set
    var notice by mutableStateOf(""); private set
    val busy get() = diagnostic.state in setOf("RUNNING", "PENDING_TIMEOUT")
    fun refresh() {
        authorized = false
        try {
            sims = transport.sims()
            selected = sims.firstOrNull { it == selected } ?: sims.singleOrNull()
            notice = if (!transport.permitted()) "Se necesitan permisos de teléfono para listar SIM y enviar USSD." else if (sims.isEmpty()) "No se detectaron SIM activas." else "SIM actualizadas."
        } catch (_: RuntimeException) { sims = emptyList(); selected = null; notice = "No se pudieron consultar las SIM." }
    }
    fun send() {
        val sim = selected ?: return
        if (!authorized || !validCode(code) || busy) return
        try {
            transport.send(sim, code) { report, text -> diagnostic = report; response = text }
            code = ""
            authorized = false
        } catch (_: RuntimeException) { notice = "No se envió: revisá permisos y actualizá las SIM." }
    }
}
