package ar.pasa.lab

import java.math.BigDecimal
import java.security.SecureRandom
import java.util.Base64
import java.util.UUID

const val MAX_LAB_AMOUNT = 10_000_000_000L

data class LabAccount(val id: String, var alias: String, val holder: String, val bank: String, var balance: Long)
data class LabOperation(
    val id: String, val sourceId: String, val destinationId: String, val amountCents: Long,
    val currency: String, val expiresAt: Long, val nonce: String, val authorization: String,
    val idempotencyKey: String, var state: String = "AWAITING_CONFIRMATION", var reason: String = "",
    val createdAt: Long = System.currentTimeMillis(), var completedAt: Long? = null
)
data class LabMovement(val operationId: String, val accountId: String, val delta: Long, val balanceAfter: Long)
data class LabState(
    val accounts: MutableList<LabAccount> = mutableListOf(
        LabAccount("alfa-joaquin", "joaquin.prueba", "Joaquín", "Banco Alfa", 10_000_000),
        LabAccount("beta-pepito", "kiosco.pepito", "Kiosco Pepito", "Banco Beta", 2_000_000)
    ),
    val operations: MutableList<LabOperation> = mutableListOf(),
    val movements: MutableList<LabMovement> = mutableListOf(), var betaAvailable: Boolean = true
)

/** Implementations must commit the whole block atomically, or discard all changes on error. */
interface LabStore { fun <T> transaction(block: (LabState) -> T): T; fun reset() }

class FinancialEngine(private val store: LabStore, private val now: () -> Long = System::currentTimeMillis) {
    fun accounts() = store.transaction { s -> s.accounts.map { it.copy() } }
    fun operations() = store.transaction { s -> s.operations.map { it.copy() } }
    fun movements() = store.transaction { s -> s.movements.toList() }
    fun balance(id: String) = store.transaction { s -> s.accounts.single { it.id == id }.balance }
    fun resolve(alias: String) = store.transaction { s -> s.accounts.singleOrNull { it.alias == alias.trim().lowercase() }?.copy() }
    fun status(id: String) = store.transaction { s -> s.operations.single { it.id == id }.copy() }
    fun cancel(id: String): LabOperation = store.transaction { s ->
        val op = s.operations.single { it.id == id }
        require(op.state == "AWAITING_CONFIRMATION") { "Sólo se cancela una preparación sin ejecutar" }
        op.state = "CANCELLED"; op.copy()
    }
    fun reset() = store.reset()
    fun isBetaAvailable() = store.transaction { it.betaAvailable }
    fun setBetaAvailable(available: Boolean) = store.transaction { it.betaAvailable = available }
    fun changeAlias(id: String, alias: String) = store.transaction { s ->
        require(alias.matches(Regex("[a-z0-9.]{3,40}"))) { "Alias inválido" }
        require(s.accounts.none { it.alias == alias && it.id != id }) { "Alias existente" }
        s.accounts.single { it.id == id }.alias = alias
    }
    fun createAccount(alias: String, holder: String, bank: String) = store.transaction { s ->
        require(alias.matches(Regex("[a-z0-9.]{3,40}")) && holder.length in 1..60 && bank in listOf("Banco Alfa", "Banco Beta"))
        require(s.accounts.none { it.alias == alias }) { "Alias existente" }
        // New accounts start at zero; only the explicit reset recreates the seed balances.
        val a = LabAccount(UUID.randomUUID().toString(), alias, holder, bank, 0)
        s.accounts.add(a); a.copy()
    }
    fun prepare(sourceId: String, alias: String, amountCents: Long, key: String): LabOperation = store.transaction { s ->
        require(amountCents in 1..MAX_LAB_AMOUNT && key.length in 1..100) { "Importe o clave inválidos" }
        val destination = s.accounts.singleOrNull { it.alias == alias.trim().lowercase() } ?: error("Alias inexistente")
        val source = s.accounts.singleOrNull { it.id == sourceId } ?: error("Emisor inexistente")
        require(source.id != destination.id) { "Elegí otra cuenta" }
        s.operations.singleOrNull { it.idempotencyKey == key }?.let {
            require(it.sourceId == sourceId && it.destinationId == destination.id && it.amountCents == amountCents) { "Clave reutilizada con otros datos" }
            return@transaction it.copy()
        }
        val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val op = LabOperation(UUID.randomUUID().toString(), source.id, destination.id, amountCents, "ARS",
            now() + 120_000, UUID.randomUUID().toString(), Base64.getUrlEncoder().withoutPadding().encodeToString(bytes), key, createdAt = now())
        s.operations.add(op)
        op.copy()
    }
    fun execute(request: LabOperation): LabOperation = store.transaction { s ->
        val op = s.operations.singleOrNull { it.id == request.id } ?: error("Operación inexistente")
        require(op.sourceId == request.sourceId && op.destinationId == request.destinationId &&
            op.amountCents == request.amountCents && op.currency == request.currency && op.expiresAt == request.expiresAt &&
            op.nonce == request.nonce && java.security.MessageDigest.isEqual(op.authorization.toByteArray(), request.authorization.toByteArray())) { "Autorización inválida o datos alterados" }
        // Identical retries return the immutable receipt; no second debit and no generic reusable approval.
        if (op.state in listOf("ACCREDITED", "REJECTED", "EXPIRED", "CANCELLED")) return@transaction op.copy()
        check(op.state == "AWAITING_CONFIRMATION") { "Transición inválida" }
        if (now() >= op.expiresAt) { op.state = "EXPIRED"; op.reason = "Autorización vencida"; return@transaction op.copy() }
        op.state = "SUBMITTED"
        val source = s.accounts.single { it.id == op.sourceId }
        val destination = s.accounts.single { it.id == op.destinationId }
        when {
            !s.betaAvailable && (source.bank == "Banco Beta" || destination.bank == "Banco Beta") -> { op.state = "REJECTED"; op.reason = "Banco Beta simulado indisponible" }
            source.balance < op.amountCents -> { op.state = "REJECTED"; op.reason = "Fondos insuficientes" }
            else -> {
                val credit = Math.addExact(destination.balance, op.amountCents)
                source.balance -= op.amountCents
                destination.balance = credit
                s.movements.add(LabMovement(op.id, source.id, -op.amountCents, source.balance))
                s.movements.add(LabMovement(op.id, destination.id, op.amountCents, destination.balance))
                op.state = "ACCREDITED"
            }
        }
        op.completedAt = now()
        op.copy()
    }
}

fun parseLabAmount(input: String): Long? {
    val normalized = input.trim().replace(',', '.')
    if (!normalized.matches(Regex("[0-9]{1,10}(\\.[0-9]{1,2})?"))) return null
    return try { BigDecimal(normalized).movePointRight(2).longValueExact().takeIf { it in 1..MAX_LAB_AMOUNT } } catch (_: ArithmeticException) { null }
}
fun labMoney(cents: Long): String = "$ " + java.text.NumberFormat.getNumberInstance(java.util.Locale.forLanguageTag("es-AR")).apply {
    minimumFractionDigits = 2; maximumFractionDigits = 2
}.format(BigDecimal.valueOf(cents, 2)) + " ARS"

/** Routes virtual responses only; this class never invokes Android telephony. */
class VirtualResponseRouter(private val expectedOperationId: String) {
    fun accepts(incomingOperationId: String) = incomingOperationId == expectedOperationId
}
