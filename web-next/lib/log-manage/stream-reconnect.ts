export const STREAM_RECONNECT_DELAY_MS = 5000;

export function resolveStreamReconnectDelayMs({
  reconnectAt,
  now = Date.now()
}: {
  reconnectAt: number | null;
  now?: number;
}) {
  if (reconnectAt == null) {
    return null;
  }

  return Math.max(0, reconnectAt - now);
}

export function resolveStreamReconnectSeconds({
  reconnectAt,
  now = Date.now()
}: {
  reconnectAt: number | null;
  now?: number;
}) {
  const delayMs = resolveStreamReconnectDelayMs({ reconnectAt, now });
  if (delayMs == null) {
    return null;
  }

  return Math.max(0, Math.ceil(delayMs / 1000));
}
