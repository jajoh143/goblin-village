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

export interface PlayerProgress extends PlayerResources {
  weaponUpgrades: WeaponUpgradeLevels;
  hiredGoblin?: HireKind;
  hiredWorkers: WorkerKind[];
}

const STORAGE_KEY = 'goblin-village.resources';
const EMPTY_PROGRESS: PlayerProgress = {
  wood: 0,
  stone: 0,
  weaponUpgrades: { sword: 0, bow: 0, staff: 0 },
  hiredWorkers: [],
};

const asResourceCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const isHireKind = (value: unknown): value is HireKind =>
  value === 'warrior' || value === 'archer' || value === 'mage';

const isWorkerKind = (value: unknown): value is WorkerKind =>
  value === 'woodcutter' || value === 'miner';

export function loadProgress(): PlayerProgress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {
      ...EMPTY_PROGRESS,
      weaponUpgrades: { ...EMPTY_PROGRESS.weaponUpgrades },
      hiredWorkers: [],
    };
    const parsed = JSON.parse(stored) as Partial<PlayerProgress>;
    return {
      wood: asResourceCount(parsed.wood),
      stone: asResourceCount(parsed.stone),
      weaponUpgrades: {
        sword: asResourceCount(parsed.weaponUpgrades?.sword),
        bow: asResourceCount(parsed.weaponUpgrades?.bow),
        staff: asResourceCount(parsed.weaponUpgrades?.staff),
      },
      hiredGoblin: isHireKind(parsed.hiredGoblin) ? parsed.hiredGoblin : undefined,
      hiredWorkers: Array.isArray(parsed.hiredWorkers)
        ? parsed.hiredWorkers.filter(isWorkerKind)
        : [],
    };
  } catch {
    return {
      ...EMPTY_PROGRESS,
      weaponUpgrades: { ...EMPTY_PROGRESS.weaponUpgrades },
      hiredWorkers: [],
    };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        wood: asResourceCount(progress.wood),
        stone: asResourceCount(progress.stone),
        weaponUpgrades: {
          sword: asResourceCount(progress.weaponUpgrades.sword),
          bow: asResourceCount(progress.weaponUpgrades.bow),
          staff: asResourceCount(progress.weaponUpgrades.staff),
        },
        hiredGoblin: isHireKind(progress.hiredGoblin) ? progress.hiredGoblin : undefined,
        hiredWorkers: progress.hiredWorkers.filter(isWorkerKind),
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
