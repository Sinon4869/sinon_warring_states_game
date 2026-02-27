export type AssetTier = 'high' | 'mid' | 'low';

export type AssetEntry = {
  id: string;
  kind: 'unit' | 'fx' | 'audio';
  src: string;
  fallbackSrc?: string;
  tier?: AssetTier;
};

export type AssetManifest = {
  version: string;
  entries: AssetEntry[];
};

const DEFAULT_MANIFEST: AssetManifest = {
  version: 'v1',
  entries: [
    { id: 'unit-infantry', kind: 'unit', src: '/assets/units/infantry.svg', fallbackSrc: '/assets/units/fallback.svg', tier: 'low' },
    { id: 'unit-cavalry', kind: 'unit', src: '/assets/units/cavalry.svg', fallbackSrc: '/assets/units/fallback.svg', tier: 'mid' },
    { id: 'fx-hit', kind: 'fx', src: '/assets/fx/hit.webp', fallbackSrc: '/assets/fx/hit-fallback.svg', tier: 'mid' },
    { id: 'fx-core', kind: 'fx', src: '/assets/fx/core.webp', fallbackSrc: '/assets/fx/core-fallback.svg', tier: 'high' },
    { id: 'audio-hit', kind: 'audio', src: '/assets/audio/hit.mp3', tier: 'low' }
  ]
};

export function detectAssetTier(): AssetTier {
  if (typeof window === 'undefined') return 'mid';
  const width = window.innerWidth;
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (width < 420 || dm <= 2) return 'low';
  if (width > 1200 && dm >= 8) return 'high';
  return 'mid';
}

export async function loadManifest(): Promise<AssetManifest> {
  try {
    const res = await fetch('/assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_MANIFEST;
    const data = (await res.json()) as AssetManifest;
    if (!data.entries?.length) return DEFAULT_MANIFEST;
    return data;
  } catch {
    return DEFAULT_MANIFEST;
  }
}

export function selectAssets(manifest: AssetManifest, tier: AssetTier) {
  const order: Record<AssetTier, number> = { low: 0, mid: 1, high: 2 };
  return manifest.entries.filter((x) => !x.tier || order[x.tier] <= order[tier]);
}

export async function preloadAssets(entries: AssetEntry[]) {
  await Promise.all(
    entries.map(async (asset) => {
      if (asset.kind === 'audio') {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = asset.src;
        return;
      }

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          if (asset.fallbackSrc) {
            const fallback = new Image();
            fallback.onload = () => resolve();
            fallback.onerror = () => resolve();
            fallback.src = asset.fallbackSrc;
            return;
          }
          resolve();
        };
        img.src = asset.src;
      });
    })
  );
}
