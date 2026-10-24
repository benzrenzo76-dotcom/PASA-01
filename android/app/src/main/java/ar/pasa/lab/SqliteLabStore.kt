package ar.pasa.lab

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/** The authoritative LOCAL laboratory: all accounts and postings commit together in SQLite. */
class SqliteLabStore(context: Context) : SQLiteOpenHelper(context, "pasa-financial-local-v1.db", null, 1), LabStore {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE ledger (id INTEGER PRIMARY KEY CHECK(id=1), snapshot TEXT NOT NULL)")
        db.execSQL("INSERT INTO ledger(id,snapshot) VALUES(1,?)", arrayOf(encode(LabState())))
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = error("Explicit migration required")
    @Synchronized override fun <T> transaction(block: (LabState) -> T): T {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val state = db.rawQuery("SELECT snapshot FROM ledger WHERE id=1", null).use { c -> check(c.moveToFirst()); decode(c.getString(0)) }
            val result = block(state)
            db.execSQL("UPDATE ledger SET snapshot=? WHERE id=1", arrayOf(encode(state)))
            db.setTransactionSuccessful()
            return result
        } finally { db.endTransaction() }
    }
    @Synchronized override fun reset() {
        val db = writableDatabase
        db.beginTransaction()
        try { db.execSQL("UPDATE ledger SET snapshot=? WHERE id=1", arrayOf(encode(LabState()))); db.setTransactionSuccessful() }
        finally { db.endTransaction() }
    }
    private fun encode(s: LabState): String = JSONObject().apply {
        put("betaAvailable", s.betaAvailable)
        put("accounts", JSONArray().apply { s.accounts.forEach { a -> put(JSONObject().apply {
            put("id", a.id); put("alias", a.alias); put("holder", a.holder); put("bank", a.bank); put("balance", a.balance)
        }) } })
        put("operations", JSONArray().apply { s.operations.forEach { o -> put(JSONObject().apply {
            put("id", o.id); put("sourceId", o.sourceId); put("destinationId", o.destinationId); put("amountCents", o.amountCents)
            put("currency", o.currency); put("expiresAt", o.expiresAt); put("nonce", o.nonce); put("authorization", o.authorization)
            put("idempotencyKey", o.idempotencyKey); put("state", o.state); put("reason", o.reason); put("createdAt", o.createdAt)
            put("completedAt", o.completedAt ?: JSONObject.NULL)
        }) } })
        put("movements", JSONArray().apply { s.movements.forEach { m -> put(JSONObject().apply {
            put("operationId", m.operationId); put("accountId", m.accountId); put("delta", m.delta); put("balanceAfter", m.balanceAfter)
        }) } })
    }.toString()
    private fun decode(raw: String): LabState {
        val root = JSONObject(raw)
        val accounts = root.getJSONArray("accounts").let { arr -> (0 until arr.length()).map { i -> arr.getJSONObject(i).let {
            LabAccount(it.getString("id"), it.getString("alias"), it.getString("holder"), it.getString("bank"), it.getLong("balance"))
        } }.toMutableList() }
        val operations = root.getJSONArray("operations").let { arr -> (0 until arr.length()).map { i -> arr.getJSONObject(i).let {
            LabOperation(it.getString("id"), it.getString("sourceId"), it.getString("destinationId"), it.getLong("amountCents"),
                it.getString("currency"), it.getLong("expiresAt"), it.getString("nonce"), it.getString("authorization"), it.getString("idempotencyKey"),
                it.getString("state"), it.getString("reason"), it.getLong("createdAt"), if (it.isNull("completedAt")) null else it.getLong("completedAt"))
        } }.toMutableList() }
        val movements = root.getJSONArray("movements").let { arr -> (0 until arr.length()).map { i -> arr.getJSONObject(i).let {
            LabMovement(it.getString("operationId"), it.getString("accountId"), it.getLong("delta"), it.getLong("balanceAfter"))
        } }.toMutableList() }
        return LabState(accounts, operations, movements, root.getBoolean("betaAvailable"))
    }
}
