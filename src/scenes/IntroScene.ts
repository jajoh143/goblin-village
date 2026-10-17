import Phaser from 'phaser';
import {
  createGoblinTexture,
  isWeaponKind,
  MAX_WEAPON_UPGRADE,
  WEAPONS,
  type WeaponKind,
} from '../game/goblinAppearance';
import { loadProgress, type WeaponUpgradeLevels } from '../game/playerProgress';

interface IntroData {
  weapon?: WeaponKind;
}

interface WeaponButton {
  weapon: WeaponKind;
  panel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class IntroScene extends Phaser.Scene {
  private weapon: WeaponKind = 'sword';
  private readonly weaponButtons: WeaponButton[] = [];
  private preview?: Phaser.GameObjects.Image;
  private weaponUpgrades: WeaponUpgradeLevels = { sword: 0, bow: 0, staff: 0 };

  constructor() {
    super('intro');
  }

  init(data: IntroData): void {
    const progress = loadProgress();
    this.weapon = isWeaponKind(data.weapon) ? data.weapon : 'sword';
    this.weaponUpgrades = {
      sword: Math.min(progress.weaponUpgrades.sword, MAX_WEAPON_UPGRADE),
      bow: Math.min(progress.weaponUpgrades.bow, MAX_WEAPON_UPGRADE),
      staff: Math.min(progress.weaponUpgrades.staff, MAX_WEAPON_UPGRADE),
    };
    this.weaponButtons.length = 0;
    this.preview = undefined;
  }

  public getRestartData(): IntroData {
    return { weapon: this.weapon };
  }

  preload(): void {
    this.load.image('roguelike-characters', 'assets/characters/roguelike-characters.png');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const portrait = height > width;
    const layout = portrait
      ? {
          titleY: 42,
          titleSize: '15px',
          weaponY: 104,
          weaponWidth: 92,
          weaponHeight: 54,
          weaponGap: 108,
          previewY: 196,
          previewScale: 5,
          copyY: 260,
          copySize: '14px',
          copySpacing: 5,
          startY: 490,
          startWidth: 240,
          startHeight: 58,
          startSize: '21px',
        }
      : {
          titleY: 28,
          titleSize: '13px',
          weaponY: 66,
          weaponWidth: 100,
          weaponHeight: 42,
          weaponGap: 118,
          previewY: 124,
          previewScale: 3.5,
          copyY: 160,
          copySize: '11px',
          copySpacing: 2,
          startY: 304,
          startWidth: 220,
          startHeight: 48,
          startSize: '18px',
        };

    this.cameras.main.setBackgroundColor('#101b13');
    const background = this.add.graphics();
    background.fillStyle(0x1b2e20, 1);
    background.fillRoundedRect(16, 16, width - 32, height - 32, 22);
    background.lineStyle(3, 0x87bb55, 0.8);
    background.strokeRoundedRect(16, 16, width - 32, height - 32, 22);

    this.add
      .text(width / 2, layout.titleY, 'CHOOSE YOUR WEAPON', {
        fontFamily: 'monospace',
        fontSize: layout.titleSize,
        color: '#d7ef8c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const startX = width / 2 - layout.weaponGap;
    (['sword', 'bow', 'staff'] as WeaponKind[]).forEach((weapon, index) => {
      const x = startX + index * layout.weaponGap;
      const panel = this.add
        .rectangle(
          x,
          layout.weaponY,
          layout.weaponWidth,
          layout.weaponHeight,
          0x263c2b,
          1,
        )
        .setStrokeStyle(2, 0x66865f, 1)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, layout.weaponY, WEAPONS[weapon].label.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fff5d6',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      panel.on('pointerdown', () => this.selectWeapon(weapon));
      label.on('pointerdown', () => this.selectWeapon(weapon));
      this.weaponButtons.push({ weapon, panel, label });
    });

    this.preview = this.add
      .image(
        width / 2,
        layout.previewY,
        createGoblinTexture(this, this.weapon, 'intro-goblin', this.weaponUpgrades[this.weapon]),
      )
      .setScale(layout.previewScale);

    const copy = this.add
      .text(width / 2, layout.copyY, 'You are goblin!\nHeroes come for XP Farm!\nStop Heroes!\nMine Resources!\nUpgrade Goblin!', {
        fontFamily: 'monospace',
        fontSize: layout.copySize,
        color: '#fff1c7',
        align: 'center',
        lineSpacing: layout.copySpacing,
        fontStyle: 'bold',
        wordWrap: { width: width - 64 },
      })
      .setOrigin(0.5, 0);

    const minimumGap = portrait ? 28 : 16;
    const startY = Math.min(
      height - layout.startHeight / 2 - 24,
      Math.max(
        layout.startY,
        copy.getBounds().bottom + layout.startHeight / 2 + minimumGap,
      ),
    );
    const startButton = this.add
      .rectangle(
        width / 2,
        startY,
        layout.startWidth,
        layout.startHeight,
        0x6d9d3f,
        1,
      )
      .setStrokeStyle(3, 0xd7ef8c, 1)
      .setInteractive({ useHandCursor: true });
    const startLabel = this.add
      .text(width / 2, startY, 'START', {
        fontFamily: 'monospace',
        fontSize: layout.startSize,
        color: '#101b13',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const start = (): void => {
      this.scene.start('level-one', { weapon: this.weapon });
    };
    startButton.on('pointerdown', start);
    startLabel.on('pointerdown', start);

    this.refreshWeaponSelection();
    this.updateAccessibilityState();
  }

  private selectWeapon(weapon: WeaponKind): void {
    this.weapon = weapon;
    this.preview?.setTexture(
      createGoblinTexture(this, weapon, 'intro-goblin', this.weaponUpgrades[weapon]),
    );
    this.refreshWeaponSelection();
    this.updateAccessibilityState();
  }

  private refreshWeaponSelection(): void {
    for (const button of this.weaponButtons) {
      const selected = button.weapon === this.weapon;
      button.panel
        .setFillStyle(selected ? 0x557c38 : 0x263c2b, 1)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xffdc69 : 0x66865f, 1);
      button.label.setColor(selected ? '#fff5d6' : '#b9c7ad');
    }
  }

  private updateAccessibilityState(): void {
    const canvas = this.game.canvas;
    canvas.setAttribute('role', 'application');
    canvas.tabIndex = 0;
    canvas.setAttribute(
      'aria-label',
      `Goblin Village intro. Selected weapon: ${this.weapon}, upgrade level ${this.weaponUpgrades[this.weapon]}. Choose sword, bow, or staff, then press Start.`,
    );
    canvas.dataset.scene = 'intro';
    canvas.dataset.selectedWeapon = this.weapon;
    canvas.dataset.selectedWeaponLevel = String(this.weaponUpgrades[this.weapon]);
  }
}
