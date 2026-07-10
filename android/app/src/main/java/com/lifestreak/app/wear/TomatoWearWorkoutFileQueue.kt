package com.lifestreak.app.wear

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

internal object TomatoWearWorkoutFileQueue {
    const val PAYLOAD_DIRECTORY = "wear-route-payloads"
    private const val QUEUE_PREFS = "tomato_wear_workout_queue"
    private const val QUEUE_KEY = "pending_payloads"
    private const val MAX_PAYLOAD_BYTES = 8 * 1024 * 1024
    private const val MAX_QUEUE_SIZE = 20
    private val transferIdPattern = Regex("^[0-9]+-[0-9]+-[a-f0-9]{64}$")
    private val sha256Pattern = Regex("^[a-f0-9]{64}$")

    data class Entry(
        val id: String,
        val fileName: String,
        val queuedAt: Long,
        val byteLength: Long,
        val sha256: String,
    )

    private data class PayloadFile(val json: String, val byteLength: Long, val sha256: String)

    fun enqueue(
        context: Context,
        transferId: String,
        sourceFile: File,
        declaredLength: Long,
        declaredSha256: String,
    ): Boolean = synchronized(this) {
        val prefs = context.getSharedPreferences(QUEUE_PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(QUEUE_KEY, "[]") ?: "[]"
        val existing = reconcileFiles(context.filesDir, parseQueue(raw))
        val reconciled = serializeQueue(existing)
        if (raw != reconciled && !prefs.edit().putString(QUEUE_KEY, reconciled).commit()) return false
        enqueueFile(context.filesDir, existing, transferId, sourceFile, declaredLength, declaredSha256) { next ->
            prefs.edit().putString(QUEUE_KEY, serializeQueue(next)).commit()
        }
    }

    fun reconcile(context: Context): List<Entry> = synchronized(this) {
        val prefs = context.getSharedPreferences(QUEUE_PREFS, Context.MODE_PRIVATE)
        val queue = reconcileFiles(context.filesDir, parseQueue(prefs.getString(QUEUE_KEY, "[]") ?: "[]"))
        prefs.edit().putString(QUEUE_KEY, serializeQueue(queue)).commit()
        queue
    }

    fun first(context: Context): Entry? = reconcile(context).firstOrNull()

    fun acknowledge(context: Context, id: String): Boolean = synchronized(this) {
        val prefs = context.getSharedPreferences(QUEUE_PREFS, Context.MODE_PRIVATE)
        val queue = parseQueue(prefs.getString(QUEUE_KEY, "[]") ?: "[]")
        val entry = queue.firstOrNull { it.id == id } ?: return false
        if (!prefs.edit().putString(QUEUE_KEY, serializeQueue(queue.filterNot { it.id == id })).commit()) return false
        resolvePayloadFile(context.filesDir, entry.fileName)?.delete()
        true
    }

    fun readPayload(filesDir: File, entry: Entry): String? {
        val file = resolvePayloadFile(filesDir, entry.fileName) ?: return null
        return readPayloadFile(file, entry.byteLength, entry.sha256)?.json
    }

    private fun enqueueFile(
        filesDir: File,
        existing: List<Entry>,
        transferId: String,
        sourceFile: File,
        declaredLength: Long,
        declaredSha256: String,
        persist: (List<Entry>) -> Boolean,
    ): Boolean {
        if (!transferIdPattern.matches(transferId) || !sha256Pattern.matches(declaredSha256)) return false
        val source = canonicalChild(payloadDirectory(filesDir), sourceFile) ?: return false
        val incoming = readPayloadFile(source, declaredLength, declaredSha256) ?: return false
        if (stableTransferId(incoming.json, incoming.sha256) != transferId) return false
        val duplicate = existing.firstOrNull { it.id == transferId }
        if (duplicate != null) {
            val duplicateFile = resolvePayloadFile(filesDir, duplicate.fileName)
            if (duplicate.sha256 == incoming.sha256 &&
                duplicateFile != null &&
                readPayloadFile(duplicateFile, duplicate.byteLength, duplicate.sha256) != null
            ) {
                if (source != duplicateFile) source.delete()
                return true
            }
        } else if (existing.size >= MAX_QUEUE_SIZE) {
            return false
        }

        val destination = resolvePayloadFile(filesDir, "$transferId.json") ?: return false
        if (source != destination) {
            if (destination.exists() && !destination.delete()) return false
            if (!source.renameTo(destination) || !syncFile(destination)) return false
        }
        val entry = Entry(transferId, destination.name, System.currentTimeMillis(), incoming.byteLength, incoming.sha256)
        return persist(existing.filterNot { it.id == transferId } + entry)
    }

    private fun reconcileFiles(filesDir: File, persisted: List<Entry>): List<Entry> {
        val queue = persisted.distinctBy { it.id }.toMutableList()
        val knownFiles = queue.mapTo(mutableSetOf()) { it.fileName }
        payloadDirectory(filesDir).listFiles()
            ?.filter { it.isFile && it.extension == "json" && it.name !in knownFiles }
            ?.sortedBy { it.lastModified() }
            ?.forEach { file ->
                if (queue.size >= MAX_QUEUE_SIZE) return@forEach
                val id = file.nameWithoutExtension
                val sha256 = id.substringAfterLast('-', "")
                val payload = readPayloadFile(file, file.length(), sha256) ?: return@forEach
                if (stableTransferId(payload.json, payload.sha256) != id) return@forEach
                queue += Entry(id, file.name, file.lastModified().coerceAtLeast(0L), payload.byteLength, payload.sha256)
            }
        return queue
    }

    private fun readPayloadFile(file: File, expectedLength: Long, expectedSha256: String): PayloadFile? {
        if (!file.isFile || expectedLength <= 0L || expectedLength > MAX_PAYLOAD_BYTES) return null
        if (!sha256Pattern.matches(expectedSha256) || file.length() != expectedLength) return null
        return try {
            val bytes = file.readBytes()
            if (bytes.size.toLong() != expectedLength) return null
            val sha256 = sha256(bytes)
            if (sha256 != expectedSha256) return null
            val decoder = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
            val payload = decoder.decode(ByteBuffer.wrap(bytes)).toString()
            JSONObject(payload)
            PayloadFile(payload, expectedLength, sha256)
        } catch (_: Exception) {
            null
        }
    }

    private fun stableTransferId(payload: String, sha256: String): String? = try {
        val json = JSONObject(payload)
        val startedAt = json.getLong("startedAt")
        val endedAt = json.getLong("endedAt")
        if (startedAt < 0L || endedAt <= startedAt) null else "$startedAt-$endedAt-$sha256"
    } catch (_: Exception) {
        null
    }

    private fun syncFile(file: File): Boolean = try {
        RandomAccessFile(file, "rw").use { it.fd.sync() }
        true
    } catch (_: Exception) {
        false
    }

    private fun payloadDirectory(filesDir: File): File =
        File(filesDir, PAYLOAD_DIRECTORY).apply { mkdirs() }.canonicalFile

    private fun canonicalChild(directory: File, file: File): File? = try {
        file.canonicalFile.takeIf { it.parentFile == directory.canonicalFile }
    } catch (_: Exception) {
        null
    }

    private fun resolvePayloadFile(filesDir: File, fileName: String): File? {
        if (fileName.isBlank() || fileName != File(fileName).name) return null
        val directory = payloadDirectory(filesDir)
        return canonicalChild(directory, File(directory, fileName))
    }

    private fun parseQueue(raw: String): List<Entry> {
        val array = try { JSONArray(raw) } catch (_: Exception) { return emptyList() }
        return (0 until array.length()).mapNotNull { index ->
            val item = array.optJSONObject(index) ?: return@mapNotNull null
            val id = item.optString("id")
            val fileName = item.optString("fileName")
            val queuedAt = item.optLong("queuedAt", -1L)
            val byteLength = item.optLong("byteLength", -1L)
            val sha256 = item.optString("sha256")
            if (!transferIdPattern.matches(id) || fileName != "$id.json" || queuedAt < 0L || byteLength <= 0L ||
                !sha256Pattern.matches(sha256)
            ) null else Entry(id, fileName, queuedAt, byteLength, sha256)
        }
    }

    private fun serializeQueue(queue: List<Entry>): String {
        val array = JSONArray()
        queue.forEach { entry ->
            array.put(
                JSONObject()
                    .put("id", entry.id)
                    .put("fileName", entry.fileName)
                    .put("queuedAt", entry.queuedAt)
                    .put("byteLength", entry.byteLength)
                    .put("sha256", entry.sha256),
            )
        }
        return array.toString()
    }

    fun enqueueForTest(filesDir: File, queueJson: String, id: String, source: File, length: Long, sha: String): String? {
        val existing = reconcileFiles(filesDir, parseQueue(queueJson))
        var persisted = existing
        val accepted = enqueueFile(filesDir, existing, id, source, length, sha) { next -> persisted = next; true }
        return if (accepted) serializeQueue(persisted) else null
    }

    fun reconcileForTest(filesDir: File, queueJson: String): String = serializeQueue(reconcileFiles(filesDir, parseQueue(queueJson)))
    fun resolveForTest(filesDir: File, fileName: String): File? = resolvePayloadFile(filesDir, fileName)
    fun readForTest(filesDir: File, queueJson: String): String? =
        parseQueue(queueJson).firstOrNull()?.let { readPayload(filesDir, it) }

    fun acknowledgeForTest(filesDir: File, queueJson: String, id: String, accepted: Boolean): String {
        val queue = parseQueue(queueJson)
        if (!accepted) return serializeQueue(queue)
        queue.firstOrNull { it.id == id }?.let { resolvePayloadFile(filesDir, it.fileName)?.delete() }
        return serializeQueue(queue.filterNot { it.id == id })
    }

    fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString("") { "%02x".format(it) }

    fun maxPayloadBytes(): Long = MAX_PAYLOAD_BYTES.toLong()
    fun maxQueueSizeForTest(): Int = MAX_QUEUE_SIZE
}
