package ar.pasa.lab

import org.junit.Assert.*
import org.junit.Test

class DiagnosticTest {
    @Test fun rejectsInvalidAndOversizedInput() {
        listOf("", "123", "*12#;", "tel:*12#", "*a#", "*" + "1".repeat(181) + "#").forEach { assertFalse(validCode(it)) }
        // Synthetic syntax only: this value must never be sent to an operator.
        assertTrue(validCode("*" + "0".repeat(180) + "#"))
    }
    @Test fun exportContainsOnlyDiagnosticMetadata() {
        val report = Diagnostic(state = "PENDING_TIMEOUT", durationMs = 60000, apiLevel = 35).export()
        assertTrue(report.contains("PENDING_TIMEOUT"))
        assertTrue(report.contains("60000"))
        assertFalse(report.contains("subscriptionId"))
        assertFalse(report.contains("\"response\":"))
        assertFalse(report.contains("\"code\":"))
    }
}
