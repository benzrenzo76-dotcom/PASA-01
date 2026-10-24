package ar.pasa.lab

import android.app.Application
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.random.Random

data class VirtualEvent(val stage: String, val state: String, val at: Long, val softwareMs: Long = 0, val artificialMs: Long = 0, val detail: String = "")
data class NetworkProfile(val name: String, val minMs: Long, val maxMs: Long, val loss: Int = 0, val timeout: Int = 0, val duplicate: Int = 0, val gatewayFail: Int = 0, val apiFail: Int = 0, val serverMs: Long = 0, val loseConfirmation: Boolean = false)
val labProfiles = listOf(
    NetworkProfile("Red ideal", 0, 0),
    NetworkProfile("PASA-01 Observado", 190, 1915),
    NetworkProfile("Red lenta", 1000, 2000),
    NetworkProfile("Red congestionada", 1200, 3000, timeout = 15),
    NetworkProfile("Red inestable", 100, 800, loss = 20, duplicate = 25),
    NetworkProfile("Gateway parcialmente caído", 200, 500, gatewayFail = 40),
    NetworkProfile("Respuesta bancaria demorada", 100, 300, serverMs = 2000),
    NetworkProfile("Pérdida de confirmación", 0, 0, loseConfirmation = true)
)

class FinancialViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SqliteLabStore(application)
    private val engine = FinancialEngine(store)
    var accounts by mutableStateOf(emptyList<LabAccount>()); private set
    var operations by mutableStateOf(emptyList<LabOperation>()); private set
    var movements by mutableStateOf(emptyList<LabMovement>()); private set
    var prepared by mutableStateOf<LabOperation?>(null); private set
    var recipient by mutableStateOf<LabAccount?>(null); private set
    var alias by mutableStateOf("kiosco.pepito")
    var amount by mutableStateOf("5000")
    var profileIndex by mutableStateOf(1)
    var seed by mutableStateOf("1")
    var minLatency by mutableStateOf("190")
    var maxLatency by mutableStateOf("1915")
    var fixedLatency by mutableStateOf("")
    var loss by mutableStateOf("0")
    var timeout by mutableStateOf("0")
    var duplication by mutableStateOf("0")
    var gatewayFailure by mutableStateOf("0")
    var apiFailure by mutableStateOf("0")
    var serverDelay by mutableStateOf("0")
    var inject by mutableStateOf(true)
    var custom by mutableStateOf(false)
    var reorder by mutableStateOf(false)
    var betaAvailable by mutableStateOf(true)
    var events by mutableStateOf(emptyList<VirtualEvent>()); private set
    var busy by mutableStateOf(false); private set
    var notice by mutableStateOf("SIMULACIÓN LOCAL · motor SQLite del teléfono, independiente del panel web."); private set
    var displayedState by mutableStateOf("NOT_STARTED"); private set
    var lastBalanceKind by mutableStateOf("Último conocido · datos locales persistidos"); private set
    var softwareMs by mutableStateOf(0L); private set
    var artificialMs by mutableStateOf(0L); private set
    var loadSummary by mutableStateOf(""); private set
    private var loadTimes = emptyList<Long>()
    private val sourceId = "alfa-joaquin"
    init {
        refresh()
        betaAvailable = engine.isBetaAvailable()
        // Recover the last persisted operation by its authoritative ID after process death.
        operations.lastOrNull()?.let { op ->
            prepared = op; displayedState = op.state
            recipient = accounts.singleOrNull { it.id == op.destinationId }
            notice = "Última operación local recuperada por ID: ${op.state}. No se reenvió ningún mensaje."
        }
    }
    private fun refresh() { accounts = engine.accounts(); operations = engine.operations(); movements = engine.movements() }
    private fun emit(stage: String, state: String, detail: String = "", actual: Long = 0, artificial: Long = 0) {
        events = (events + VirtualEvent(stage, state, System.currentTimeMillis(), actual, artificial, detail)).takeLast(100)
    }
    private fun configured(): NetworkProfile {
        if (!inject) return labProfiles.first()
        if (!custom) return labProfiles[profileIndex]
        fun duration(text: String) = text.toLongOrNull()?.also { require(it in 0..5000) { "Demoras: 0 a 5000 ms" } } ?: error("Demora inválida")
        fun probability(text: String) = text.toIntOrNull()?.also { require(it in 0..100) { "Probabilidades: 0 a 100%" } } ?: error("Probabilidad inválida")
        val min = fixedLatency.takeIf { it.isNotBlank() }?.let(::duration) ?: duration(minLatency)
        val max = fixedLatency.takeIf { it.isNotBlank() }?.let(::duration) ?: duration(maxLatency)
        require(max >= min) { "Máximo menor que mínimo" }
        return NetworkProfile("Personalizado", min, max, probability(loss), probability(timeout), probability(duplication), probability(gatewayFailure), probability(apiFailure), duration(serverDelay))
    }
    fun lookup() = action {
        recipient = engine.resolve(alias)
        require(recipient != null) { "Alias inexistente" }
        refresh(); lastBalanceKind = "Consultado recientemente · motor local"
        notice = "Alias ficticio resuelto por el directorio local: ${recipient!!.holder}, ${recipient!!.bank}."
    }
    private fun action(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        viewModelScope.launch {
            try { block() } catch (e: Exception) { if (displayedState == "SUBMITTED") displayedState = "PENDING" else if (displayedState == "PREPARING") displayedState = "ERROR"; notice = e.message ?: "Error del laboratorio local" }
            finally { busy = false }
        }
    }
    private suspend fun <T> transit(phase: String, p: NetworkProfile, rng: Random, expectedId: String? = null, action: () -> T): Pair<T?, Boolean> {
        val start = SystemClock.elapsedRealtime()
        var artificial = 0L
        suspend fun stage(name: String, wait: Long = 0) {
            emit(name, "IN_PROGRESS", phase)
            if (wait > 0) { delay(wait); artificial += wait }
            emit(name, "COMPLETED", phase, artificial = wait)
        }
        fun chance(percent: Int) = rng.nextInt(100) < percent
        emit("PASA Lab", "COMPLETED", "$phase · mensaje virtual compacto; nunca se envía a telefonía")
        val latency = if (p.maxMs == p.minMs) p.minMs else rng.nextLong(p.minMs, p.maxMs + 1)
        stage("USSD Virtual", latency / 2)
        if (chance(p.loss) || chance(p.timeout)) {
            emit("USSD Virtual", "TIMEOUT", "Inyección antes del gateway; el cliente conserva resultado desconocido")
            artificialMs = artificial; softwareMs = (SystemClock.elapsedRealtime() - start - artificial).coerceAtLeast(0)
            return null to true
        }
        stage("Gateway", 0)
        if (chance(p.gatewayFail)) { emit("Gateway", "ERROR", "Falla artificial; no llegó a la API"); error("Gateway virtual indisponible") }
        stage("API PASA", p.serverMs)
        if (chance(p.apiFail)) { emit("API PASA", "ERROR", "Falla artificial antes de la transacción"); error("API virtual indisponible") }
        emit("Banco Alfa", "IN_PROGRESS", "Motor SQLite local")
        val processingStart = SystemClock.elapsedRealtime()
        val result = withContext(Dispatchers.IO) { action() }
        val execution = SystemClock.elapsedRealtime() - processingStart
        emit("Banco Alfa", "COMPLETED", "Acción del motor local", actual = execution)
        emit("Banco Beta", if (result is LabOperation && result.state == "REJECTED") "ERROR" else "COMPLETED", "Resultado ficticio: ${if (result is LabOperation) result.state else "consultado"}. En EXECUTE, débito y crédito forman una transacción SQLite; el tiempo de esa única transacción se registra en Banco Alfa.")
        if (chance(p.duplicate)) {
            withContext(Dispatchers.IO) { action() }
            emit("Gateway", "COMPLETED", "Mensaje duplicado artificialmente; misma operación, sin segundo débito")
        }
        stage("Respuesta virtual", latency - latency / 2)
        artificialMs = artificial
        softwareMs = (SystemClock.elapsedRealtime() - start - artificial).coerceAtLeast(0)
        if (phase == "EXECUTE" && p.loseConfirmation) {
            emit("Confirmación", "TIMEOUT", "Se perdió la respuesta después del procesamiento. Consultá el estado por ID.")
            return result to true
        }
        if (result is LabOperation) {
            val router = VirtualResponseRouter(expectedId ?: result.id)
            if (reorder && inject) {
                val staleId = "SIMULATED-STALE-${UUID.randomUUID()}"
                check(!router.accepts(staleId))
                emit("Gateway", "COMPLETED", "Inyección de respuesta con otro ID recibida fuera de orden; el router la descartó.")
            }
            if (!router.accepts(result.id)) {
                emit("Confirmación", "ERROR", "Se descartó una respuesta cuyo ID no corresponde a esta operación")
                return null to true
            }
        }
        emit("Confirmación", "COMPLETED", phase)
        return result to false
    }
    fun prepare() = action {
        val cents = parseLabAmount(amount) ?: error("Importe inválido. Usá pesos con hasta dos decimales, sin separador de miles.")
        val p = configured(); val rng = Random(seed.toIntOrNull() ?: error("Semilla entera requerida"))
        events = emptyList(); displayedState = "PREPARING"; prepared = null
        // The source balance is never provided by the screen as an authorization input.
        val key = UUID.randomUUID().toString()
        val (result, pending) = transit("PREPARE", p, rng) { engine.prepare(sourceId, alias, cents, key) }
        if (pending || result == null) { displayedState = "PREPARE_TIMEOUT"; notice = "Preparación sin confirmación. No se ejecutó transferencia. Podés consultar nuevamente."; return@action }
        prepared = result; recipient = engine.accounts().single { it.id == result.destinationId }
        refresh(); displayedState = result.state; lastBalanceKind = "Consultado recientemente · motor local"
        notice = "Revisá destinatario, cuenta e importe. La autorización experimental vence en 2 minutos."
    }
    fun execute() = action {
        val op = prepared ?: error("Primero prepará la operación")
        val p = configured(); val rng = Random((seed.toIntOrNull() ?: error("Semilla entera requerida")) xor 0x4153)
        displayedState = "SUBMITTED"
        val (result, pending) = transit("EXECUTE", p, rng, expectedId = op.id) { engine.execute(op) }
        displayedState = if (pending) "PENDING" else result?.state ?: "PENDING"
        if (pending) { lastBalanceKind = "Último conocido · resultado pendiente; consultá por ID"; notice = "Resultado pendiente. Consultá por ID ${op.id}; no generes otra operación." }
        else { refresh(); lastBalanceKind = "Confirmado tras operación · motor local"; notice = result?.reason?.ifBlank { "Comprobante ficticio · ${result.state}" } ?: "Pendiente" }
    }
    fun queryStatus() = action {
        val op = prepared ?: error("No hay ID de operación preparado")
        val result = engine.status(op.id)
        displayedState = result.state; refresh()
        lastBalanceKind = "Consultado por ID · motor local"
        emit("Consulta por ID", "COMPLETED", "${result.id}: ${result.state}")
        notice = "Estado del motor local: ${result.state}. Reintentar la misma autorización no duplica el pago."
    }
    fun cancelPrepared() = action {
        val op = prepared ?: error("No hay preparación")
        engine.cancel(op.id); prepared = null; recipient = null; displayedState = "NOT_STARTED"; refresh()
        notice = "Preparación cancelada sin movimiento de dinero ficticio."
    }
    fun newTransfer() = action {
        require(displayedState in listOf("ACCREDITED", "REJECTED", "EXPIRED"))
        prepared = null; recipient = null; displayedState = "NOT_STARTED"
    }
    fun refreshBalances() = action { refresh(); lastBalanceKind = "Consultado recientemente · motor local" }
    fun toggleBeta(value: Boolean) = action { engine.setBetaAvailable(value); betaAvailable = value; notice = "Disponibilidad ficticia de Banco Beta: $value" }
    fun reset() = action {
        engine.reset(); refresh(); prepared = null; recipient = null; events = emptyList(); displayedState = "NOT_STARTED"; betaAvailable = true
        loadSummary = ""; loadTimes = emptyList(); lastBalanceKind = "Restablecido al estado ficticio inicial"
        notice = "Laboratorio local reiniciado; los laboratorios web/remoto no se modificaron."
    }
    fun createAccount(alias: String, holder: String, bank: String) = action { engine.createAccount(alias, holder, bank); refresh(); notice = "Cuenta ficticia creada con saldo cero." }
    fun load(count: Int) = action {
        require(count in listOf(10, 50, 100, 1000))
        require(displayedState != "PENDING") { "Resolvé primero la operación pendiente" }
        events = emptyList()
        var accepted = 0; var rejected = 0
        val elapsed = withContext(Dispatchers.IO) {
            val samples = mutableListOf<Long>()
            repeat(count) {
                val start = System.nanoTime()
                val op = engine.prepare(sourceId, "kiosco.pepito", 100, UUID.randomUUID().toString())
                if (engine.execute(op).state == "ACCREDITED") accepted++ else rejected++
                samples.add((System.nanoTime() - start) / 1_000_000)
            }
            samples
        }
        loadTimes = elapsed; refresh()
        val sorted = elapsed.sorted(); fun percentile(p: Double) = sorted[(kotlin.math.ceil(sorted.size * p).toInt() - 1).coerceAtLeast(0)]
        val total = elapsed.sum()
        loadSummary = "$count operaciones ficticias de $1 · aprobadas $accepted · rechazadas $rejected · pendientes 0\nSoftware real SQLite: promedio ${elapsed.average().toLong()} ms · mediana ${percentile(.5)} ms · P95 ${percentile(.95)} ms · P99 ${percentile(.99)} ms${if (count < 100) " (muestra insuficiente para inferir cola P99)" else " (descriptivo de esta muestra)"}\nMín ${sorted.first()} ms · máx ${sorted.last()} ms · ${if (total > 0) count * 1000 / total else 0} op/s · fallas ${rejected * 100 / count}%\nCarga directa al motor local, sin demoras artificiales ni telefonía. No es un benchmark de USSD."
        emit("Carga local", "COMPLETED", "$count operaciones; sin solicitudes a operadoras")
        notice = "Carga terminada. Se modificaron los saldos ficticios. Podés reiniciar el laboratorio."
        lastBalanceKind = "Confirmado tras carga · motor local"
    }
    fun export(): String = JSONObject().apply {
        put("mode", "LOCAL_SIMULATION_INDEPENDENT"); put("currency", "ARS"); put("softwareMs", softwareMs); put("artificialMs", artificialMs)
        put("observedProfile", "Valores reportados por fundador: 190, 300 habitual, 436 documentado, 1350 pico, 1915 máximo ms; no distribución estadística")
        put("accounts", JSONArray().apply { accounts.forEach { a -> put(JSONObject().apply { put("id", a.id); put("alias", a.alias); put("holder", a.holder); put("bank", a.bank); put("balanceCents", a.balance) }) } })
        put("operations", JSONArray().apply { operations.forEach { o -> put(JSONObject().apply { put("id", o.id); put("sourceId", o.sourceId); put("destinationId", o.destinationId); put("amountCents", o.amountCents); put("state", o.state); put("reason", o.reason) }) } })
        put("events", JSONArray().apply { events.forEach { e -> put(JSONObject().apply { put("stage", e.stage); put("state", e.state); put("timestamp", e.at); put("softwareMs", e.softwareMs); put("artificialMs", e.artificialMs); put("detail", e.detail) }) } })
        put("loadSoftwareMs", JSONArray(loadTimes)); put("privacy", "Sin credenciales, autorizaciones ni datos telefónicos")
    }.toString(2)
    override fun onCleared() { store.close(); super.onCleared() }
}
