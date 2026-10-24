package ar.pasa.lab

import org.junit.Assert.*
import org.junit.Test

class AttemptGateTest {
    @Test fun timeoutRetainsPendingAndBlocksAnotherSend() {
        val gate = AttemptGate()
        val id = gate.start()
        assertTrue(gate.timeout(id))
        assertTrue(gate.active)
        assertThrows(IllegalStateException::class.java) { gate.start() }
        assertTrue(gate.finish(id))
        assertTrue(gate.timedOut)
        assertFalse(gate.active)
    }
    @Test fun duplicatesAndStaleCallbacksCannotCompleteNewAttempt() {
        val gate = AttemptGate()
        val first = gate.start()
        assertTrue(gate.finish(first))
        assertFalse(gate.finish(first))
        val second = gate.start()
        assertFalse(gate.timeout(first))
        assertFalse(gate.finish(first))
        assertTrue(gate.active)
        assertFalse(gate.timedOut)
        assertTrue(gate.finish(second))
    }
    @Test fun duplicateTimeoutDoesNotChangeOutcome() {
        val gate = AttemptGate()
        val id = gate.start()
        assertTrue(gate.timeout(id))
        assertFalse(gate.timeout(id))
        assertTrue(gate.finish(id))
        assertFalse(gate.timeout(id))
    }
}
