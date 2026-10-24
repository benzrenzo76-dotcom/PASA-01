package ar.pasa.lab

// Only fixed metadata is exportable; arbitrary carrier strings never enter this model.
data class Diagnostic(
    val state: String = "NOT_STARTED",
    val durationMs: Long = 0,
    val errorCode: Int? = null,
    val apiLevel: Int = 0,
    val airplaneMode: Boolean = false,
    val wifi: Boolean = false,
    val cellularData: Boolean = false,
    val validatedInternet: Boolean = false,
    val serviceState: Int? = null,
    val simSlot: Int? = null
) {
    fun export(): String = """
        {"experiment":"PASA-01","transport":"REAL_USSD","state":"$state",
        "durationMs":$durationMs,"errorCode":$errorCode,"apiLevel":$apiLevel,
        "airplaneMode":$airplaneMode,"wifi":$wifi,"cellularData":$cellularData,
        "validatedInternet":$validatedInternet,"serviceState":$serviceState,"simSlot":$simSlot,
        "privacy":"Code, response, phone numbers and subscription identifiers excluded"}
    """.trimIndent()
}

fun validCode(code: String): Boolean = code.length in 2..182 &&
    code.first() in "*#" && code.last() == '#' && code.all { it in "0123456789*#" }
