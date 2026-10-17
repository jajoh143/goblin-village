export interface PlayerResources {
  wood: number;
  stone: number;
}

export type HireKind = 'warrior' | 'archer' | 'mage';
export type WorkerKind = 'woodcutter' | 'miner';

export interface WeaponUpgradeLevels {
  sword: number;
  bow: number;
  staff: number;
}

export type PlayerProgress = PlayerResources;

const STORAGE_KEY = 'goblin-village.resources';
const EMPTY_PROGRESS: PlayerProgress = {
  wood: 0,
  stone: 0,
};

const asResourceCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function loadProgress(): PlayerProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(stored) as Partial<PlayerProgress>;
    return {
      wood: asResourceCount(parsed.wood),
      stone: asResourceCount(parsed.stone),
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        wood: asResourceCount(progress.wood),
        stone: asResourceCount(progress.stone),
      }),
    );
  } catch {
    // The game remains playable when storage is disabled or unavailable.
  }
}

export function loadResources(): PlayerResources {
  const { wood, stone } = loadProgress();
  return { wood, stone };
}

export function saveResources(resources: PlayerResources): void {
  saveProgress({ ...loadProgress(), ...resources });
}
