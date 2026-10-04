/* ==========================================================================
   DIVERGENT — NPC runtime entities & manager
   NPC *data* lives in js/data/npcs.js. This file owns the living instances:
   their models, positions, current task and level-of-detail bookkeeping.
   Behaviour (schedules, movement, barks) lives in npcAI.js.
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const NC = DV.Config.NPC;

  DV.NPCData = {
    defs: {},
    list: [],
    add(def) {
      def.tier = def.tier || 1;
      def.access = def.access || [];
      this.defs[def.id] = def;
      this.list.push(def);
      return def;
    },
    get(id) {
      return this.defs[id];
    },
  };

  class NPC {
    constructor(def) {
      this.id = def.id;
      this.def = def;
      this.model = null;
      this.x = 0; this.z = 0; this.rot = 0;
      this.present = false;
      this.task = null; // current schedule entry
      this.taskKey = null;
      this.mode = 'absent'; // absent | walking | acting | wandering | waiting | talking
      this.path = null;
      this.pathIdx = 0;
      this.action = 'idle';
      this.seatY = 0.45;
      this.spot = null;
      this.speed = 0;
      this.timer = 0;
      this.bark = null;
      this.barkCooldown = U.rand(5, 30);
      this.lookYaw = 0;
      this.lod = 'full';
      this.lodAcc = 0;
      this.dist = 999;
      this.blockedT = 0;
      this.talkPartner = null;
      this.tint = [1, 1, 1];
      this.visibleNow = false;
    }
    get name() {
      return this.def.name;
    }
    get faction() {
      return this.def.faction;
    }
    appearance() {
      const d = this.def;
      return DV.Character.fromFaction(d.faction, d.sex, d.id, Object.assign({ age: d.age }, d.appearance || {}));
    }
    ensureModel(scene) {
      if (!this.model) {
        this.model = DV.Character.create(this.appearance());
        this.model.root.name = 'npc:' + this.id;
        this.model.root.userData.npc = this;
      }
      if (scene && this.model.root.parent !== scene) scene.add(this.model.root);
      return this.model;
    }
    canAccess(lock) {
      if (!lock || lock === 'npc') return true;
      return this.def.access.indexOf(lock) >= 0 || this.def.access.indexOf('all') >= 0;
    }
    headY() {
      return this.model ? this.model.scale * 1.62 : 1.62;
    }
    say(text, secs) {
      this.bark = { text, until: performance.now() + (secs || 4.5) * 1000 };
      DV.Events.emit('npc:bark', { npc: this, text });
    }
  }

  const M = {
    all: [],
    map: {},
    scene: null,
    zoneId: null,

    init(scene) {
      this.scene = scene;
      this.all = [];
      this.map = {};
      for (const def of DV.NPCData.list) {
        const n = new NPC(def);
        this.all.push(n);
        this.map[def.id] = n;
      }
    },
    get(id) {
      return this.map[id];
    },
    // NPCs that live in the given zone (default zone is the testing center)
    inZone(zoneId) {
      return this.all.filter((n) => (n.def.zone || 'testing_center') === zoneId);
    },
    attach(zoneId) {
      this.zoneId = zoneId;
      for (const n of this.all) {
        const here = (n.def.zone || 'testing_center') === zoneId;
        if (n.model) n.model.root.visible = here && n.present;
        if (here) n.ensureModel(this.scene);
        if (n.model && !here && n.model.root.parent) n.model.root.parent.remove(n.model.root);
      }
    },
    // everything that should open doors / block the player
    agents() {
      const out = [];
      for (const n of this.all) {
        if (!n.present || !n.model || n.model.root.parent !== this.scene) continue;
        out.push({ x: n.x, z: n.z, access: (lock) => n.canAccess(lock), npc: n });
      }
      return out;
    },
    bodies(px, pz, r) {
      const out = [];
      for (const n of this.all) {
        if (!n.present || !n.model || !n.model.root.visible) continue;
        if (Math.abs(n.x - px) < r && Math.abs(n.z - pz) < r) out.push({ x: n.x, z: n.z, r: 0.28 });
      }
      return out;
    },
    // snapshot for saving
    serialize() {
      const out = {};
      for (const n of this.all) out[n.id] = { x: +n.x.toFixed(2), z: +n.z.toFixed(2), rot: +n.rot.toFixed(2), present: n.present };
      return out;
    },
  };

  DV.NPC = NPC;
  DV.NPCs = M;
  void NC;
})();
