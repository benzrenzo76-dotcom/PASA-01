package ar.pasa.lab

import org.junit.Assert.*
import org.junit.Test
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors

/** These execute the production domain with a rollback-capable memory store.
 * They do not claim to execute Android SQLite on a physical device. */
private class TransactionalTestStore : LabStore {
    private var state = LabState()
    @Synchronized override fun <T> transaction(block: (LabState) -> T): T {
        val copy = LabState(state.accounts.map { it.copy() }.toMutableList(), state.operations.map { it.copy() }.toMutableList(), state.movements.toMutableList(), state.betaAvailable)
        val result = block(copy)
        state = copy
        return result
    }
    @Synchronized override fun reset() { state = LabState() }
}
class FinancialEngineTest {
    private val source = "alfa-joaquin"
    private fun engine() = FinancialEngine(TransactionalTestStore())
    private fun prepare(e: FinancialEngine, amount: Long = 500_000) = e.prepare(source, "kiosco.pepito", amount, UUID.randomUUID().toString())
    @Test fun canonicalFiveThousandTransferMovesRealLedgerAndConservesTotal() {
        val e = engine(); val op = prepare(e)
        assertEquals("ACCREDITED", e.execute(op).state)
        assertEquals(9_500_000, e.balance(source))
        assertEquals(2_500_000, e.balance("beta-pepito"))
        assertEquals(12_000_000, e.accounts().sumOf { it.balance })
        assertEquals(2, e.movements().size)
    }
    @Test fun rejectsOverspendWithoutAnyPosting() {
        val e = engine(); assertEquals("REJECTED", e.execute(prepare(e, 15_000_000)).state)
        assertEquals(10_000_000, e.balance(source)); assertTrue(e.movements().isEmpty())
    }
    @Test fun simultaneousSixtyThousandCannotBothAccredit() {
        val e = engine(); val a = prepare(e, 6_000_000); val b = prepare(e, 6_000_000)
        val executor = Executors.newFixedThreadPool(2)
        try {
            val states = executor.invokeAll(listOf(Callable { e.execute(a).state }, Callable { e.execute(b).state })).map { it.get() }
            assertEquals(1, states.count { it == "ACCREDITED" }); assertEquals(1, states.count { it == "REJECTED" })
            assertEquals(4_000_000, e.balance(source)); assertEquals(12_000_000, e.accounts().sumOf { it.balance })
        } finally { executor.shutdownNow() }
    }
    @Test fun duplicateConcurrentAuthorizationAndLostResponseProduceOneReceipt() {
        val e = engine(); val op = prepare(e)
        val executor = Executors.newFixedThreadPool(4)
        try {
            val results = executor.invokeAll((1..8).map { Callable { e.execute(op) } }).map { it.get() }
            assertTrue(results.all { it.state == "ACCREDITED" && it.id == op.id })
            // Discarding all simulated responses cannot change the authoritative status.
            assertEquals("ACCREDITED", e.status(op.id).state)
            assertEquals(9_500_000, e.balance(source)); assertEquals(2, e.movements().size)
        } finally { executor.shutdownNow() }
    }
    @Test fun tokenBindsEveryAuthorizationFieldAndCannotAuthorizeAnotherOperation() {
        val e = engine(); val op = prepare(e); val other = prepare(e)
        listOf(op.copy(amountCents = 1), op.copy(destinationId = source), op.copy(sourceId = "beta-pepito"),
            op.copy(currency = "USD"), op.copy(expiresAt = op.expiresAt + 1), op.copy(nonce = "forged"),
            op.copy(authorization = "forged"), other.copy(authorization = op.authorization)).forEach { altered ->
            assertThrows(IllegalArgumentException::class.java) { e.execute(altered) }
        }
        assertEquals(10_000_000, e.balance(source)); assertTrue(e.movements().isEmpty())
    }
    @Test fun expiryAndInvalidAmountsNeverPost() {
        var now = 1000L; val e = FinancialEngine(TransactionalTestStore()) { now }
        val op = prepare(e); now = op.expiresAt
        assertEquals("EXPIRED", e.execute(op).state)
        listOf(0L, -1L, MAX_LAB_AMOUNT + 1).forEach { amount -> assertThrows(IllegalArgumentException::class.java) { prepare(e, amount) } }
        assertTrue(e.movements().isEmpty())
    }
    @Test fun aliasChangeDoesNotSilentlyRedirectPreparedPayment() {
        val e = engine(); val op = prepare(e)
        e.changeAlias("beta-pepito", "nuevo.kiosco")
        val extra = e.createAccount("kiosco.pepito", "Otro titular ficticio", "Banco Beta")
        assertEquals("ACCREDITED", e.execute(op).state)
        assertEquals(2_500_000, e.balance("beta-pepito")); assertEquals(0, e.balance(extra.id))
    }
    @Test fun fakeFrontendBalanceCannotOverrideLedgerAndBetaOutagePreservesMoney() {
        val e = engine(); val fake = e.accounts().first(); fake.balance = 100_000_000
        assertEquals("REJECTED", e.execute(prepare(e, 15_000_000)).state)
        e.setBetaAvailable(false)
        assertEquals("REJECTED", e.execute(prepare(e)).state)
        assertEquals(12_000_000, e.accounts().sumOf { it.balance }); assertTrue(e.movements().isEmpty())
    }
    @Test fun idempotencyKeyCannotChangePayload() {
        val e = engine(); val first = e.prepare(source, "kiosco.pepito", 500_000, "same-key")
        assertEquals(first.id, e.prepare(source, "kiosco.pepito", 500_000, "same-key").id)
        assertThrows(IllegalArgumentException::class.java) { e.prepare(source, "kiosco.pepito", 400_000, "same-key") }
        assertEquals(1, e.operations().size)
    }
    @Test fun cancelledPreparationCannotDebitAndRouterDiscardsOtherOperation() {
        val e = engine(); val op = prepare(e)
        assertEquals("CANCELLED", e.cancel(op.id).state)
        assertEquals("CANCELLED", e.execute(op).state)
        assertTrue(e.movements().isEmpty())
        val router = VirtualResponseRouter(op.id)
        assertFalse(router.accepts("previous-operation")); assertTrue(router.accepts(op.id))
    }
    @Test fun parsingNeverUsesFloatingMoneyAndRejectsAmbiguousThousands() {
        assertEquals(500_000L, parseLabAmount("5000"))
        assertEquals(123L, parseLabAmount("1,23"))
        listOf("5.000,00", "1.234", "1e6", "NaN", "-1", "0", "99999999999999999999").forEach { assertNull(parseLabAmount(it)) }
    }
}
