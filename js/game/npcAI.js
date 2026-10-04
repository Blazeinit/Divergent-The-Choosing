/* ==========================================================================
   DIVERGENT — NPC behaviour
   Schedules (data) → tasks → grid paths. Level-of-detail throttling keeps
   distant NPCs cheap. Also: ambient NPC↔NPC conversations, greetings and
   reactive barks, and "snap to time" for loading / waiting / sim return.

   Schedule entry: { t:'08:30', do:'arrive'|'go'|'wander'|'patrol'|'leave'|'talk',
                     to:'spotId', act:'sit'|..., room:'roomId', route:[...], with:'npcId' }
   ========================================================================== */
(function () {
  'use strict';
  const DV = window.DV;
  const U = DV.U;
  const NC = DV.Config.NPC;

  const AI = {
    convos: {},
    reactCooldown: 0,

    zone() {
      return DV.World.current;
    },

    scheduleFor(npc) {
      const d = npc.def;
      const st = DV.State.npc(npc.id);
      if (st.override) return { key: 'ovr', list: [Object.assign({ t: '00:00' }, st.override)] };
      if (d.onlyDay && DV.Clock.day() !== d.onlyDay) return { key: 'none', list: [] };
      if (d.schedules) {
        const c = DV.Dialogue.makeCtx({ npcId: npc.id });
        for (let i = 0; i < d.schedules.length; i++) {
          const v = d.schedules[i];
          if (!v.if || v.if(c)) return { key: 'v' + i, list: v.list };
        }
      }
      return { key: 'base', list: d.schedule || [] };
    },
    entryNow(npc) {
      const s = this.scheduleFor(npc);
      const now = DV.Clock.minutes();
      let idx = -1;
      for (let i = 0; i < s.list.length; i++) if (U.parseTime(s.list[i].t) <= now) idx = i;
      if (idx < 0) return { entry: null, key: s.key + ':pre:' + DV.Clock.day() };
      return { entry: s.list[idx], key: s.key + ':' + idx + ':' + DV.Clock.day() + (s.key === 'ovr' ? ':' + JSON.stringify(s.list[0]) : '') };
    },

    /* ------------------------------ tasks ------------------------------ */
    refresh(npc, snap) {
      const { entry, key } = this.entryNow(npc);
      if (key === npc.taskKey && !snap) return;
      npc.taskKey = key;
      npc.task = entry;
      this.startTask(npc, entry, snap);
    },
    releaseSpot(npc) {
      if (npc.spot && npc.spot.occupant === npc.id) npc.spot.occupant = null;
      npc.spot = null;
    },
    spawnAt(npc, x, z, rot) {
      npc.present = true;
      npc.x = x; npc.z = z; npc.rot = rot || 0;
      if (npc.model) {
        npc.model.root.visible = true;
        npc.model.root.position.set(x, 0, z);
      }
    },
    despawn(npc) {
      this.releaseSpot(npc);
      npc.present = false;
      npc.mode = 'absent';
      npc.path = null;
      if (npc.model) npc.model.root.visible = false;
    },
    startTask(npc, e, snap) {
      const zone = this.zone();
      if (!zone || zone.id !== (npc.def.zone || 'testing_center')) return;
      this.releaseSpot(npc);
      npc.action = 'idle';
      npc.path = null;
      npc.talkPartner = null;
      if (!e) { this.despawn(npc); return; }
      const doIt = e.do;
      if (doIt === 'leave') {
        if (snap || !npc.present) { this.despawn(npc); return; }
        this.walkTo(npc, zone.spot('leave'), 'leave');
        return;
      }
      // anything else requires presence
      if (!npc.present) {
        if (snap) {
          npc.present = true;
        } else {
          const a = zone.spot('arrive');
          this.spawnAt(npc, a.x + U.rand(-1, 1), a.z + U.rand(-0.5, 0.5), Math.PI);
        }
      }
      if (doIt === 'go' || doIt === 'arrive' || doIt === 'talk') {
        const spot = zone.spot(e.to);
        if (!spot) { console.warn('[NPC]', npc.id, 'missing spot', e.to); this.place(npc, zone.spot('lobby_center')); return; }
        npc.targetSpot = spot;
        npc.targetAct = e.act || spot.act || 'idle';
        npc.talkPartner = e.with || null;
        if (snap) this.arrive(npc, spot, true);
        else this.walkTo(npc, spot, 'spot');
      } else if (doIt === 'wander') {
        npc.wanderRoom = e.room;
        if (snap) {
          const p = this.randomInRoom(e.room);
          if (p) { npc.x = p[0]; npc.z = p[1]; }
          npc.mode = 'waiting';
          npc.timer = U.rand(2, 8);
        } else this.nextWander(npc);
      } else if (doIt === 'patrol') {
        npc.route = e.route;
        npc.routeIdx = 0;
        npc.routeWait = e.wait || 6;
        const s = zone.spot(e.route[0]);
        if (snap && s) { npc.x = s.ax; npc.z = s.az; npc.mode = 'waiting'; npc.timer = 2; }
        else this.walkTo(npc, s, 'patrol');
      }
      this.syncModel(npc);
    },
    place(npc, spot) {
      if (!spot) return;
      npc.x = spot.ax; npc.z = spot.az; npc.rot = spot.rot;
      npc.mode = 'acting';
      this.syncModel(npc);
    },
    walkTo(npc, spot, purpose) {
      const zone = this.zone();
      if (!spot) return;
      const tx = spot.ax !== undefined ? spot.ax : spot.x, tz = spot.az !== undefined ? spot.az : spot.z;
      const path = zone.nav.findPath(npc.x, npc.z, tx, tz, (lock) => npc.canAccess(lock));
      npc.purpose = purpose;
      npc.targetSpot = purpose === 'spot' ? spot : npc.targetSpot;
      npc.walkSpot = spot;
      if (!path) {
        // unreachable: teleport (logged for QA)
        DV.log('[NPC] no path for', npc.id, 'to', spot.id);
        AI.noPath = (AI.noPath || 0) + 1;
        npc.x = tx; npc.z = tz;
        this.onPathDone(npc);
        return;
      }
      npc.path = path;
      npc.pathIdx = 1;
      npc.mode = 'walking';
      npc.stuckT = 0;
    },
    onPathDone(npc) {
      npc.path = null;
      const p = npc.purpose;
      if (p === 'leave') { this.despawn(npc); return; }
      if (p === 'spot') this.arrive(npc, npc.walkSpot, false);
      else if (p === 'wander') { npc.mode = 'waiting'; npc.timer = U.rand(5, 14); npc.action = U.pick(['idle', 'idle', 'arms_crossed', 'idle']); }
      else if (p === 'patrol') { npc.mode = 'waiting'; npc.timer = npc.routeWait; const s = npc.walkSpot; if (s) npc.rotTarget = s.rot; npc.action = 'guard'; }
    },
    arrive(npc, spot, snap) {
      const act = npc.targetAct || spot.act || 'idle';
      const SEATLIKE = ['sit', 'work', 'recline', 'lie', 'type'];
      const seated = SEATLIKE.indexOf(act) >= 0 || SEATLIKE.indexOf(spot.act) >= 0; // stand/sit at the exact spot, not the approach point
      if (spot.occupant && spot.occupant !== npc.id) {
        // occupied → queue up behind it (reception line, a seat taken by the player) and retry
        let k = 1;
        for (const o of DV.NPCs.all) if (o !== npc && o.mode === 'blockedSpot' && o.walkSpot === spot) k++;
        const back = 1.05 * k;
        npc.x = spot.ax - Math.sin(spot.rot) * back;
        npc.z = spot.az - Math.cos(spot.rot) * back;
        npc.rotTarget = spot.rot;
        if (!snap) npc.rot = spot.rot;
        npc.mode = 'blockedSpot';
        npc.timer = 3;
        npc.action = 'idle';
        this.syncModel(npc);
        return;
      }
      spot.occupant = npc.id;
      npc.spot = spot;
      if (seated) {
        npc.seatFrom = snap ? null : [npc.x, npc.z];
        npc.seatT = snap ? 1 : 0;
        npc.x = snap ? spot.x : npc.x;
        npc.z = snap ? spot.z : npc.z;
        npc.rot = spot.rot;
        npc.action = act === 'idle' ? spot.act : act;
        npc.seatY = spot.seatY || 0.45;
      } else {
        npc.x = spot.ax; npc.z = spot.az;
        npc.rotTarget = spot.rot;
        if (snap) npc.rot = spot.rot;
        npc.action = act === 'stand' ? 'idle' : act;
      }
      npc.mode = 'acting';
      this.syncModel(npc);
    },
    nextWander(npc) {
      const p = this.randomInRoom(npc.wanderRoom);
      if (!p) { npc.mode = 'waiting'; npc.timer = 5; return; }
      this.walkTo(npc, { x: p[0], z: p[1], ax: p[0], az: p[1], rot: 0, id: 'wander' }, 'wander');
    },
    randomInRoom(roomId) {
      const zone = this.zone();
      const r = zone.roomMap[roomId];
      if (!r) return null;
      return zone.nav.randomPointInRect(r);
    },

    /* ------------------------------ per-frame ------------------------------ */
    update(dt, player) {
      const zone = this.zone();
      if (!zone) return;
      const npcs = DV.NPCs.all;
      this.reactCooldown -= dt;
      let crowd = 0;
      for (const npc of npcs) {
        if ((npc.def.zone || 'testing_center') !== zone.id || !npc.model) continue;
        if (!npc.present) { if (npc.model.root.visible) npc.model.root.visible = false; continue; }
        const dx = npc.x - player.x, dz = npc.z - player.z;
        npc.dist = Math.sqrt(dx * dx + dz * dz);
        if (npc.dist < 14) crowd++;
        const visible = npc.dist < NC.cullDist;
        npc.model.root.visible = visible;
        // LOD
        let step = dt, animate = true;
        if (npc.dist > NC.midUpdateDist) {
          npc.lodAcc += dt;
          if (npc.lodAcc < 0.25) continue;
          step = npc.lodAcc; npc.lodAcc = 0; animate = false;
          npc.lod = 'far';
        } else if (npc.dist > NC.fullUpdateDist) {
          npc.lod = 'mid';
          npc.animAcc = (npc.animAcc || 0) + dt;
          animate = npc.animAcc > 0.05;
        } else npc.lod = 'full';
        this.think(npc, step, player, zone);
        this.syncModel(npc);
        if (animate && visible) {
          const adt = npc.lod === 'mid' ? npc.animAcc : step;
          npc.animAcc = 0;
          npc.model.animate(Math.min(adt, 0.1), {
            speed: npc.speed,
            action: npc.mode === 'walking' ? 'idle' : npc.action,
            seatY: npc.seatY,
            lookYaw: npc.lookYaw,
            talking: npc.mode === 'talking' ? DV.Game && DV.Game.npcSpeaking === npc.id : !!(npc.bark && npc.bark.until > performance.now()),
          });
        }
        // lighting tint
        npc.tintAcc = (npc.tintAcc || 1) + step;
        if (npc.tintAcc > 0.3) {
          npc.tintAcc = 0;
          const L = zone.lightAt(npc.x, npc.z);
          for (let k = 0; k < 3; k++) npc.tint[k] = U.lerp(npc.tint[k], U.clamp(L[k] * 0.85, 0.25, 1.25), 0.5);
          npc.model.setTint(npc.tint[0], npc.tint[1], npc.tint[2]);
        }
      }
      DV.Audio.setCrowd(crowd);
      this.updateConversations(dt, player);
    },

    think(npc, dt, player, zone) {
      npc.speed = 0;
      switch (npc.mode) {
        case 'walking': this.followPath(npc, dt, player); break;
        case 'waiting':
          npc.timer -= dt;
          if (npc.rotTarget !== undefined) npc.rot = U.dampAngle(npc.rot, npc.rotTarget, 4, dt);
          if (npc.timer <= 0) {
            if (npc.task && npc.task.do === 'wander') this.nextWander(npc);
            else if (npc.task && npc.task.do === 'patrol') {
              npc.routeIdx = (npc.routeIdx + 1) % npc.route.length;
              this.walkTo(npc, zone.spot(npc.route[npc.routeIdx]), 'patrol');
            }
          }
          break;
        case 'blockedSpot':
          npc.timer -= dt;
          if (npc.timer <= 0) {
            const s = npc.walkSpot;
            if (s && (!s.occupant || s.occupant === npc.id)) this.arrive(npc, s, false);
            else npc.timer = 3;
          }
          break;
        case 'acting':
          if (npc.seatFrom && npc.seatT < 1) {
            npc.seatT = Math.min(1, npc.seatT + dt * 2.5);
            const s = npc.spot;
            npc.x = U.lerp(npc.seatFrom[0], s.x, npc.seatT);
            npc.z = U.lerp(npc.seatFrom[1], s.z, npc.seatT);
            npc.rot = U.dampAngle(npc.rot, s.rot, 10, dt);
          } else if (npc.rotTarget !== undefined && npc.action !== 'sit') {
            npc.rot = U.dampAngle(npc.rot, npc.rotTarget, 5, dt);
          }
          // face conversation partner
          if (npc.talkPartner) {
            const p = DV.NPCs.get(npc.talkPartner);
            if (p && p.present && U.dist(p.x, p.z, npc.x, npc.z) < 3.5 && npc.action !== 'sit') npc.rotTarget = U.yawTo(npc.x, npc.z, p.x, p.z);
          }
          break;
        case 'talking':
          npc.rot = U.dampAngle(npc.rot, U.yawTo(npc.x, npc.z, player.x, player.z), npc.action === 'sit' || npc.action === 'work' ? 0 : 6, dt);
          break;
      }
      // head tracking toward the player
      let look = 0;
      if (player && npc.dist < 4 && npc.mode !== 'walking') {
        const want = U.yawTo(npc.x, npc.z, player.x, player.z);
        const d = U.wrapAngle(want - npc.rot);
        if (Math.abs(d) < 1.6) look = d;
      } else if (npc.talkPartner && npc.mode === 'acting') {
        const p = DV.NPCs.get(npc.talkPartner);
        if (p && p.present) {
          const d = U.wrapAngle(U.yawTo(npc.x, npc.z, p.x, p.z) - npc.rot);
          if (Math.abs(d) < 1.6) look = d;
        }
      }
      npc.lookYaw = look;
      if (npc.dist < 6 && npc.mode !== 'talking') this.maybeBark(npc, dt, player, zone);
    },

    followPath(npc, dt, player) {
      const p = npc.path;
      if (!p) { npc.mode = 'acting'; return; }
      const tgt = p[npc.pathIdx];
      if (!tgt) { this.onPathDone(npc); return; }
      // yield to the player standing right in front
      if (player && npc.dist < 0.75) {
        const fx = Math.sin(npc.rot), fz = Math.cos(npc.rot);
        const dot = ((player.x - npc.x) * fx + (player.z - npc.z) * fz) / Math.max(0.01, npc.dist);
        if (dot > 0.55) {
          npc.blockedT += dt;
          if (npc.blockedT < 1.6) {
            if (npc.blockedT > 0.6 && !npc.saidExcuse) { npc.say(U.pick(['Excuse me.', 'Pardon.', 'Coming through.', 'Mind out.'])); npc.saidExcuse = true; }
            return;
          }
        }
      } else { npc.blockedT = 0; npc.saidExcuse = false; }
      const dx = tgt[0] - npc.x, dz = tgt[1] - npc.z;
      const d = Math.hypot(dx, dz);
      const sp = (npc.def.walkSpeed || NC.walkSpeed) * (npc.task && npc.task.hurry ? 1.6 : 1);
      if (d < 0.12) {
        npc.pathIdx++;
        if (npc.pathIdx >= p.length) this.onPathDone(npc);
        return;
      }
      const stepLen = Math.min(d, sp * dt);
      npc.x += (dx / d) * stepLen;
      npc.z += (dz / d) * stepLen;
      npc.speed = stepLen / Math.max(dt, 1e-4);
      npc.rot = U.dampAngle(npc.rot, Math.atan2(dx, dz), 8, dt);
      // stuck safety
      npc.stuckT = (npc.stuckT || 0) + dt;
      if (npc.stuckT > 40) { npc.x = p[p.length - 1][0]; npc.z = p[p.length - 1][1]; this.onPathDone(npc); }
    },

    syncModel(npc) {
      if (!npc.model) return;
      npc.model.root.position.set(npc.x, 0, npc.z);
      npc.model.root.rotation.y = npc.rot;
    },

    /* ------------------------------ barks ------------------------------ */
    maybeBark(npc, dt, player, zone) {
      npc.barkCooldown -= dt;
      if (DV.Dialogue.isActive() || !DV.Game || DV.Game.state !== 'playing') return;
      const now = performance.now();
      if (npc.bark && npc.bark.until > now) return;
      const room = zone.roomAt(player.x, player.z);
      const isStaff = npc.def.role === 'staff';
      // reactive: running indoors near staff
      if (isStaff && this.reactCooldown <= 0 && player.speed > 3.6 && npc.dist < 5 && room && !room.exterior) {
        npc.say(U.pick(['No running in the facility!', 'Walk, please!', 'Slow down, candidate.', 'This isn\'t the Dauntless compound — walk.']));
        this.reactCooldown = 20;
        return;
      }
      // reactive: candidate in a staff area
      if (isStaff && room && room.staffOnly && npc.dist < 6 && !DV.Game.staffWarned[room.id] && zone.roomAt(npc.x, npc.z) === room) {
        DV.Game.staffWarned[room.id] = true;
        npc.say(U.pick(['Candidates aren\'t permitted back here.', 'You shouldn\'t be in here.', 'Staff only. Out you go — kindly.']), 5);
        return;
      }
      if (npc.barkCooldown > 0 || npc.dist > 3.2) return;
      const line = DV.Barks.greeting(npc);
      if (line) npc.say(line);
      npc.barkCooldown = U.rand(50, 110);
    },

    updateConversations(dt, player) {
      // pairs of NPCs scheduled to talk to each other
      for (const npc of DV.NPCs.all) {
        if (!npc.present || npc.mode !== 'acting' || !npc.talkPartner) continue;
        const other = DV.NPCs.get(npc.talkPartner);
        if (!other || !other.present || other.mode !== 'acting' || other.talkPartner !== npc.id) continue;
        if (npc.id > other.id) continue; // one runner per pair
        const key = npc.id + '|' + other.id;
        let cv = this.convos[key];
        if (!cv) cv = this.convos[key] = { lines: null, idx: 0, timer: U.rand(1, 4) };
        if (npc.dist > 16) continue;
        cv.timer -= dt;
        if (cv.timer > 0) continue;
        if (!cv.lines || cv.idx >= cv.lines.length) {
          cv.lines = DV.Barks.conversation(npc, other);
          cv.idx = 0;
          cv.timer = U.rand(6, 14);
          continue;
        }
        const [who, text] = cv.lines[cv.idx++];
        const speaker = who === 0 ? npc : other;
        if (speaker.mode === 'acting') speaker.say(text, 4.2);
        cv.timer = U.rand(3.8, 5.2);
      }
    },

    // place every NPC where their schedule says they should be right now
    syncAll() {
      for (const npc of DV.NPCs.all) {
        if ((npc.def.zone || 'testing_center') !== (this.zone() && this.zone().id)) continue;
        npc.taskKey = null;
        this.releaseSpot(npc);
        this.refresh(npc, true);
      }
    },
    onMinute() {
      if (!this.zone()) return;
      for (const npc of DV.NPCs.all) {
        if ((npc.def.zone || 'testing_center') !== this.zone().id) continue;
        if (npc.mode === 'talking') continue;
        this.refresh(npc, false);
      }
    },
    beginTalk(npc) {
      npc.prevMode = npc.mode;
      npc.prevPath = npc.path;
      npc.mode = 'talking';
    },
    endTalk(npc) {
      if (npc.mode !== 'talking') return;
      npc.mode = npc.prevMode || 'acting';
      npc.path = npc.prevPath || null;
      if (npc.mode === 'walking' && !npc.path) npc.mode = 'acting';
      if (npc.spot && npc.mode === 'acting') npc.rot = npc.spot.rot;
      // schedule may have moved on while we talked
      this.refresh(npc, false);
    },
  };

  DV.NPCAI = AI;
})();
