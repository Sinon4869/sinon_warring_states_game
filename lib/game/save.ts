import type { CampaignState } from '@/lib/game/types';

export type SaveEnvelopeV2 = {
  version: 2;
  slot: string;
  savedAt: number;
  payload: CampaignState;
  checksum: string;
};

function hash(input: string) {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function packSave(slot: string, payload: CampaignState): SaveEnvelopeV2 {
  const body = JSON.stringify({ version: 2, slot, savedAt: Date.now(), payload });
  const parsed = JSON.parse(body) as Omit<SaveEnvelopeV2, 'checksum'>;
  return { ...parsed, checksum: hash(body) };
}

export function unpackSave(raw: string): CampaignState | null {
  try {
    const data = JSON.parse(raw) as Partial<SaveEnvelopeV2> & CampaignState;

    // migrate v1 plain payload
    if (typeof data.version === 'undefined' && typeof (data as CampaignState).turn === 'number') {
      return data as CampaignState;
    }

    if (data.version !== 2 || !data.payload || typeof data.checksum !== 'string') return null;
    const body = JSON.stringify({ version: 2, slot: data.slot, savedAt: data.savedAt, payload: data.payload });
    if (hash(body) !== data.checksum) return null;
    return data.payload;
  } catch {
    return null;
  }
}
