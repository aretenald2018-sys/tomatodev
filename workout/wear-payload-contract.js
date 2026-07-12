export const WEAR_WORKOUT_PAYLOAD_VERSION = 1;
export const LEGACY_WEAR_WORKOUT_PAYLOAD_VERSION = 0;

export function readWearWorkoutPayloadVersion(payload = {}) {
  const raw = payload.payloadVersion;
  if (raw == null || raw === '') return LEGACY_WEAR_WORKOUT_PAYLOAD_VERSION;
  const version = Number(raw);
  if (!Number.isSafeInteger(version) || version < 0) throw new Error('wear payloadVersion must be a non-negative integer');
  if (version > WEAR_WORKOUT_PAYLOAD_VERSION) {
    throw new Error(`unsupported wear payloadVersion: ${version}`);
  }
  return version;
}

export function assertWearWorkoutPayloadEnvelope(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('wear payload must be an object');
  const payloadVersion = readWearWorkoutPayloadVersion(payload);
  if (payload.type !== 'running') throw new Error('unsupported wear workout type');
  return { payloadVersion, type: payload.type };
}
