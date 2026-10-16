export interface Vec2 {
  x: number;
  y: number;
}

export type Team = "blue" | "red";

export type Lane = "top" | "mid" | "bot";

export interface Turret {
  id: string;
  team: Team;
  lane: Lane;
  tier: 1 | 2 | 3;
  pos: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  range: number;
  damage: number;
  attackCooldown: number;
  lastAttackTime: number;
  targetId: string | null;
}

export interface Nexus {
  id: string;
  team: Team;
  pos: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface Minion {
  id: string;
  team: Team;
  lane: Lane;
  pos: Vec2;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  radius: number;
  alive: boolean;
  isRanged: boolean;
  range: number;
  attackCooldown: number;
  lastAttackTime: number;
  waypointIndex: number;
  targetId: string | null;
}

export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  damage: number;
  team: Team;
  radius: number;
  maxRange: number;
  distanceTraveled: number;
  alive: boolean;
}

export interface Player {
  id: string;
  pos: Vec2;
  vel: Vec2;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  level: number;
  xp: number;
  xpToNext: number;
  speed: number;
  radius: number;
  facing: number;
  attackCooldown: number;
  lastAttackTime: number;
  alive: boolean;
  respawnTimer: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type AbilityId = "bolt" | "shield" | "blink";

export interface Bot {
  id: string;
  team: Team;
  lane: Lane;
  pos: Vec2;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  radius: number;
  alive: boolean;
  respawnTimer: number;
  attackCooldown: number;
  lastAttackTime: number;
  waypointIndex: number;
  targetId: string | null;
  state: "farm" | "push" | "retreat";
}

export interface Golem {
  id: string;
  pos: Vec2;
  hp: number;
  maxHp: number;
  damage: number;
  radius: number;
  alive: boolean;
  respawnTimer: number;
  attackCooldown: number;
  lastAttackTime: number;
  targetId: string | null;
}

export interface AbilityEffect {
  id: string;
  type: "bolt" | "shield" | "blink" | "combo";
  pos: Vec2;
  vel: Vec2;
  damage: number;
  team: Team;
  radius: number;
  maxRange: number;
  distanceTraveled: number;
  alive: boolean;
  color: string;
  duration: number;
  elapsed: number;
}

export interface GameState {
  player: Player;
  camera: Camera;
  turrets: Turret[];
  nexusBlue: Nexus;
  nexusRed: Nexus;
  minions: Minion[];
  projectiles: Projectile[];
  abilityEffects: AbilityEffect[];
  bots: Bot[];
  golem: Golem;
  time: number;
  gameOver: boolean;
  winner: Team | null;
  lastWaveTime: number;
  waveNumber: number;
  lastAbilityUsed: { id: AbilityId; time: number } | null;
  comboActive: boolean;
  comboTimer: number;
  shieldActive: boolean;
  shieldTimer: number;
  golemBuffActive: boolean;
  golemBuffTimer: number;
}
