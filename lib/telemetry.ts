export type TelemetryEvent = {
  name: string;
  at: number;
  props?: Record<string, string | number | boolean | null>;
};

export async function track(event: TelemetryEvent) {
  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  } catch {
    // best effort
  }
}
