import Phaser from 'phaser';
import {
  createGoblinToolTexture,
  createGoblinTexture,
  isWeaponKind,
  MAX_WEAPON_UPGRADE,
  WEAPONS,
  type WeaponKind,
} from '../game/goblinAppearance';
import {
  loadProgress,
  saveProgress,
  type HireKind,
  type WorkerKind,
  type WeaponUpgradeLevels,
} from '../game/playerProgress';

const TILE_SIZE = 16;
const GOBLIN_MAX_HEALTH = 80;
const GOBLIN_SPEED = 68;
const HERO_SPAWN_INTERVAL = 10_000;
const ATTACK_INTERVAL = 2_000;
const HARVEST_INTERVAL = 1_000;
const WORKER_HARVEST_INTERVAL = 2_000;
const SMITHY_COST = { wood: 40, stone: 40 };
const MEDIC_TENT_COST = { wood: 30, stone: 20 };
const HEAL_COST = 10;
const HEAL_AMOUNT = 20;
const GOBLIN_HIRE_COST = { wood: 20, stone: 20 };
const MAX_ARMOR_UPGRADE = 4;
const ARMOR_REDUCTION_PER_LEVEL = 2;
const VILLAGE_MUSIC_KEY = 'village-music';
const HIT_SOUND_KEY = 'hit-sound';
const DEATH_SOUND_KEY = 'death-sound';

type HeroKind = 'fighter' | 'archer' | 'wizard';
type ResourceKind = 'wood' | 'stone';

interface LevelData {
  weapon?: WeaponKind;
  wood?: number;
  stone?: number;
  score?: number;
  armorLevel?: number;
  smithyBuilt?: boolean;
  medicTentBuilt?: boolean;
  goblinHealth?: number;
  weaponUpgrades?: WeaponUpgradeLevels;
  hiredKind?: HireKind;
  hiredWorkers?: WorkerKind[];
  resourceLayout?: ResourcePlacement[];
}

interface HealthObjects {
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
}

interface FriendlyUnit {
  sprite: Phaser.Physics.Arcade.Sprite;
  label: Phaser.GameObjects.Text;
  health: number;
  alive: boolean;
  healthObjects: HealthObjects;
  nextAttackAt: number;
}

interface GoblinUnit extends FriendlyUnit {
  selectionRing: Phaser.GameObjects.Ellipse;
  nextHarvestAt: number;
}

interface CompanionUnit extends FriendlyUnit {
  kind: HireKind;
  weapon: WeaponKind;
  target?: HeroUnit;
}

interface WorkerUnit extends FriendlyUnit {
  kind: WorkerKind;
  resourceKind: ResourceKind;
  nextHarvestAt: number;
}

interface HeroUnit {
  id: number;
  kind: HeroKind;
  name: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  label: Phaser.GameObjects.Text;
  hitTarget: Phaser.GameObjects.Zone;
  targetRing: Phaser.GameObjects.Ellipse;
  healthObjects: HealthObjects;
  health: number;
  maxHealth: number;
  damage: number;
  attackRange: number;
  speed: number;
  projectile: boolean;
  projectileColor: number;
  nextAttackAt: number;
  alive: boolean;
}

interface ResourceNode {
  kind: ResourceKind;
  name: string;
  x: number;
  y: number;
  interactionRange: number;
  hitTarget: Phaser.GameObjects.Zone;
  targetRing: Phaser.GameObjects.Ellipse;
}

interface ResourcePlacement {
  kind: ResourceKind;
  xRatio: number;
  yRatio: number;
}

interface NavigationDetour {
  waypoint: Phaser.Math.Vector2;
  destination: Phaser.Math.Vector2;
}

type GoblinCommand =
  | { type: 'move'; point: Phaser.Math.Vector2 }
  | { type: 'attack'; hero: HeroUnit }
  | { type: 'harvest'; resource: ResourceNode };

type ShopMode = 'home' | 'smithy' | 'medic';

const HERO_DEFINITIONS: Record<HeroKind, {
  name: string;
  frame: number;
  health: number;
  damage: number;
  range: number;
  speed: number;
  projectile: boolean;
  projectileColor: number;
}> = {
  fighter: {
    name: 'Fighter',
    frame: 98,
    health: 140,
    damage: 22,
    range: 34,
    speed: 35,
    projectile: false,
    projectileColor: 0xffb26b,
  },
  archer: {
    name: 'Archer',
    frame: 99,
    health: 100,
    damage: 7,
    range: 116,
    speed: 42,
    projectile: true,
    projectileColor: 0xf1d89b,
  },
  wizard: {
    name: 'Wizard',
    frame: 84,
    health: 60,
    damage: 17,
    range: 124,
    speed: 22,
    projectile: true,
    projectileColor: 0xd57cff,
  },
};

const COMPANION_DEFINITIONS: Record<HireKind, { name: string; weapon: WeaponKind }> = {
  warrior: { name: 'Warrior', weapon: 'sword' },
  archer: { name: 'Archer', weapon: 'bow' },
  mage: { name: 'Mage', weapon: 'staff' },
};

const WORKER_DEFINITIONS: Record<WorkerKind, {
  name: string;
  resourceKind: ResourceKind;
  toolFrame: number;
}> = {
  woodcutter: { name: 'Woodcutter', resourceKind: 'wood', toolFrame: 101 },
  miner: { name: 'Miner', resourceKind: 'stone', toolFrame: 104 },
};

export class LevelOneScene extends Phaser.Scene {
  private weapon: WeaponKind = 'sword';
  private wood = 0;
  private stone = 0;
  private score = 0;
  private armorLevel = 0;
  private smithyBuilt = false;
  private medicTentBuilt = false;
  private savedGoblinHealth = GOBLIN_MAX_HEALTH;
  private weaponUpgrades: WeaponUpgradeLevels = { sword: 0, bow: 0, staff: 0 };
  private hiredKind?: HireKind;
  private hiredWorkers: WorkerKind[] = [];
  private goblin?: GoblinUnit;
  private companion?: CompanionUnit;
  private readonly workers: WorkerUnit[] = [];
  private command?: GoblinCommand;
  private readonly heroes: HeroUnit[] = [];
  private readonly resources: ResourceNode[] = [];
  private resourceLayout?: ResourcePlacement[];
  private resourceText?: Phaser.GameObjects.Text;
  private goblinStatusText?: Phaser.GameObjects.Text;
  private waveText?: Phaser.GameObjects.Text;
  private moveMarker?: Phaser.GameObjects.Ellipse;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private readonly obstacleBounds: Phaser.Geom.Rectangle[] = [];
  private readonly navigationDetours = new WeakMap<
    Phaser.Physics.Arcade.Sprite,
    NavigationDetour
  >();
  private shopContainer?: Phaser.GameObjects.Container;
  private smithyTarget?: Phaser.GameObjects.Zone;
  private medicTentTarget?: Phaser.GameObjects.Zone;
  private shopMode: ShopMode = 'home';
  private shopOpen = false;
  private nextSpawnAt = 0;
  private heroSequence = 0;
  private gameOver = false;

  constructor() {
    super('level-one');
  }

  init(data: LevelData): void {
    const progress = loadProgress();
    this.weapon = isWeaponKind(data.weapon) ? data.weapon : 'sword';
    this.wood = Math.max(data.wood ?? 0, progress.wood);
    this.stone = Math.max(data.stone ?? 0, progress.stone);
    this.score = Math.max(0, data.score ?? 0);
    this.armorLevel = Math.min(
      data.armorLevel ?? 0,
      MAX_ARMOR_UPGRADE,
    );
    this.smithyBuilt = data.smithyBuilt ?? false;
    this.medicTentBuilt = data.medicTentBuilt ?? false;
    const savedUpgrades = data.weaponUpgrades ?? { sword: 0, bow: 0, staff: 0 };
    this.weaponUpgrades = {
      sword: Math.min(savedUpgrades.sword, MAX_WEAPON_UPGRADE),
      bow: Math.min(savedUpgrades.bow, MAX_WEAPON_UPGRADE),
      staff: Math.min(savedUpgrades.staff, MAX_WEAPON_UPGRADE),
    };
    this.hiredKind = data.hiredKind;
    this.hiredWorkers = [...new Set(data.hiredWorkers ?? [])];
    this.savedGoblinHealth = data.goblinHealth ?? GOBLIN_MAX_HEALTH;
    this.goblin = undefined;
    this.companion = undefined;
    this.workers.length = 0;
    this.command = undefined;
    this.heroes.length = 0;
    this.resources.length = 0;
    this.resourceLayout = data.resourceLayout?.map((placement) => ({ ...placement }));
    this.resourceText = undefined;
    this.goblinStatusText = undefined;
    this.waveText = undefined;
    this.moveMarker = undefined;
    this.obstacles = undefined;
    this.obstacleBounds.length = 0;
    this.shopContainer = undefined;
    this.smithyTarget = undefined;
    this.medicTentTarget = undefined;
    this.shopMode = 'home';
    this.shopOpen = false;
    this.nextSpawnAt = 0;
    this.heroSequence = 0;
    this.gameOver = false;
  }

  public getRestartData(): LevelData {
    return {
      weapon: this.weapon,
      wood: this.wood,
      stone: this.stone,
      score: this.score,
      armorLevel: this.armorLevel,
      smithyBuilt: this.smithyBuilt,
      medicTentBuilt: this.medicTentBuilt,
      goblinHealth: this.goblin?.health ?? this.savedGoblinHealth,
      weaponUpgrades: { ...this.weaponUpgrades },
      hiredKind: this.hiredKind,
      hiredWorkers: [...this.hiredWorkers],
      resourceLayout: this.resourceLayout?.map((placement) => ({ ...placement })),
    };
  }

  preload(): void {
    this.load.spritesheet('tiny-town', 'assets/tiles/tiny-town.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('tiny-dungeon', 'assets/characters/tiny-dungeon.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('roguelike-characters', 'assets/characters/roguelike-characters.png');
    this.load.audio(VILLAGE_MUSIC_KEY, 'assets/audio/music/town-theme.mp3');
    this.load.audio(HIT_SOUND_KEY, 'assets/audio/sfx/hit.mp3');
    this.load.audio(DEATH_SOUND_KEY, 'assets/audio/sfx/death.mp3');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.cameras.main.setBackgroundColor('#6fab54');
    this.createGround();
    this.createCommandSurface();
    this.obstacles = this.physics.add.staticGroup();
    this.createHome();
    if (this.smithyBuilt) this.createSmithy();
    if (this.medicTentBuilt) this.createMedicTent();
    this.createResources();
    this.createGoblin();
    if (this.hiredKind) this.createCompanion(this.hiredKind);
    for (const worker of this.hiredWorkers) this.createWorker(worker);
    this.createHud();
    this.startBackgroundMusic();

    this.nextSpawnAt = this.time.now + HERO_SPAWN_INTERVAL;
    this.time.addEvent({
      delay: HERO_SPAWN_INTERVAL,
      loop: true,
      callback: () => {
        if (!this.gameOver) this.spawnHero();
        this.nextSpawnAt = this.time.now + HERO_SPAWN_INTERVAL;
      },
    });

    this.updateAccessibilityState();
  }

  update(): void {
    if (this.shopOpen) return;
    if (this.gameOver) {
      this.updateAttachedObjects();
      this.updateHud();
      return;
    }
    this.updateGoblinCommand();
    this.updateCompanion();
    this.updateWorkers();
    this.updateHeroes();
    this.updateAttachedObjects();
    this.updateHud();
  }

  private createGround(): void {
    for (let y = 0; y < this.scale.height; y += TILE_SIZE) {
      for (let x = 0; x < this.scale.width; x += TILE_SIZE) {
        const frame = (x + y) % 80 === 0 ? 1 : 0;
        this.add.image(x, y, 'tiny-town', frame).setOrigin(0);
      }
    }
  }

  private createCommandSurface(): void {
    const surface = this.add
      .zone(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });
    surface.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.worldY < 52 || !this.goblin?.alive) return;
      const nearbyHero = this.heroes.find((hero) =>
        hero.alive
        && Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, hero.sprite.x, hero.sprite.y) <= 52
      );
      if (nearbyHero) {
        this.issueAttackCommand(nearbyHero);
        return;
      }
      this.command = {
        type: 'move',
        point: new Phaser.Math.Vector2(
          Phaser.Math.Clamp(pointer.worldX, 14, this.scale.width - 14),
          Phaser.Math.Clamp(pointer.worldY, 58, this.scale.height - 14),
        ),
      };
      this.refreshCommandIndicators();
      this.updateAccessibilityState();
    });

    this.moveMarker = this.add
      .ellipse(0, 0, 18, 10)
      .setStrokeStyle(2, 0xffe071, 1)
      .setDepth(4)
      .setVisible(false);
  }

  private createHome(): void {
    const portrait = this.scale.height > this.scale.width;
    const x = portrait ? 74 : 100;
    const y = portrait ? 142 : 112;
    const hut = this.add.graphics().setDepth(2);
    hut.fillStyle(0x71452c, 1);
    hut.fillRoundedRect(x - 34, y - 22, 68, 48, 6);
    hut.fillStyle(0x3d2a22, 1);
    hut.fillTriangle(x - 42, y - 20, x + 42, y - 20, x, y - 50);
    hut.lineStyle(2, 0xb47d45, 1);
    hut.strokeRoundedRect(x - 34, y - 22, 68, 48, 6);
    this.add.image(x, y + 4, 'tiny-town', 85).setScale(2.2).setDepth(3);
    this.addObstacle(x, y - 10, 80, 70);
    const shopTarget = this.add
      .zone(x, y - 10, 92, 82)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    shopTarget.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.openShop('home');
      },
    );
  }

  private createSmithy(): void {
    if (this.smithyTarget) return;
    const portrait = this.scale.height > this.scale.width;
    const x = portrait ? 164 : 190;
    const y = portrait ? 142 : 112;
    const smithy = this.add.graphics().setDepth(2);
    smithy.fillStyle(0x4e4035, 1);
    smithy.fillRoundedRect(x - 31, y - 18, 62, 43, 5);
    smithy.fillStyle(0x2d2926, 1);
    smithy.fillTriangle(x - 37, y - 16, x + 37, y - 16, x, y - 41);
    smithy.fillStyle(0x59636a, 1);
    smithy.fillRect(x + 17, y - 40, 11, 25);
    smithy.fillStyle(0xd66a2f, 1);
    smithy.fillRect(x - 23, y + 5, 18, 12);
    smithy.lineStyle(2, 0xa07149, 1);
    smithy.strokeRoundedRect(x - 31, y - 18, 62, 43, 5);

    // Kenney Tiny Dungeon includes a clear anvil and forge flame. Together
    // they make the small workshop readable without needing a custom asset.
    this.add.image(x + 10, y + 7, 'tiny-dungeon', 64).setScale(2).setDepth(3);
    this.add.image(x - 14, y + 1, 'tiny-dungeon', 29).setScale(1.4).setDepth(3);
    this.addObstacle(x, y - 8, 72, 62);

    this.smithyTarget = this.add
      .zone(x, y - 8, 80, 74)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.smithyTarget.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.openShop('smithy');
      },
    );
  }

  private createMedicTent(): void {
    if (this.medicTentTarget) return;
    const portrait = this.scale.height > this.scale.width;
    const x = portrait ? 254 : 280;
    const y = portrait ? 142 : 112;
    const tent = this.add.graphics().setDepth(2);
    tent.fillStyle(0xd8d1b7, 1);
    tent.fillTriangle(x - 38, y + 23, x, y - 39, x + 38, y + 23);
    tent.fillStyle(0xb9b397, 1);
    tent.fillTriangle(x, y - 39, x + 38, y + 23, x + 13, y + 23);
    tent.lineStyle(2, 0x615b4c, 1);
    tent.strokeTriangle(x - 38, y + 23, x, y - 39, x + 38, y + 23);
    tent.fillStyle(0x9b2f32, 1);
    tent.fillRect(x - 5, y - 20, 10, 29);
    tent.fillRect(x - 14, y - 11, 28, 10);
    tent.fillStyle(0x493d35, 1);
    tent.fillTriangle(x - 10, y + 23, x, y + 4, x + 10, y + 23);

    // The red potion from Kenney Tiny Dungeon reinforces the healing use.
    this.add.image(x + 23, y + 12, 'tiny-dungeon', 115).setScale(1.45).setDepth(3);
    this.addObstacle(x, y - 5, 72, 62);

    this.medicTentTarget = this.add
      .zone(x, y - 5, 82, 76)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.medicTentTarget.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.openShop('medic');
      },
    );
  }

  private createResources(): void {
    if (!this.resourceLayout || !this.isResourceLayoutValid(this.resourceLayout)) {
      this.resourceLayout = this.generateResourceLayout();
    }
    const placements = this.resourceLayout.map((placement) => ({
      kind: placement.kind,
      name: placement.kind === 'wood' ? 'TREE' : 'BOULDER',
      x: placement.xRatio * this.scale.width,
      y: placement.yRatio * this.scale.height,
    }));

    for (const placement of placements) {
      if (placement.kind === 'wood') {
        this.add.rectangle(placement.x, placement.y + 18, 12, 36, 0x6c4529, 1).setDepth(2);
        const imageY = placement.y - 8;
        this.add.image(placement.x, imageY, 'tiny-town', 5).setScale(4).setDepth(3);
        this.addObstacle(placement.x, placement.y + 2, 38, 62);
      } else {
        this.createBoulder(placement.x, placement.y);
        this.addObstacle(placement.x, placement.y + 5, 52, 38);
      }
      const targetRing = this.add
        .ellipse(placement.x, placement.y + 18, 54, 20)
        .setStrokeStyle(2, placement.kind === 'wood' ? 0x8fe067 : 0xcdd4dc, 1)
        .setDepth(3)
        .setVisible(false);
      const hitTarget = this.add
        .zone(placement.x, placement.y, 72, 72)
        .setDepth(6)
        .setInteractive({ useHandCursor: true });
      const resource: ResourceNode = {
        kind: placement.kind,
        name: placement.name,
        x: placement.x,
        y: placement.y,
        interactionRange: placement.kind === 'wood' ? 48 : 42,
        hitTarget,
        targetRing,
      };
      hitTarget.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          if (!this.goblin?.alive) return;
          this.command = { type: 'harvest', resource };
          this.refreshCommandIndicators();
          this.updateAccessibilityState();
        },
      );
      this.resources.push(resource);
    }
  }

  private generateResourceLayout(): ResourcePlacement[] {
    const width = this.scale.width;
    const height = this.scale.height;
    const margin = 58;
    const top = 92;
    const portrait = height > width;
    const reserved = [
      new Phaser.Math.Vector2(portrait ? 74 : 100, portrait ? 142 : 112),
      new Phaser.Math.Vector2(portrait ? 164 : 190, portrait ? 142 : 112),
      new Phaser.Math.Vector2(portrait ? 254 : 280, portrait ? 142 : 112),
      new Phaser.Math.Vector2(portrait ? 160 : 224, portrait ? 292 : 214),
    ];

    const kinds: ResourceKind[] = ['wood', 'stone', 'wood', 'stone', 'wood', 'stone'];
    const points: Phaser.Math.Vector2[] = [];
    const placements: ResourcePlacement[] = [];
    for (const kind of kinds) {
      let point: Phaser.Math.Vector2 | undefined;
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const candidate = new Phaser.Math.Vector2(
          Phaser.Math.Between(margin, width - margin),
          Phaser.Math.Between(top, height - margin),
        );
        const clearsBuildings = reserved.every((item) => item.distance(candidate) >= 112);
        const clearsResources = points.every((item) => item.distance(candidate) >= 96);
        if (clearsBuildings && clearsResources) {
          point = candidate;
          break;
        }
      }
      if (!point) {
        const index = placements.length;
        const columns = portrait ? 2 : 3;
        const rows = Math.ceil(kinds.length / columns);
        point = new Phaser.Math.Vector2(
          Phaser.Math.Linear(margin, width - margin, (index % columns + 0.5) / columns),
          Phaser.Math.Linear(top + 90, height - margin, (Math.floor(index / columns) + 0.5) / rows),
        );
      }
      points.push(point);
      placements.push({
        kind,
        xRatio: point.x / width,
        yRatio: point.y / height,
      });
    }
    return placements;
  }

  private isResourceLayoutValid(layout: ResourcePlacement[]): boolean {
    if (layout.length !== 6) return false;
    const woodCount = layout.filter((placement) => placement.kind === 'wood').length;
    const stoneCount = layout.filter((placement) => placement.kind === 'stone').length;
    if (woodCount !== 3 || stoneCount !== 3) return false;
    const width = this.scale.width;
    const height = this.scale.height;
    const portrait = height > width;
    const reserved = [
      new Phaser.Math.Vector2(portrait ? 74 : 100, portrait ? 142 : 112),
      new Phaser.Math.Vector2(portrait ? 164 : 190, portrait ? 142 : 112),
      new Phaser.Math.Vector2(portrait ? 254 : 280, portrait ? 142 : 112),
      new Phaser.Math.Vector2(portrait ? 160 : 224, portrait ? 292 : 214),
    ];
    const points = layout.map((placement) => new Phaser.Math.Vector2(
      placement.xRatio * width,
      placement.yRatio * height,
    ));
    return points.every((point, index) =>
      point.x >= 58
      && point.x <= width - 58
      && point.y >= 92
      && point.y <= height - 58
      && reserved.every((item) => item.distance(point) >= 92)
      && points.every((other, otherIndex) => otherIndex === index || other.distance(point) >= 76)
    );
  }

  private createGoblin(): void {
    const portrait = this.scale.height > this.scale.width;
    const x = portrait ? 160 : 224;
    const y = portrait ? 292 : 214;
    const sprite = this.physics.add
      .sprite(
        x,
        y,
        createGoblinTexture(this, this.weapon, 'player-goblin', this.weaponUpgrades[this.weapon]),
      )
      .setScale(2.4)
      .setDepth(5)
      .setCollideWorldBounds(true);
    sprite.body.setCircle(5, 3, 7);
    if (this.obstacles) this.physics.add.collider(sprite, this.obstacles);
    const selectionRing = this.add
      .ellipse(x, y + 10, 40, 18)
      .setStrokeStyle(2, 0x64eaff, 1)
      .setDepth(3);
    const healthObjects = this.createHealthBar(x, y - 23, 42, 0x7ed957);
    const label = this.add
      .text(x, y - 30, 'YOU', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#15331a',
        backgroundColor: '#d9edaa',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(7);
    this.goblin = {
      sprite,
      label,
      selectionRing,
      health: Phaser.Math.Clamp(this.savedGoblinHealth, 1, GOBLIN_MAX_HEALTH),
      alive: true,
      healthObjects,
      nextAttackAt: 0,
      nextHarvestAt: 0,
    };
    this.setHealthBar(this.goblin.healthObjects, this.goblin.health, GOBLIN_MAX_HEALTH);
  }

  private createCompanion(kind: HireKind): void {
    if (this.companion) return;
    const portrait = this.scale.height > this.scale.width;
    const definition = COMPANION_DEFINITIONS[kind];
    const x = portrait ? 118 : 164;
    const y = portrait ? 250 : 190;
    const sprite = this.physics.add
      .sprite(x, y, createGoblinTexture(this, definition.weapon, `companion-${kind}`))
      .setScale(2.4)
      .setDepth(5)
      .setCollideWorldBounds(true);
    sprite.body.setCircle(5, 3, 7);
    if (this.obstacles) this.physics.add.collider(sprite, this.obstacles);
    const healthObjects = this.createHealthBar(x, y - 23, 42, 0x73c7ff);
    const label = this.add
      .text(x, y - 30, definition.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#d7f1ff',
        backgroundColor: '#234154',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(7);
    this.companion = {
      kind,
      weapon: definition.weapon,
      sprite,
      label,
      health: GOBLIN_MAX_HEALTH,
      alive: true,
      healthObjects,
      nextAttackAt: 0,
    };
    this.setHealthBar(healthObjects, GOBLIN_MAX_HEALTH, GOBLIN_MAX_HEALTH);
  }

  private createWorker(kind: WorkerKind): void {
    if (this.workers.some((worker) => worker.kind === kind)) return;
    const portrait = this.scale.height > this.scale.width;
    const definition = WORKER_DEFINITIONS[kind];
    const index = this.workers.length;
    const x = portrait ? 110 + index * 58 : 150 + index * 48;
    const y = portrait ? 218 : 164 + index * 24;
    const sprite = this.physics.add
      .sprite(
        x,
        y,
        createGoblinToolTexture(this, definition.toolFrame, `worker-${kind}`),
      )
      .setScale(2.4)
      .setDepth(5)
      .setCollideWorldBounds(true);
    sprite.body.setCircle(5, 3, 7);
    if (this.obstacles) this.physics.add.collider(sprite, this.obstacles);
    const healthObjects = this.createHealthBar(x, y - 23, 42, 0xf1c75b);
    const label = this.add
      .text(x, y - 30, definition.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#fff0b3',
        backgroundColor: '#55421f',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(7);
    const worker: WorkerUnit = {
      kind,
      resourceKind: definition.resourceKind,
      sprite,
      label,
      health: GOBLIN_MAX_HEALTH,
      alive: true,
      healthObjects,
      nextAttackAt: 0,
      nextHarvestAt: 0,
    };
    this.workers.push(worker);
    this.setHealthBar(healthObjects, GOBLIN_MAX_HEALTH, GOBLIN_MAX_HEALTH);
  }

  private createHud(): void {
    this.add.rectangle(this.scale.width / 2, 24, this.scale.width, 48, 0x142018, 0.97).setDepth(20);
    this.resourceText = this.add
      .text(8, 6, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff1c7',
        lineSpacing: 2,
      })
      .setDepth(21);
    this.goblinStatusText = this.add
      .text(this.scale.width / 2, 7, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#d7ef8c',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(21);
    this.waveText = this.add
      .text(this.scale.width - 8, 7, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffc6a5',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(21);
  }

  private spawnHero(): void {
    const kinds: HeroKind[] = ['fighter', 'archer', 'wizard'];
    const kind = Phaser.Utils.Array.GetRandom(kinds);
    const definition = HERO_DEFINITIONS[kind];
    const position = this.randomEdgePosition();
    const sprite = this.physics.add
      .sprite(position.x, position.y, 'tiny-dungeon', definition.frame)
      .setScale(2.15)
      .setDepth(5)
      .setCollideWorldBounds(true)
      .setInteractive({ useHandCursor: true });
    sprite.body.setCircle(5, 3, 7);
    if (this.obstacles) this.physics.add.collider(sprite, this.obstacles);
    const label = this.add
      .text(position.x, position.y - 22, definition.name, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#ffd8c7',
        backgroundColor: '#3b2522',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });
    const targetRing = this.add
      .ellipse(position.x, position.y + 9, 36, 16)
      .setStrokeStyle(2, 0xff665e, 1)
      .setDepth(3)
      .setVisible(false);
    const hitTarget = this.add
      .zone(position.x, position.y, 84, 84)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    const healthObjects = this.createHealthBar(position.x, position.y - 19, 36, 0xe15b4f);
    const hero: HeroUnit = {
      id: this.heroSequence,
      kind,
      name: definition.name,
      sprite,
      label,
      hitTarget,
      targetRing,
      healthObjects,
      health: definition.health,
      maxHealth: definition.health,
      damage: definition.damage,
      attackRange: definition.range,
      speed: definition.speed,
      projectile: definition.projectile,
      projectileColor: definition.projectileColor,
      nextAttackAt: 0,
      alive: true,
    };
    this.heroSequence += 1;
    const targetHero = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ): void => {
      event.stopPropagation();
      this.issueAttackCommand(hero);
    };
    hitTarget.on('pointerdown', targetHero);
    sprite.on('pointerdown', targetHero);
    label.on('pointerdown', targetHero);
    this.heroes.push(hero);
    this.updateAccessibilityState();
  }

  private issueAttackCommand(hero: HeroUnit): void {
    if (!hero.alive || !this.goblin?.alive) return;
    this.command = { type: 'attack', hero };
    this.refreshCommandIndicators();
    this.updateAccessibilityState();
  }

  private updateGoblinCommand(): void {
    const goblin = this.goblin;
    if (!goblin?.alive) return;

    if (!this.command) {
      goblin.sprite.setVelocity(0, 0);
      return;
    }

    if (this.command.type === 'move') {
      if (this.moveToward(goblin.sprite, this.command.point, GOBLIN_SPEED, 5)) {
        goblin.sprite.setVelocity(0, 0);
        this.command = undefined;
        this.refreshCommandIndicators();
        this.updateAccessibilityState();
      }
      return;
    }

    if (this.command.type === 'harvest') {
      const resource = this.command.resource;
      if (!this.moveToward(goblin.sprite, resource, GOBLIN_SPEED, resource.interactionRange)) return;
      goblin.sprite.setVelocity(0, 0);
      if (this.time.now >= goblin.nextHarvestAt) {
        goblin.nextHarvestAt = this.time.now + HARVEST_INTERVAL;
        if (resource.kind === 'wood') this.wood += 1;
        else this.stone += 1;
        this.persistProgress();
        this.showFloatingText(resource.x, resource.y - 24, `+1 ${resource.kind.toUpperCase()}`, 0xd7ef8c);
        this.updateAccessibilityState();
      }
      return;
    }

    const hero = this.command.hero;
    if (!hero.alive) {
      this.command = undefined;
      goblin.sprite.setVelocity(0, 0);
      this.refreshCommandIndicators();
      this.updateAccessibilityState();
      return;
    }

    const weapon = WEAPONS[this.weapon];
    if (!this.moveToward(goblin.sprite, hero.sprite, GOBLIN_SPEED, weapon.range)) return;
    goblin.sprite.setVelocity(0, 0);
    goblin.sprite.setFlipX(hero.sprite.x < goblin.sprite.x);
    if (this.time.now >= goblin.nextAttackAt) {
      goblin.nextAttackAt = this.time.now + ATTACK_INTERVAL;
      this.performGoblinAttack(hero);
    }
  }

  private updateHeroes(): void {
    const friendlies: FriendlyUnit[] = [];
    if (this.goblin?.alive) friendlies.push(this.goblin);
    if (this.companion?.alive) friendlies.push(this.companion);
    for (const worker of this.workers) {
      if (worker.alive) friendlies.push(worker);
    }
    if (friendlies.length === 0) {
      for (const hero of this.heroes) hero.sprite.setVelocity(0, 0);
      return;
    }

    for (const hero of this.heroes) {
      if (!hero.alive) continue;
      const target = friendlies.reduce((closest, unit) =>
        Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, unit.sprite.x, unit.sprite.y)
          < Phaser.Math.Distance.Between(hero.sprite.x, hero.sprite.y, closest.sprite.x, closest.sprite.y)
          ? unit
          : closest,
      );
      if (!this.moveToward(hero.sprite, target.sprite, hero.speed, hero.attackRange)) continue;
      hero.sprite.setVelocity(0, 0);
      hero.sprite.setFlipX(target.sprite.x < hero.sprite.x);
      if (this.time.now < hero.nextAttackAt) continue;
      hero.nextAttackAt = this.time.now + ATTACK_INTERVAL;
      this.performHeroAttack(hero, target);
    }
  }

  private updateCompanion(): void {
    const companion = this.companion;
    if (!companion?.alive) return;
    const livingHeroes = this.heroes.filter((hero) => hero.alive);
    if (livingHeroes.length === 0) {
      companion.target = undefined;
      companion.sprite.setVelocity(0, 0);
      return;
    }

    const target = livingHeroes.reduce((closest, hero) =>
      Phaser.Math.Distance.Between(companion.sprite.x, companion.sprite.y, hero.sprite.x, hero.sprite.y)
        < Phaser.Math.Distance.Between(companion.sprite.x, companion.sprite.y, closest.sprite.x, closest.sprite.y)
        ? hero
        : closest,
    );
    companion.target = target;
    const weapon = WEAPONS[companion.weapon];
    if (!this.moveToward(companion.sprite, target.sprite, GOBLIN_SPEED, weapon.range)) return;
    companion.sprite.setVelocity(0, 0);
    companion.sprite.setFlipX(target.sprite.x < companion.sprite.x);
    if (this.time.now < companion.nextAttackAt) return;
    companion.nextAttackAt = this.time.now + ATTACK_INTERVAL;
    this.performWeaponAttack(companion.sprite, companion.weapon, target, weapon.damage);
  }

  private updateWorkers(): void {
    for (const worker of this.workers) {
      if (!worker.alive) continue;
      const resource = this.resources.find((node) => node.kind === worker.resourceKind);
      if (!resource) {
        worker.sprite.setVelocity(0, 0);
        continue;
      }
      if (!this.moveToward(worker.sprite, resource, GOBLIN_SPEED, resource.interactionRange)) continue;
      worker.sprite.setVelocity(0, 0);
      if (this.time.now < worker.nextHarvestAt) continue;
      worker.nextHarvestAt = this.time.now + WORKER_HARVEST_INTERVAL;
      if (worker.resourceKind === 'wood') this.wood += 1;
      else this.stone += 1;
      this.persistProgress();
      this.showFloatingText(
        worker.sprite.x,
        worker.sprite.y - 18,
        `+1 ${worker.resourceKind.toUpperCase()}`,
        0xffe39a,
      );
      this.updateAccessibilityState();
    }
  }

  private performGoblinAttack(hero: HeroUnit): void {
    const weapon = WEAPONS[this.weapon];
    const goblin = this.goblin;
    if (!goblin) return;
    const damage = weapon.damage + this.weaponUpgrades[this.weapon] * 5;
    this.performWeaponAttack(goblin.sprite, this.weapon, hero, damage);
  }

  private performWeaponAttack(
    source: Phaser.Physics.Arcade.Sprite,
    weaponKind: WeaponKind,
    hero: HeroUnit,
    damage: number,
  ): void {
    const weapon = WEAPONS[weaponKind];
    if (weapon.projectile) {
      this.launchProjectile(
        source,
        hero.sprite,
        weaponKind === 'bow' ? 'arrow' : 'magic',
        weapon.projectileColor,
        () => this.damageHero(hero, damage),
      );
      return;
    }
    this.swing(source, hero.sprite.x, () => this.damageHero(hero, damage));
  }

  private performHeroAttack(hero: HeroUnit, target: FriendlyUnit): void {
    if (!target.alive) return;

    if (hero.projectile) {
      this.launchProjectile(
        hero.sprite,
        target.sprite,
        hero.kind === 'archer' ? 'arrow' : 'magic',
        hero.projectileColor,
        () => this.damageFriendly(target, hero.damage),
      );
      return;
    }

    this.swing(hero.sprite, target.sprite.x, () => this.damageFriendly(target, hero.damage));
  }

  private swing(sprite: Phaser.GameObjects.Sprite, targetX: number, onHit: () => void): void {
    const angle = targetX < sprite.x ? -28 : 28;
    this.tweens.add({
      targets: sprite,
      angle,
      duration: 120,
      yoyo: true,
      ease: 'Sine.InOut',
      onYoyo: onHit,
      onComplete: () => sprite.setAngle(0),
    });
  }

  private launchProjectile(
    source: Phaser.GameObjects.Sprite,
    target: Phaser.GameObjects.Sprite,
    style: 'arrow' | 'magic',
    color: number,
    onHit: () => void,
  ): void {
    const angle = Phaser.Math.Angle.Between(source.x, source.y, target.x, target.y);
    const projectile = style === 'arrow'
      ? this.add.rectangle(source.x, source.y, 10, 2, color).setRotation(angle)
      : this.add.circle(source.x, source.y, 4, color).setStrokeStyle(1, 0xffffff, 0.9);
    projectile.setDepth(12);
    const distance = Phaser.Math.Distance.Between(source.x, source.y, target.x, target.y);
    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      duration: Math.max(170, distance * 2.8),
      ease: 'Linear',
      onComplete: () => {
        projectile.destroy();
        onHit();
      },
    });
  }

  private damageHero(hero: HeroUnit, amount: number): void {
    if (this.gameOver || !hero.alive) return;
    hero.health = Math.max(0, hero.health - amount);
    this.setHealthBar(hero.healthObjects, hero.health, hero.maxHealth);
    this.flashDamage(hero.sprite);
    this.playCombatSound(hero.health === 0);
    this.showFloatingText(hero.sprite.x, hero.sprite.y - 16, `-${amount}`, 0xffe0b2);
    this.updateAccessibilityState();
    if (hero.health > 0) return;

    hero.alive = false;
    this.score += 1;
    hero.hitTarget.disableInteractive();
    hero.sprite.setVelocity(0, 0).setAlpha(0.6).setAngle(90);
    this.time.delayedCall(90, () => {
      if (hero.sprite.active) hero.sprite.clearTint().setTint(0x555555);
    });
    hero.targetRing.setVisible(false);
    if (this.command?.type === 'attack' && this.command.hero === hero) this.command = undefined;
    this.refreshCommandIndicators();
    this.time.delayedCall(800, () => this.removeHero(hero));
    this.updateAccessibilityState();
  }

  private damageFriendly(target: FriendlyUnit, amount: number): void {
    if (!target.alive) return;
    const armorReduction = target === this.goblin
      ? this.armorLevel * ARMOR_REDUCTION_PER_LEVEL
      : 0;
    const appliedDamage = Math.max(1, amount - armorReduction);
    target.health = Math.max(0, target.health - appliedDamage);
    this.setHealthBar(target.healthObjects, target.health, GOBLIN_MAX_HEALTH);
    this.flashDamage(target.sprite);
    this.playCombatSound(target.health === 0);
    this.showFloatingText(target.sprite.x, target.sprite.y - 18, `-${appliedDamage}`, 0xff9b85);
    this.updateAccessibilityState();
    if (target.health > 0) return;

    target.alive = false;
    this.animateGoblinDeath(target);
    if (target !== this.goblin) {
      target.label.setText('DOWN');
      this.updateAccessibilityState();
      return;
    }

    this.command = undefined;
    this.gameOver = true;
    this.score = 0;
    this.armorLevel = 0;
    this.weaponUpgrades = { sword: 0, bow: 0, staff: 0 };
    this.smithyBuilt = false;
    this.medicTentBuilt = false;
    this.hiredKind = undefined;
    this.hiredWorkers = [];
    this.companion?.sprite.setVelocity(0, 0);
    for (const worker of this.workers) worker.sprite.setVelocity(0, 0);
    for (const hero of this.heroes) hero.sprite.setVelocity(0, 0);
    this.persistProgress();
    this.refreshCommandIndicators();
    this.showGameOver();
    this.updateAccessibilityState();
  }

  private startBackgroundMusic(): void {
    let music = this.sound.getAll(VILLAGE_MUSIC_KEY)[0];
    if (!music) {
      music = this.sound.add(VILLAGE_MUSIC_KEY, {
        loop: true,
        volume: 0.18,
      });
    }

    const play = (): void => {
      if (!music.isPlaying) music.play();
    };
    if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, play);
    else play();
  }

  private playCombatSound(isDeath: boolean): void {
    this.sound.play(isDeath ? DEATH_SOUND_KEY : HIT_SOUND_KEY, {
      volume: isDeath ? 0.55 : 0.38,
      detune: Phaser.Math.Between(-80, 80),
    });
  }

  private animateGoblinDeath(target: FriendlyUnit): void {
    target.sprite.setVelocity(0, 0);
    const mainGoblin = this.goblin;
    if (mainGoblin && target === mainGoblin) mainGoblin.selectionRing.setVisible(false);

    this.tweens.add({
      targets: target.sprite,
      angle: 90,
      y: target.sprite.y + 5,
      duration: 280,
      ease: 'Cubic.Out',
    });
    this.time.delayedCall(90, () => {
      if (target.sprite.active) target.sprite.clearTint().setTint(0x555555);
    });

    const deathObjects: Phaser.GameObjects.GameObject[] = [
      target.sprite,
      target.label,
      target.healthObjects.background,
      target.healthObjects.fill,
    ];
    this.time.delayedCall(2_000, () => {
      this.tweens.add({
        targets: deathObjects,
        alpha: 0,
        duration: 500,
        ease: 'Sine.In',
      });
    });
  }

  private updateAttachedObjects(): void {
    const goblin = this.goblin;
    if (goblin) {
      goblin.label.setPosition(goblin.sprite.x, goblin.sprite.y - 30);
      goblin.selectionRing.setPosition(goblin.sprite.x, goblin.sprite.y + 10);
      this.positionHealthBar(goblin.healthObjects, goblin.sprite.x, goblin.sprite.y - 23, 42);
    }
    const companion = this.companion;
    if (companion) {
      companion.label.setPosition(companion.sprite.x, companion.sprite.y - 30);
      this.positionHealthBar(companion.healthObjects, companion.sprite.x, companion.sprite.y - 23, 42);
    }
    for (const worker of this.workers) {
      worker.label.setPosition(worker.sprite.x, worker.sprite.y - 30);
      this.positionHealthBar(worker.healthObjects, worker.sprite.x, worker.sprite.y - 23, 42);
    }
    for (const hero of this.heroes) {
      hero.label.setPosition(hero.sprite.x, hero.sprite.y - 22);
      hero.hitTarget.setPosition(hero.sprite.x, hero.sprite.y);
      hero.targetRing.setPosition(hero.sprite.x, hero.sprite.y + 9);
      this.positionHealthBar(hero.healthObjects, hero.sprite.x, hero.sprite.y - 19, 36);
    }
  }

  private updateHud(): void {
    const goblin = this.goblin;
    const order = this.command?.type === 'attack'
      ? `ATTACK ${this.command.hero.name}`
      : this.command?.type === 'harvest'
        ? `HARVEST ${this.command.resource.name}`
        : this.command?.type === 'move'
          ? 'MOVE'
          : 'IDLE';
    this.resourceText?.setText([`WOOD ${this.wood}`, `STONE ${this.stone}`]);
    this.goblinStatusText?.setText([
      `LEVEL 1 · ${WEAPONS[this.weapon].label.toUpperCase()} +${this.weaponUpgrades[this.weapon]}`,
      `HP ${goblin?.health ?? 0}/${GOBLIN_MAX_HEALTH} · ARMOR +${this.armorLevel} · ${order}`,
    ]);
    const seconds = Math.max(0, Math.ceil((this.nextSpawnAt - this.time.now) / 1000));
    this.waveText?.setText([
      `POINTS ${this.score}`,
      `HEROES ${this.heroes.filter((hero) => hero.alive).length}`,
      this.gameOver ? 'WAVES STOPPED' : `NEXT ${seconds}s`,
    ]);
  }

  private createHealthBar(x: number, y: number, width: number, color: number): HealthObjects {
    const background = this.add.rectangle(x, y, width + 2, 6, 0x172018, 0.95).setDepth(9);
    const fill = this.add.rectangle(x - width / 2, y, width, 4, color, 1).setOrigin(0, 0.5).setDepth(10);
    return { background, fill };
  }

  private setHealthBar(objects: HealthObjects, health: number, maxHealth: number): void {
    objects.fill.setScale(Phaser.Math.Clamp(health / maxHealth, 0, 1), 1);
  }

  private positionHealthBar(objects: HealthObjects, x: number, y: number, width: number): void {
    objects.background.setPosition(x, y);
    objects.fill.setPosition(x - width / 2, y);
  }

  private moveToward(
    sprite: Phaser.Physics.Arcade.Sprite,
    target: Phaser.Types.Math.Vector2Like,
    speed: number,
    stopDistance: number,
  ): boolean {
    const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, target.x, target.y);
    if (distance <= stopDistance) {
      this.navigationDetours.delete(sprite);
      return true;
    }
    const steeringTarget = this.getSteeringTarget(sprite, target);
    const velocity = new Phaser.Math.Vector2(
      steeringTarget.x - sprite.x,
      steeringTarget.y - sprite.y,
    ).normalize().scale(speed);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right) {
      const direction = Math.abs(steeringTarget.y - sprite.y) > 4
        ? Math.sign(steeringTarget.y - sprite.y)
        : sprite.y < this.scale.height / 2 ? 1 : -1;
      velocity.set(0, direction * speed);
    } else if (body.blocked.up || body.blocked.down) {
      const direction = Math.abs(steeringTarget.x - sprite.x) > 4
        ? Math.sign(steeringTarget.x - sprite.x)
        : sprite.x < this.scale.width / 2 ? 1 : -1;
      velocity.set(direction * speed, 0);
    }
    sprite.setVelocity(velocity.x, velocity.y);
    if (Math.abs(velocity.x) > 2) sprite.setFlipX(velocity.x < 0);
    return false;
  }

  private refreshCommandIndicators(): void {
    for (const resource of this.resources) resource.targetRing.setVisible(false);
    for (const hero of this.heroes) hero.targetRing.setVisible(false);
    this.moveMarker?.setVisible(false);

    if (this.command?.type === 'move') {
      this.moveMarker?.setPosition(this.command.point.x, this.command.point.y).setVisible(true);
    } else if (this.command?.type === 'harvest') {
      this.command.resource.targetRing.setVisible(true);
    } else if (this.command?.type === 'attack' && this.command.hero.alive) {
      this.command.hero.targetRing.setVisible(true);
    }
  }

  private randomEdgePosition(): Phaser.Math.Vector2 {
    const margin = 14;
    const top = 62;
    const edge = Phaser.Math.Between(0, 3);
    if (edge === 0) return new Phaser.Math.Vector2(margin, Phaser.Math.Between(top, this.scale.height - margin));
    if (edge === 1) return new Phaser.Math.Vector2(this.scale.width - margin, Phaser.Math.Between(top, this.scale.height - margin));
    if (edge === 2) return new Phaser.Math.Vector2(Phaser.Math.Between(margin, this.scale.width - margin), top);
    return new Phaser.Math.Vector2(Phaser.Math.Between(margin, this.scale.width - margin), this.scale.height - margin);
  }

  private flashDamage(sprite: Phaser.GameObjects.Sprite): void {
    sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(80, () => {
      if (sprite.active) sprite.clearTint();
    });
  }

  private showFloatingText(x: number, y: number, value: string, color: number): void {
    const text = this.add
      .text(x, y, value, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(15);
    this.tweens.add({
      targets: text,
      y: y - 14,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  private addObstacle(x: number, y: number, width: number, height: number): void {
    if (!this.obstacles) return;
    const zone = this.add.zone(x, y, width, height);
    this.physics.add.existing(zone, true);
    this.obstacles.add(zone);
    this.obstacleBounds.push(new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height));
  }

  private getSteeringTarget(
    sprite: Phaser.Physics.Arcade.Sprite,
    target: Phaser.Types.Math.Vector2Like,
  ): Phaser.Types.Math.Vector2Like {
    const activeDetour = this.navigationDetours.get(sprite);
    if (activeDetour) {
      const targetShift = Phaser.Math.Distance.Between(
        activeDetour.destination.x,
        activeDetour.destination.y,
        target.x,
        target.y,
      );
      const waypointDistance = Phaser.Math.Distance.Between(
        sprite.x,
        sprite.y,
        activeDetour.waypoint.x,
        activeDetour.waypoint.y,
      );

      // Keep the same side of an obstacle until the unit reaches its waypoint.
      // Re-picking the cheapest corner every frame can alternate between two
      // nearly equal routes and makes the sprite visibly bounce.
      if (targetShift <= 48 && waypointDistance > 6) return activeDetour.waypoint;
      this.navigationDetours.delete(sprite);
    }

    const padding = 13;
    const clearance = 7;
    for (const bounds of this.obstacleBounds) {
      const expanded = new Phaser.Geom.Rectangle(
        bounds.x - padding,
        bounds.y - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
      );
      if (expanded.contains(sprite.x, sprite.y)) continue;
      if (!this.segmentIntersectsRectangle(sprite.x, sprite.y, target.x, target.y, expanded)) continue;

      const dx = target.x - sprite.x;
      const dy = target.y - sprite.y;
      const candidates = Math.abs(dx) >= Math.abs(dy)
        ? [
            new Phaser.Math.Vector2(
              dx > 0 ? expanded.right + clearance : expanded.left - clearance,
              expanded.top - clearance,
            ),
            new Phaser.Math.Vector2(
              dx > 0 ? expanded.right + clearance : expanded.left - clearance,
              expanded.bottom + clearance,
            ),
          ]
        : [
            new Phaser.Math.Vector2(
              expanded.left - clearance,
              dy > 0 ? expanded.bottom + clearance : expanded.top - clearance,
            ),
            new Phaser.Math.Vector2(
              expanded.right + clearance,
              dy > 0 ? expanded.bottom + clearance : expanded.top - clearance,
            ),
          ];
      candidates.sort((a, b) => {
        const cost = (point: Phaser.Math.Vector2): number =>
          Phaser.Math.Distance.Between(sprite.x, sprite.y, point.x, point.y)
          + Phaser.Math.Distance.Between(point.x, point.y, target.x, target.y);
        return cost(a) - cost(b);
      });
      const waypoint = candidates[0];
      this.navigationDetours.set(sprite, {
        waypoint,
        destination: new Phaser.Math.Vector2(target.x, target.y),
      });
      return waypoint;
    }
    return target;
  }

  private segmentIntersectsRectangle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rectangle: Phaser.Geom.Rectangle,
  ): boolean {
    let near = 0;
    let far = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const axes: Array<[number, number, number]> = [
      [x1, dx, rectangle.left],
      [x1, dx, rectangle.right],
      [y1, dy, rectangle.top],
      [y1, dy, rectangle.bottom],
    ];

    for (let index = 0; index < axes.length; index += 2) {
      const [origin, delta, minimum] = axes[index];
      const maximum = axes[index + 1][2];
      if (Math.abs(delta) < 0.0001) {
        if (origin < minimum || origin > maximum) return false;
        continue;
      }
      const first = (minimum - origin) / delta;
      const second = (maximum - origin) / delta;
      near = Math.max(near, Math.min(first, second));
      far = Math.min(far, Math.max(first, second));
      if (near > far) return false;
    }
    return far >= 0 && near <= 1;
  }

  private createBoulder(x: number, y: number): void {
    this.add.ellipse(x, y + 16, 54, 18, 0x36513a, 0.35).setDepth(2);
    const boulder = this.add.graphics().setDepth(3);
    const outline = [
      new Phaser.Math.Vector2(x - 25, y + 13),
      new Phaser.Math.Vector2(x - 20, y - 8),
      new Phaser.Math.Vector2(x - 7, y - 20),
      new Phaser.Math.Vector2(x + 14, y - 17),
      new Phaser.Math.Vector2(x + 26, y - 2),
      new Phaser.Math.Vector2(x + 21, y + 15),
    ];
    boulder.fillStyle(0x52606a, 1);
    boulder.fillPoints(outline, true);
    boulder.fillStyle(0x77858e, 1);
    boulder.fillTriangle(x - 18, y - 7, x - 7, y - 17, x + 5, y - 6);
    boulder.fillStyle(0x3d4851, 1);
    boulder.fillTriangle(x + 5, y - 6, x + 23, y - 1, x + 19, y + 12);
    boulder.lineStyle(3, 0x27323a, 1);
    boulder.strokePoints(outline, true);
  }

  private removeHero(hero: HeroUnit): void {
    const index = this.heroes.indexOf(hero);
    if (index >= 0) this.heroes.splice(index, 1);
    hero.sprite.destroy();
    hero.label.destroy();
    hero.hitTarget.destroy();
    hero.targetRing.destroy();
    hero.healthObjects.background.destroy();
    hero.healthObjects.fill.destroy();
  }

  private openShop(mode: ShopMode): void {
    if (this.shopOpen || this.gameOver) return;
    this.shopMode = mode;
    this.shopOpen = true;
    this.goblin?.sprite.setVelocity(0, 0);
    this.companion?.sprite.setVelocity(0, 0);
    for (const worker of this.workers) worker.sprite.setVelocity(0, 0);
    for (const hero of this.heroes) hero.sprite.setVelocity(0, 0);
    this.physics.world.pause();
    this.time.paused = true;
    this.tweens.pauseAll();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private closeShop(): void {
    if (!this.shopOpen) return;
    this.shopContainer?.destroy(true);
    this.shopContainer = undefined;
    this.shopOpen = false;
    this.time.paused = false;
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.updateAccessibilityState();
  }

  private renderShop(): void {
    this.shopContainer?.destroy(true);
    const portrait = this.scale.height > this.scale.width;
    const width = this.scale.width;
    const height = this.scale.height;
    const top = portrait ? 54 : 12;
    const panelHeight = portrait ? height - 70 : height - 24;
    const panelWidth = portrait ? width - 24 : width - 36;
    const container = this.add.container(0, 0).setDepth(50);
    this.shopContainer = container;

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x08100a, 0.78)
      .setInteractive();
    overlay.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => event.stopPropagation());
    const panel = this.add
      .rectangle(width / 2, top + panelHeight / 2, panelWidth, panelHeight, 0x17271b, 1)
      .setStrokeStyle(3, 0x9bc865, 1);
    const shopTitle = this.shopMode === 'smithy'
      ? 'GOBLIN SMITHY'
      : this.shopMode === 'medic'
        ? 'MEDIC TENT'
        : 'GOBLIN HOME';
    const title = this.add
      .text(width / 2, top + 16, shopTitle, {
        fontFamily: 'monospace',
        fontSize: portrait ? '15px' : '14px',
        color: '#d7ef8c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    const inventory = this.add
      .text(width / 2, top + 42, `WOOD ${this.wood}   ·   STONE ${this.stone}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fff1c7',
      })
      .setOrigin(0.5, 0);
    container.add([overlay, panel, title, inventory]);

    if (this.shopMode === 'smithy') {
      this.renderSmithyShop(container, top, panelHeight, panelWidth);
      return;
    }
    if (this.shopMode === 'medic') {
      this.renderMedicTent(container, top, panelHeight, panelWidth);
      return;
    }

    const upgradeY = portrait ? top + 105 : top + 88;
    this.createShopButton(
      container,
      width / 2 - (portrait ? 101 : 165),
      upgradeY,
      portrait ? 190 : 310,
      portrait ? 70 : 48,
      this.smithyBuilt
        ? 'SMITHY BUILT\nTAP WORKSHOP TO UPGRADE'
        : `BUILD SMITHY\n${SMITHY_COST.wood} WOOD + ${SMITHY_COST.stone} STONE`,
      !this.smithyBuilt && this.canAfford(SMITHY_COST),
      () => this.purchaseSmithy(),
    );
    this.createShopButton(
      container,
      width / 2 + (portrait ? 101 : 165),
      upgradeY,
      portrait ? 190 : 310,
      portrait ? 70 : 48,
      this.medicTentBuilt
        ? 'MEDIC TENT BUILT\nTAP TENT TO HEAL'
        : `BUILD MEDIC TENT\n${MEDIC_TENT_COST.wood} WOOD + ${MEDIC_TENT_COST.stone} STONE`,
      !this.medicTentBuilt && this.canAfford(MEDIC_TENT_COST),
      () => this.purchaseMedicTent(),
    );

    const hireHeadingY = portrait ? top + 155 : top + 124;
    const hireHeading = this.add
      .text(width / 2, hireHeadingY, `COMBAT GOBLIN · ${GOBLIN_HIRE_COST.wood} WOOD + ${GOBLIN_HIRE_COST.stone} STONE`, {
        fontFamily: 'monospace',
        fontSize: portrait ? '9px' : '10px',
        color: '#bfe7ff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    container.add(hireHeading);

    if (this.hiredKind) {
      const hired = COMPANION_DEFINITIONS[this.hiredKind];
      const status = this.add
        .text(width / 2, portrait ? top + 230 : top + 165, `${hired.name.toUpperCase()} HIRED\n${WEAPONS[hired.weapon].label.toUpperCase()} · AUTO-ATTACKS NEAREST HERO`, {
          fontFamily: 'monospace',
          fontSize: portrait ? '11px' : '9px',
          color: '#73c7ff',
          fontStyle: 'bold',
          align: 'center',
          lineSpacing: 6,
        })
        .setOrigin(0.5);
      container.add(status);
    } else {
      const canHire = this.canAfford(GOBLIN_HIRE_COST);
      const kinds: HireKind[] = ['warrior', 'archer', 'mage'];
      kinds.forEach((kind, index) => {
        const definition = COMPANION_DEFINITIONS[kind];
        const x = portrait
          ? index < 2 ? width / 2 + (index === 0 ? -82 : 82) : width / 2
          : width / 2 + (index - 1) * 188;
        const y = portrait
          ? index < 2 ? top + 205 : top + 270
          : top + 165;
        const style = WEAPONS[definition.weapon].projectile ? 'RANGED' : 'MELEE';
        this.createShopButton(
          container,
          x,
          y,
          portrait ? 145 : 172,
          54,
          `${definition.name.toUpperCase()}\n${WEAPONS[definition.weapon].label.toUpperCase()} · ${style}`,
          canHire,
          () => this.purchaseCompanion(kind),
        );
      });
    }

    const workerHeading = this.add
      .text(width / 2, portrait ? top + 318 : top + 210, `RESOURCE GOBLINS · ${GOBLIN_HIRE_COST.wood} WOOD + ${GOBLIN_HIRE_COST.stone} STONE EACH`, {
        fontFamily: 'monospace',
        fontSize: portrait ? '9px' : '10px',
        color: '#ffe39a',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    container.add(workerHeading);

    const workerKinds: WorkerKind[] = ['woodcutter', 'miner'];
    workerKinds.forEach((kind, index) => {
      const definition = WORKER_DEFINITIONS[kind];
      const hired = this.hiredWorkers.includes(kind);
      const canHire = !hired && this.canAfford(GOBLIN_HIRE_COST);
      this.createShopButton(
        container,
        width / 2 + (index === 0 ? -1 : 1) * (portrait ? 82 : 142),
        portrait ? top + 365 : top + 248,
        portrait ? 145 : 260,
        portrait ? 60 : 50,
        hired
          ? `${definition.name.toUpperCase()} HIRED\n+1 ${definition.resourceKind.toUpperCase()} EVERY 2s`
          : `HIRE ${definition.name.toUpperCase()}\n+1 ${definition.resourceKind.toUpperCase()} EVERY 2s`,
        canHire,
        () => this.purchaseWorker(kind),
      );
    });

    this.createShopButton(
      container,
      width / 2,
      top + panelHeight - 28,
      portrait ? 190 : 150,
      38,
      'CLOSE',
      true,
      () => this.closeShop(),
    );
  }

  private renderSmithyShop(
    container: Phaser.GameObjects.Container,
    top: number,
    panelHeight: number,
    panelWidth: number,
  ): void {
    const portrait = this.scale.height > this.scale.width;
    const width = this.scale.width;
    const weaponCost = this.getUpgradeCost(this.weapon);
    const weaponLevel = this.weaponUpgrades[this.weapon];
    const weaponDamage = WEAPONS[this.weapon].damage + weaponLevel * 5;
    const weaponAtMax = weaponLevel >= MAX_WEAPON_UPGRADE;
    const weaponCostLabel = [
      weaponCost.wood > 0 ? `${weaponCost.wood} WOOD` : '',
      weaponCost.stone > 0 ? `${weaponCost.stone} STONE` : '',
    ].filter(Boolean).join(' + ');
    this.createShopButton(
      container,
      width / 2,
      portrait ? top + 145 : top + 115,
      portrait ? panelWidth - 38 : 360,
      portrait ? 82 : 68,
      weaponAtMax
        ? `${WEAPONS[this.weapon].label.toUpperCase()} · MAX LEVEL ${MAX_WEAPON_UPGRADE}\n${weaponDamage} DAMAGE`
        : `UPGRADE ${WEAPONS[this.weapon].label.toUpperCase()} · LV ${weaponLevel} → ${weaponLevel + 1}\n${weaponDamage} → ${weaponDamage + 5} DAMAGE · ${weaponCostLabel}`,
      !weaponAtMax && this.canAfford(weaponCost),
      () => this.purchaseWeaponUpgrade(),
    );

    const armorCost = this.getArmorUpgradeCost();
    const armorAtMax = this.armorLevel >= MAX_ARMOR_UPGRADE;
    this.createShopButton(
      container,
      width / 2,
      portrait ? top + 270 : top + 205,
      portrait ? panelWidth - 38 : 360,
      portrait ? 82 : 68,
      armorAtMax
        ? `ARMOR · MAX LEVEL ${MAX_ARMOR_UPGRADE}\n-${this.armorLevel * ARMOR_REDUCTION_PER_LEVEL} DAMAGE PER HIT`
        : `UPGRADE ARMOR · LV ${this.armorLevel} → ${this.armorLevel + 1}\n-${(this.armorLevel + 1) * ARMOR_REDUCTION_PER_LEVEL} DAMAGE PER HIT · ${armorCost.wood} WOOD + ${armorCost.stone} STONE`,
      !armorAtMax && this.canAfford(armorCost),
      () => this.purchaseArmorUpgrade(),
    );

    this.createShopButton(
      container,
      width / 2,
      top + panelHeight - 28,
      portrait ? 190 : 150,
      38,
      'CLOSE',
      true,
      () => this.closeShop(),
    );
  }

  private renderMedicTent(
    container: Phaser.GameObjects.Container,
    top: number,
    panelHeight: number,
    panelWidth: number,
  ): void {
    const portrait = this.scale.height > this.scale.width;
    const width = this.scale.width;
    const health = this.goblin?.health ?? 0;
    const missingHealth = GOBLIN_MAX_HEALTH - health;
    const healAmount = Math.min(HEAL_AMOUNT, missingHealth);
    const canHeal = Boolean(this.goblin?.alive) && missingHealth > 0 && this.wood >= HEAL_COST;
    this.createShopButton(
      container,
      width / 2,
      portrait ? top + 165 : top + 135,
      portrait ? panelWidth - 38 : 380,
      portrait ? 92 : 74,
      missingHealth <= 0
        ? `GOBLIN HP ${health}/${GOBLIN_MAX_HEALTH}\nALREADY AT FULL HEALTH`
        : `HEAL ${healAmount} HP · ${HEAL_COST} WOOD\nGOBLIN HP ${health}/${GOBLIN_MAX_HEALTH}`,
      canHeal,
      () => this.purchaseHealing(),
    );
    this.createShopButton(
      container,
      width / 2,
      top + panelHeight - 28,
      portrait ? 190 : 150,
      38,
      'CLOSE',
      true,
      () => this.closeShop(),
    );
  }

  private createShopButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    enabled: boolean,
    action: () => void,
  ): void {
    const button = this.add
      .rectangle(x, y, width, height, enabled ? 0x456d35 : 0x303832, 1)
      .setStrokeStyle(2, enabled ? 0xc6e67b : 0x596159, 1)
      .setInteractive({ useHandCursor: enabled });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: this.scale.height > this.scale.width ? '10px' : '9px',
        color: enabled ? '#fff4cf' : '#899188',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 3,
        wordWrap: { width: width - 12 },
      })
      .setOrigin(0.5);
    const activate = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ): void => {
      event.stopPropagation();
      if (enabled) action();
    };
    button.on('pointerdown', activate);
    text.setInteractive({ useHandCursor: enabled }).on('pointerdown', activate);
    container.add([button, text]);
  }

  private getUpgradeCost(weapon: WeaponKind): { wood: number; stone: number } {
    const level = this.weaponUpgrades[weapon];
    if (weapon === 'sword') return { wood: 0, stone: 10 + level * 10 };
    if (weapon === 'bow') return { wood: 10 + level * 10, stone: 0 };
    return { wood: 5 + level * 5, stone: 5 + level * 5 };
  }

  private getArmorUpgradeCost(): { wood: number; stone: number } {
    const cost = 10 + this.armorLevel * 10;
    return { wood: cost, stone: cost };
  }

  private canAfford(cost: { wood: number; stone: number }): boolean {
    return this.wood >= cost.wood && this.stone >= cost.stone;
  }

  private purchaseWeaponUpgrade(): void {
    if (this.weaponUpgrades[this.weapon] >= MAX_WEAPON_UPGRADE) return;
    const cost = this.getUpgradeCost(this.weapon);
    if (!this.canAfford(cost)) return;
    this.wood -= cost.wood;
    this.stone -= cost.stone;
    this.weaponUpgrades[this.weapon] += 1;
    this.goblin?.sprite.setTexture(
      createGoblinTexture(this, this.weapon, 'player-goblin', this.weaponUpgrades[this.weapon]),
    );
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private purchaseSmithy(): void {
    if (this.smithyBuilt || !this.canAfford(SMITHY_COST)) return;
    this.wood -= SMITHY_COST.wood;
    this.stone -= SMITHY_COST.stone;
    this.smithyBuilt = true;
    this.createSmithy();
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private purchaseMedicTent(): void {
    if (this.medicTentBuilt || !this.canAfford(MEDIC_TENT_COST)) return;
    this.wood -= MEDIC_TENT_COST.wood;
    this.stone -= MEDIC_TENT_COST.stone;
    this.medicTentBuilt = true;
    this.createMedicTent();
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private purchaseHealing(): void {
    const goblin = this.goblin;
    if (!goblin?.alive || goblin.health >= GOBLIN_MAX_HEALTH || this.wood < HEAL_COST) return;
    this.wood -= HEAL_COST;
    goblin.health = Math.min(GOBLIN_MAX_HEALTH, goblin.health + HEAL_AMOUNT);
    this.savedGoblinHealth = goblin.health;
    this.setHealthBar(goblin.healthObjects, goblin.health, GOBLIN_MAX_HEALTH);
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private purchaseArmorUpgrade(): void {
    if (this.armorLevel >= MAX_ARMOR_UPGRADE) return;
    const cost = this.getArmorUpgradeCost();
    if (!this.canAfford(cost)) return;
    this.wood -= cost.wood;
    this.stone -= cost.stone;
    this.armorLevel += 1;
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private purchaseCompanion(kind: HireKind): void {
    const cost = GOBLIN_HIRE_COST;
    if (this.hiredKind || !this.canAfford(cost)) return;
    this.wood -= cost.wood;
    this.stone -= cost.stone;
    this.hiredKind = kind;
    this.createCompanion(kind);
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private purchaseWorker(kind: WorkerKind): void {
    const cost = GOBLIN_HIRE_COST;
    if (this.hiredWorkers.includes(kind) || !this.canAfford(cost)) return;
    this.wood -= cost.wood;
    this.stone -= cost.stone;
    this.hiredWorkers.push(kind);
    this.createWorker(kind);
    this.persistProgress();
    this.renderShop();
    this.updateAccessibilityState();
  }

  private persistProgress(): void {
    saveProgress({
      wood: this.wood,
      stone: this.stone,
    });
  }

  private showGameOver(): void {
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x0b100c,
      0.76,
    ).setDepth(30);
    const title = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 38, 'GOBLIN DEFEATED', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff9b85',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(31);
    const button = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2 + 24, 170, 48, 0x6d9d3f, 1)
      .setStrokeStyle(2, 0xd7ef8c, 1)
      .setDepth(31)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 24, 'TRY AGAIN', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#101b13',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });
    const restart = (): void => {
      this.scene.restart({
        ...this.getRestartData(),
        score: 0,
        armorLevel: 0,
        weaponUpgrades: { sword: 0, bow: 0, staff: 0 },
        smithyBuilt: false,
        medicTentBuilt: false,
        resourceLayout: undefined,
        goblinHealth: GOBLIN_MAX_HEALTH,
      });
    };
    button.on('pointerdown', restart);
    label.on('pointerdown', restart);
    overlay.setInteractive();
    title.setVisible(true);
  }

  private updateAccessibilityState(): void {
    const goblin = this.goblin;
    const order = this.shopOpen ? `shopping at ${this.shopMode}` : this.command?.type ?? 'idle';
    const weaponLevel = this.weaponUpgrades[this.weapon];
    const weaponDamage = WEAPONS[this.weapon].damage + weaponLevel * 5;
    const companionStatus = this.companion
      ? `${this.companion.kind}, health ${this.companion.health} of ${GOBLIN_MAX_HEALTH}`
      : 'none';
    const workerStatus = this.workers.length > 0
      ? this.workers.map((worker) => `${worker.kind} health ${worker.health}`).join(', ')
      : 'none';
    const canvas = this.game.canvas;
    canvas.setAttribute('role', 'application');
    canvas.tabIndex = 0;
    canvas.setAttribute(
      'aria-label',
      `Goblin Village Level 1. Score ${this.score}. Weapon ${this.weapon}, upgrade level ${weaponLevel}, damage ${weaponDamage}. Armor level ${this.armorLevel}, reducing each hit by ${this.armorLevel * ARMOR_REDUCTION_PER_LEVEL}. Smithy ${this.smithyBuilt ? 'built' : 'not built'}. Medic tent ${this.medicTentBuilt ? 'built' : 'not built'}. Goblin health ${goblin?.health ?? 0} of ${GOBLIN_MAX_HEALTH}. Wood ${this.wood}. Stone ${this.stone}. Current order ${order}. Hired fighter ${companionStatus}. Resource workers ${workerStatus}. Resource nodes ${this.resources.length}. Active heroes ${this.heroes.filter((hero) => hero.alive).length}.`,
    );
    canvas.dataset.scene = 'level-one';
    canvas.dataset.weapon = this.weapon;
    canvas.dataset.attackStyle = WEAPONS[this.weapon].projectile ? 'projectile' : 'melee';
    canvas.dataset.weaponLevel = String(weaponLevel);
    canvas.dataset.weaponDamage = String(weaponDamage);
    canvas.dataset.armorLevel = String(this.armorLevel);
    canvas.dataset.smithyBuilt = String(this.smithyBuilt);
    canvas.dataset.medicTentBuilt = String(this.medicTentBuilt);
    canvas.dataset.goblinHealth = String(goblin?.health ?? 0);
    canvas.dataset.wood = String(this.wood);
    canvas.dataset.stone = String(this.stone);
    canvas.dataset.score = String(this.score);
    canvas.dataset.order = order;
    canvas.dataset.shopOpen = String(this.shopOpen);
    canvas.dataset.companion = this.companion?.kind ?? 'none';
    canvas.dataset.companionHealth = String(this.companion?.health ?? 0);
    canvas.dataset.workers = this.workers.map((worker) => worker.kind).join(',') || 'none';
    canvas.dataset.resourceNodes = String(this.resources.length);
    canvas.dataset.activeHeroes = String(this.heroes.filter((hero) => hero.alive).length);
  }
}
