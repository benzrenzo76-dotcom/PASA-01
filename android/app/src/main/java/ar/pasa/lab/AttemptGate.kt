package ar.pasa.lab

/** One-shot request lifecycle. A timeout deliberately keeps the attempt active. */
class AttemptGate {
    var active: Boolean = false; private set
    var timedOut: Boolean = false; private set
    private var generation = 0
    fun start(): Int {
        check(!active)
        active = true
        timedOut = false
        return ++generation
    }
    fun accepts(id: Int) = active && id == generation
    fun timeout(id: Int): Boolean {
        if (!accepts(id) || timedOut) return false
        timedOut = true
        return true
    }
    fun finish(id: Int): Boolean {
        if (!accepts(id)) return false
        active = false
        return true
    }
}
