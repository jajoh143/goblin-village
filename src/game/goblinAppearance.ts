import Phaser from 'phaser';

export type WeaponKind = 'sword' | 'bow' | 'staff';

export interface WeaponDefinition {
  frame: number;
  label: string;
  damage: number;
  range: number;
  projectile: boolean;
  projectileColor: number;
}

export const WEAPONS: Record<WeaponKind, WeaponDefinition> = {
  sword: {
    frame: 366,
    label: 'Sword',
    damage: 18,
    range: 34,
    projectile: false,
    projectileColor: 0xe8d39a,
  },
  bow: {
    frame: 52,
    label: 'Bow',
    damage: 12,
    range: 118,
    projectile: true,
    projectileColor: 0xe8d39a,
  },
  staff: {
    frame: 42,
    label: 'Staff',
    damage: 15,
    range: 124,
    projectile: true,
    projectileColor: 0x72e7ff,
  },
};

export const MAX_WEAPON_UPGRADE = 4;

const WEAPON_FRAMES: Record<WeaponKind, readonly number[]> = {
  sword: [366, 367, 368, 369, 370],
  bow: [52, 106, 160, 214, 268],
  staff: [42, 43, 44, 45, 46],
};

const KENNEY_COLUMNS = 54;
const FRAME_SIZE = 16;
const FRAME_STEP = 17;
const GREEN_GOBLIN_FRAME = 162;
const BASIC_SHIRT_FRAME = 282;

export function createGoblinTexture(
  scene: Phaser.Scene,
  weapon: WeaponKind,
  keyPrefix = 'player-goblin',
  upgradeLevel = 0,
): string {
  const visualLevel = Phaser.Math.Clamp(Math.floor(upgradeLevel), 0, MAX_WEAPON_UPGRADE);
  const textureKey = `${keyPrefix}-${weapon}-${visualLevel}`;
  return createCompositeTexture(scene, textureKey, WEAPON_FRAMES[weapon][visualLevel]);
}

export function createGoblinToolTexture(
  scene: Phaser.Scene,
  toolFrame: number,
  keyPrefix: string,
): string {
  return createCompositeTexture(scene, `${keyPrefix}-${toolFrame}`, toolFrame);
}

function createCompositeTexture(scene: Phaser.Scene, textureKey: string, equipmentFrame: number): string {
  if (scene.textures.exists(textureKey)) return textureKey;

  const source = scene.textures.get('roguelike-characters').getSourceImage() as CanvasImageSource;
  const canvasTexture = scene.textures.createCanvas(textureKey, FRAME_SIZE, FRAME_SIZE);
  if (!canvasTexture) throw new Error(`Unable to create goblin texture: ${textureKey}`);

  const frames = [GREEN_GOBLIN_FRAME, BASIC_SHIRT_FRAME, equipmentFrame];
  for (const frame of frames) {
    const sourceX = (frame % KENNEY_COLUMNS) * FRAME_STEP;
    const sourceY = Math.floor(frame / KENNEY_COLUMNS) * FRAME_STEP;
    canvasTexture.context.drawImage(
      source,
      sourceX,
      sourceY,
      FRAME_SIZE,
      FRAME_SIZE,
      0,
      0,
      FRAME_SIZE,
      FRAME_SIZE,
    );
  }
  canvasTexture.refresh();
  return textureKey;
}

export function isWeaponKind(value: unknown): value is WeaponKind {
  return value === 'sword' || value === 'bow' || value === 'staff';
}
