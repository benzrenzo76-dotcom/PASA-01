package ar.pasa.lab

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager

// No retry, no dialer fallback, no interactive-session automation.
class UssdTransport(private val context: Context) {
    data class Sim(val id: Int, val slot: Int)
    private val handler = Handler(Looper.getMainLooper())
    private val gate = AttemptGate()
    val supported: Boolean get() = context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY) &&
        (Build.VERSION.SDK_INT < 33 || context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY_RADIO_ACCESS))
    fun permitted() = context.checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED &&
        context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    @SuppressLint("MissingPermission")
    fun sims(): List<Sim> = if (!permitted()) emptyList() else
        context.getSystemService(SubscriptionManager::class.java).activeSubscriptionInfoList.orEmpty()
            .map { Sim(it.subscriptionId, it.simSlotIndex) }

    @SuppressLint("MissingPermission")
    fun send(sim: Sim, code: String, onResult: (Diagnostic, String) -> Unit) {
        check(!gate.active) { "Request already active" }
        check(supported && permitted()) { "Unsupported or permission missing" }
        require(validCode(code))
        require(sims().any { it == sim }) { "SIM no longer active" }
        val manager = context.getSystemService(TelephonyManager::class.java).createForSubscriptionId(sim.id)
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val caps = cm.getNetworkCapabilities(cm.activeNetwork)
        val base = Diagnostic(apiLevel = Build.VERSION.SDK_INT, simSlot = sim.slot + 1,
            airplaneMode = Settings.Global.getInt(context.contentResolver, Settings.Global.AIRPLANE_MODE_ON, 0) != 0,
            wifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true,
            cellularData = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true,
            validatedInternet = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true,
            serviceState = try { manager.serviceState?.state } catch (_: SecurityException) { null })
        val start = SystemClock.elapsedRealtime()
        val current = gate.start()
        fun result(state: String, text: String, error: Int? = null) {
            onResult(base.copy(state = state, durationMs = SystemClock.elapsedRealtime() - start, errorCode = error), text)
        }
        val timeout = Runnable {
            if (gate.timeout(current)) {
                result("PENDING_TIMEOUT", "Sin callback en 60 segundos. Resultado desconocido. No reenvíes: la red puede seguir procesando.")
            }
        }
        handler.postDelayed(timeout, 60_000)
        result("RUNNING", "Esperando respuesta de la red…")
        try {
            manager.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                override fun onReceiveUssdResponse(tm: TelephonyManager, request: String, response: CharSequence) {
                    if (!gate.finish(current)) return
                    handler.removeCallbacks(timeout)
                    result(if (gate.timedOut) "LATE_RESPONSE" else "RESPONSE_RECEIVED", response.toString())
                }
                override fun onReceiveUssdResponseFailed(tm: TelephonyManager, request: String, failureCode: Int) {
                    if (!gate.finish(current)) return
                    handler.removeCallbacks(timeout)
                    result(if (gate.timedOut) "LATE_FAILURE" else "CALLBACK_FAILURE", when (failureCode) {
                        TelephonyManager.USSD_RETURN_FAILURE -> "La red no completó la solicitud USSD."
                        TelephonyManager.USSD_ERROR_SERVICE_UNAVAIL -> "Servicio USSD no disponible."
                        else -> "Error USSD sin clasificación."
                    }, failureCode)
                }
            }, handler)
        } catch (e: RuntimeException) {
            gate.finish(current)
            handler.removeCallbacks(timeout)
            result(when (e) {
                is SecurityException -> "PERMISSION_ERROR"
                is UnsupportedOperationException -> "UNSUPPORTED"
                else -> "LOCAL_ERROR"
            }, "No se pudo iniciar la solicitud. Revisá permisos, SIM y soporte del dispositivo.")
        }
    }
}
