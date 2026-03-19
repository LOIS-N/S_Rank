"use client";

import { useEffect, useRef } from "react";

interface GachaAnimationCard {
  grade: string;
  imageUrl: string;
}

interface Props {
  cards: GachaAnimationCard[];
  onComplete: () => void;
}

export function GachaAnimationOverlay({ cards, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let game: { destroy: (b: boolean) => void } | null = null;
    let mounted = true;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (!mounted || !el) return;

      const W = 1280;
      const H = 720;
      const cardCount = cards.length;

      // Card dimensions (2:3 ratio = 700:1050)
      const CARD_W = cardCount === 1 ? 200 : 100;
      const CARD_H = Math.round(CARD_W * 1.5);

      // Layout positions
      const positions: { x: number; y: number }[] = [];
      if (cardCount === 1) {
        positions.push({ x: W / 2, y: H / 2 });
      } else {
        const cols = 5;
        const rows = 2;
        const gapX = CARD_W + 14;
        const gapY = CARD_H + 14;
        const startX = W / 2 - ((cols - 1) * gapX) / 2;
        const startY = H / 2 - ((rows - 1) * gapY) / 2 + 8;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            positions.push({ x: startX + c * gapX, y: startY + r * gapY });
          }
        }
      }

      // Shuffle drop order
      const dropOrder = Array.from({ length: cardCount }, (_, i) => i);
      for (let i = dropOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dropOrder[i], dropOrder[j]] = [dropOrder[j], dropOrder[i]];
      }

      const cardsLocal = [...cards];
      const posLocal = [...positions];

      class GachaScene extends Phaser.Scene {
        private containers: (Phaser.GameObjects.Container | null)[] = [];
        private backs: (Phaser.GameObjects.Sprite | null)[] = [];
        private fronts: (Phaser.GameObjects.Sprite | null)[] = [];
        private canSkip = false;
        private isEnding = false;
        private bg!: Phaser.GameObjects.Rectangle;
        private flyingObjects: Phaser.GameObjects.GameObject[] = [];

        constructor() {
          super({ key: "GachaScene" });
        }

        preload() {
          this.load.image("card_back", "/assets/006/portfolio_000.webp");
          cardsLocal.forEach((card, i) => {
            this.load.image(`cf_${i}`, card.imageUrl);
          });
        }

        create() {
          // Persistent dark background
          this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0);
          this.bg.setDepth(0);

          // PHASE 1: Quick blackout
          this.tweens.add({
            targets: this.bg,
            alpha: 0.88,
            duration: 250,
            ease: "Quad.easeIn",
          });

          // PHASE 2: Epic resume storm (0.25s ~ 2.4s)
          this.time.delayedCall(250, () => this.startResumeStorm());

          // PHASE 3: Cards drop
          this.time.delayedCall(2400, () => this.startCardDrop());

          // Skip
          this.time.delayedCall(1200, () => { this.canSkip = true; });
          this.input.on("pointerdown", () => {
            if (this.canSkip && !this.isEnding) this.skipToEnd();
          });
        }

        // =============================================
        // PHASE 2 — Epic resume storm
        // =============================================
        private startResumeStorm() {
          // Textures for wind/particles
          if (!this.textures.exists("streak")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 30, 2);
            g.generateTexture("streak", 30, 2);
            g.destroy();
          }
          if (!this.textures.exists("sparkDot")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(3, 3, 3);
            g.generateTexture("sparkDot", 6, 6);
            g.destroy();
          }

          // ---- WAVE 1: Resumes raining down from above ----
          const wave1Count = 18;
          for (let i = 0; i < wave1Count; i++) {
            const resume = this.add.sprite(0, 0, "card_back");
            const scale = 0.6 + Math.random() * 0.5;
            resume.setDisplaySize(CARD_W * scale, CARD_H * scale);
            const sx = Math.random() * W;
            resume.setPosition(sx, -150 - Math.random() * 500);
            resume.setRotation((Math.random() - 0.5) * 1.2);
            resume.setAlpha(0);
            resume.setDepth(2 + i);
            this.flyingObjects.push(resume);

            // Fade in + fall
            this.tweens.add({
              targets: resume,
              alpha: 0.5 + Math.random() * 0.4,
              duration: 200,
              delay: i * 50,
            });

            // Dramatic fall with drift
            const drift = (Math.random() - 0.5) * 300;
            this.tweens.add({
              targets: resume,
              x: sx + drift,
              y: H + 200 + Math.random() * 300,
              rotation: resume.rotation + (Math.random() - 0.5) * 6,
              duration: 1200 + Math.random() * 800,
              delay: i * 50,
              ease: "Quad.easeIn",
            });
          }

          // ---- WAVE 2: Sideways burst from center (0.3s later) ----
          this.time.delayedCall(300, () => {
            const wave2Count = 14;
            for (let i = 0; i < wave2Count; i++) {
              const resume = this.add.sprite(W / 2, H / 2, "card_back");
              const scale = 0.4 + Math.random() * 0.5;
              resume.setDisplaySize(CARD_W * scale, CARD_H * scale);
              resume.setAlpha(0);
              resume.setDepth(20 + i);
              this.flyingObjects.push(resume);

              // Explode outward from center
              const angle = Math.random() * Math.PI * 2;
              const dist = 500 + Math.random() * 600;
              const endX = W / 2 + Math.cos(angle) * dist;
              const endY = H / 2 + Math.sin(angle) * dist;

              this.tweens.add({
                targets: resume,
                alpha: 0.6 + Math.random() * 0.3,
                duration: 150,
              });

              this.tweens.add({
                targets: resume,
                x: endX,
                y: endY,
                rotation: (Math.random() - 0.5) * 8,
                duration: 800 + Math.random() * 500,
                ease: "Cubic.easeOut",
              });
            }

            // Center flash on burst
            const burstFlash = this.add.circle(W / 2, H / 2, 60, 0xffffff, 0.6).setDepth(50);
            this.tweens.add({
              targets: burstFlash,
              scaleX: 8, scaleY: 8, alpha: 0,
              duration: 500, ease: "Quad.easeOut",
              onComplete: () => burstFlash.destroy(),
            });

            // Camera shake on burst
            this.cameras.main.shake(300, 0.008);
          });

          // ---- WAVE 3: Second rain from top-right (0.7s later) ----
          this.time.delayedCall(700, () => {
            const wave3Count = 12;
            for (let i = 0; i < wave3Count; i++) {
              const resume = this.add.sprite(0, 0, "card_back");
              const scale = 0.5 + Math.random() * 0.6;
              resume.setDisplaySize(CARD_W * scale, CARD_H * scale);
              const sx = W * 0.5 + Math.random() * W * 0.7;
              resume.setPosition(sx, -100 - Math.random() * 400);
              resume.setRotation((Math.random() - 0.5) * 1.5);
              resume.setAlpha(0.5 + Math.random() * 0.4);
              resume.setDepth(35 + i);
              this.flyingObjects.push(resume);

              // Fall with left drift (wind effect)
              this.tweens.add({
                targets: resume,
                x: sx - 200 - Math.random() * 400,
                y: H + 150,
                rotation: resume.rotation + (Math.random() > 0.5 ? 4 : -4),
                duration: 1000 + Math.random() * 600,
                delay: i * 40,
                ease: "Sine.easeIn",
              });
            }
          });

          // ---- Continuous wind streaks ----
          this.add.particles(W + 30, H / 2, "streak", {
            speed: { min: 400, max: 800 },
            angle: { min: 178, max: 182 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.3, end: 0 },
            lifespan: { min: 400, max: 700 },
            quantity: 3,
            frequency: 25,
            emitZone: {
              type: "random",
              source: new Phaser.Geom.Rectangle(0, -H / 2, 10, H),
            } as Phaser.Types.GameObjects.Particles.EmitZoneData,
            duration: 1800,
          }).setDepth(1);

          // ---- Sparkle dots floating ----
          this.add.particles(W / 2, H / 2, "sparkDot", {
            speed: { min: 30, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: { min: 600, max: 1200 },
            quantity: 2,
            frequency: 60,
            tint: [0xffffff, 0xccddff, 0xeeeeff],
            emitZone: {
              type: "random",
              source: new Phaser.Geom.Rectangle(-W / 2, -H / 2, W, H),
            } as Phaser.Types.GameObjects.Particles.EmitZoneData,
            duration: 1800,
          }).setDepth(60);

          // ---- Second camera shake at peak ----
          this.time.delayedCall(1000, () => {
            this.cameras.main.shake(200, 0.005);
          });

          // ---- Fade out all flying resumes before card drop ----
          this.time.delayedCall(1700, () => {
            this.flyingObjects.forEach((obj) => {
              const sprite = obj as Phaser.GameObjects.Sprite;
              this.tweens.add({
                targets: sprite,
                alpha: 0,
                duration: 500,
                ease: "Sine.easeIn",
                onComplete: () => sprite.destroy(),
              });
            });
            this.flyingObjects = [];
          });
        }

        // =============================================
        // PHASE 3 — Cards drop from above
        // =============================================
        private startCardDrop() {
          for (let i = 0; i < cardCount; i++) {
            this.containers.push(null);
            this.backs.push(null);
            this.fronts.push(null);
          }

          dropOrder.forEach((ci, di) => {
            const pos = posLocal[ci];

            // Back and front are EXACTLY the same size
            const back = this.add.sprite(0, 0, "card_back");
            back.setDisplaySize(CARD_W, CARD_H);

            const front = this.add.sprite(0, 0, `cf_${ci}`);
            front.setDisplaySize(CARD_W, CARD_H);
            front.setVisible(false);

            const shadow = this.add.ellipse(0, CARD_H / 2 + 5, CARD_W * 0.55, 8, 0x000000, 0.25);

            const startX = pos.x + (Math.random() - 0.5) * 40;
            const container = this.add.container(startX, -CARD_H - 60, [shadow, back, front]);
            container.setDepth(10 + ci);
            container.setSize(CARD_W, CARD_H);
            container.setRotation((Math.random() - 0.5) * 0.12);

            this.containers[ci] = container;
            this.backs[ci] = back;
            this.fronts[ci] = front;

            const delay = di * 100;

            this.tweens.add({
              targets: container,
              x: pos.x,
              y: pos.y,
              rotation: 0,
              duration: 500,
              delay,
              ease: "Back.easeOut",
              onComplete: () => {
                this.tweens.add({
                  targets: container,
                  scaleY: 0.95,
                  scaleX: 1.03,
                  duration: 60,
                  yoyo: true,
                  ease: "Sine.easeOut",
                });
                this.spawnDust(pos.x, pos.y + CARD_H / 2);
              },
            });
          });

          const landedAt = (cardCount - 1) * 100 + 500 + 100;
          this.scheduleReveals(landedAt);
        }

        // =============================================
        // PHASE 4 — Flip cards by grade
        // =============================================
        private scheduleReveals(base: number) {
          const normals: number[] = [];
          const aCards: number[] = [];
          const sCards: number[] = [];

          cardsLocal.forEach((c, i) => {
            if (c.grade === "S") sCards.push(i);
            else if (c.grade === "A") aCards.push(i);
            else normals.push(i);
          });

          // B/C/D
          if (normals.length > 0) {
            this.time.delayedCall(base + 800, () => {
              this.cameras.main.shake(200, 0.003);
            });
            normals.forEach((idx, j) => {
              this.time.delayedCall(base + 900 + j * 60, () => {
                this.flipCard(idx, "normal");
              });
            });
          }

          // A
          if (aCards.length > 0) {
            this.time.delayedCall(base + 1800, () => {
              this.cameras.main.shake(350, 0.01);
            });
            aCards.forEach((idx, j) => {
              this.time.delayedCall(base + 1900 + j * 120, () => {
                this.effectA(idx);
                this.flipCard(idx, "A");
              });
            });
          }

          // S
          if (sCards.length > 0) {
            this.time.delayedCall(base + 2500, () => {
              sCards.forEach((idx) => this.preShake(idx));
            });
            this.time.delayedCall(base + 2800, () => {
              this.cameras.main.shake(500, 0.02);
              this.flash(0x00e5ff, 0.4);
            });
            sCards.forEach((idx, j) => {
              this.time.delayedCall(base + 3000 + j * 180, () => {
                this.effectS(idx);
                this.flipCard(idx, "S");
              });
            });
          }

          let endTime = base + 900 + normals.length * 60 + 400;
          if (aCards.length > 0) endTime = Math.max(endTime, base + 1900 + aCards.length * 120 + 500);
          if (sCards.length > 0) endTime = Math.max(endTime, base + 3000 + sCards.length * 180 + 700);

          this.time.delayedCall(endTime + 600, () => this.finish());
        }

        private flipCard(idx: number, grade: string) {
          const c = this.containers[idx];
          if (!c) return;
          const back = this.backs[idx]!;
          const front = this.fronts[idx]!;
          const dur = grade === "S" ? 280 : grade === "A" ? 240 : 180;

          this.tweens.add({
            targets: c,
            scaleX: 0,
            duration: dur,
            ease: "Sine.easeIn",
            onComplete: () => {
              back.setVisible(false);
              front.setVisible(true);
              this.tweens.add({
                targets: c,
                scaleX: 1,
                duration: dur,
                ease: "Sine.easeOut",
                onComplete: () => {
                  if (grade === "S") this.glow(idx, 0x00e5ff, 0.45);
                  else if (grade === "A") this.glow(idx, 0xffd700, 0.3);
                },
              });
            },
          });

          this.tweens.add({
            targets: c,
            y: c.y - 10,
            duration: dur * 0.8,
            yoyo: true,
            ease: "Sine.easeOut",
          });
        }

        private skipToEnd() {
          if (this.isEnding) return;
          this.tweens.killAll();
          this.time.removeAllEvents();

          this.bg.setAlpha(0.88);

          // Destroy flying objects
          this.flyingObjects.forEach((o) => o.destroy());
          this.flyingObjects = [];

          for (let i = 0; i < cardCount; i++) {
            if (!this.containers[i]) {
              const pos = posLocal[i];
              const back = this.add.sprite(0, 0, "card_back").setDisplaySize(CARD_W, CARD_H).setVisible(false);
              const front = this.add.sprite(0, 0, `cf_${i}`).setDisplaySize(CARD_W, CARD_H);
              const shadow = this.add.ellipse(0, CARD_H / 2 + 5, CARD_W * 0.55, 8, 0x000000, 0.25);
              const c = this.add.container(pos.x, pos.y, [shadow, back, front]).setDepth(10 + i);
              this.containers[i] = c;
              this.backs[i] = back;
              this.fronts[i] = front;
            }
          }

          cardsLocal.forEach((card, i) => {
            const c = this.containers[i]!;
            c.setPosition(posLocal[i].x, posLocal[i].y).setScale(1).setRotation(0);
            this.backs[i]!.setVisible(false);
            this.fronts[i]!.setVisible(true);
            if (card.grade === "S") this.glow(i, 0x00e5ff, 0.45);
            else if (card.grade === "A") this.glow(i, 0xffd700, 0.3);
          });

          this.time.delayedCall(400, () => this.finish());
        }

        private finish() {
          if (this.isEnding) return;
          this.isEnding = true;
          const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(2000);
          this.tweens.add({
            targets: overlay,
            alpha: 0.7,
            duration: 400,
            ease: "Sine.easeIn",
            onComplete: () => onCompleteRef.current(),
          });
        }

        private preShake(idx: number) {
          const c = this.containers[idx];
          if (!c) return;
          const ox = c.x;
          this.tweens.add({
            targets: c,
            x: { from: ox - 3, to: ox + 3 },
            duration: 40, yoyo: true, repeat: 10,
            ease: "Sine.easeInOut",
            onComplete: () => { c.x = ox; },
          });
        }

        private spawnDust(x: number, y: number) {
          if (!this.textures.exists("dust")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(2, 2, 2);
            g.generateTexture("dust", 4, 4);
            g.destroy();
          }
          this.add.particles(x, y, "dust", {
            speed: { min: 20, max: 60 },
            angle: { min: 230, max: 310 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 350, quantity: 4,
            tint: [0xaaaaaa, 0x888888],
            gravityY: 40, duration: 80,
          }).setDepth(5);
        }

        private flash(color: number, alpha: number) {
          const f = this.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(100);
          this.tweens.add({
            targets: f, alpha: 0, duration: 450,
            ease: "Sine.easeOut", onComplete: () => f.destroy(),
          });
        }

        private effectA(idx: number) {
          const p = posLocal[idx];
          if (!this.textures.exists("sp_a")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffd700, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture("sp_a", 8, 8);
            g.destroy();
          }
          this.add.particles(p.x, p.y, "sp_a", {
            speed: { min: 60, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: { min: 350, max: 800 },
            quantity: 12,
            tint: [0xffd700, 0xffec80, 0xffffff],
            gravityY: 50, duration: 350,
          }).setDepth(50);

          const fl = this.add.circle(p.x, p.y, CARD_W * 0.7, 0xffd700, 0.35).setDepth(49);
          this.tweens.add({
            targets: fl, scaleX: 2.2, scaleY: 2.2, alpha: 0,
            duration: 450, ease: "Sine.easeOut", onComplete: () => fl.destroy(),
          });
        }

        private effectS(idx: number) {
          const p = posLocal[idx];
          if (!this.textures.exists("sp_s")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x00e5ff, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture("sp_s", 8, 8);
            g.destroy();
          }
          if (!this.textures.exists("ray")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 3, 50);
            g.generateTexture("ray", 3, 50);
            g.destroy();
          }

          this.add.particles(p.x, p.y, "sp_s", {
            speed: { min: 100, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 500, max: 1200 },
            quantity: 25,
            tint: [0x00e5ff, 0xb9f2ff, 0xffffff],
            gravityY: 60, duration: 500,
          }).setDepth(50);

          this.time.delayedCall(150, () => {
            this.add.particles(p.x, p.y, "sp_s", {
              speed: { min: 40, max: 150 },
              angle: { min: 0, max: 360 },
              scale: { start: 0.7, end: 0 },
              alpha: { start: 0.6, end: 0 },
              lifespan: { min: 300, max: 800 },
              quantity: 12,
              tint: [0x00e5ff, 0xffffff],
              gravityY: 30, duration: 400,
            }).setDepth(50);
          });

          const fl = this.add.circle(p.x, p.y, CARD_W * 0.9, 0x00e5ff, 0.5).setDepth(49);
          this.tweens.add({
            targets: fl, scaleX: 2.8, scaleY: 2.8, alpha: 0,
            duration: 600, ease: "Sine.easeOut", onComplete: () => fl.destroy(),
          });

          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const ray = this.add.sprite(p.x, p.y, "ray").setDepth(48);
            ray.setRotation(a).setAlpha(0.7).setScale(1, 0);
            this.tweens.add({
              targets: ray, scaleY: 2.5, alpha: 0,
              duration: 650, delay: i * 25, ease: "Sine.easeOut",
              onComplete: () => ray.destroy(),
            });
          }

          const ring = this.add.circle(p.x, p.y, CARD_W * 0.4).setDepth(47);
          ring.setStrokeStyle(2, 0x00e5ff, 0.7);
          ring.setFillStyle();
          this.tweens.add({
            targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
            duration: 700, ease: "Sine.easeOut", onComplete: () => ring.destroy(),
          });
        }

        private glow(idx: number, color: number, a: number) {
          const p = posLocal[idx];
          const g = this.add.ellipse(p.x, p.y, CARD_W * 1.3, CARD_H * 1.15, color, a * 0.25).setDepth(9);
          this.tweens.add({
            targets: g,
            alpha: { from: a * 0.25, to: a * 0.12 },
            scaleX: { from: 1, to: 1.06 },
            scaleY: { from: 1, to: 1.04 },
            duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
          });
        }
      }

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: W,
        height: H,
        transparent: true,
        parent: el,
        banner: false,
        audio: { noAudio: true },
        scene: GachaScene,
        render: { pixelArt: true },
      });
    })();

    return () => {
      mounted = false;
      game?.destroy(true);
    };
  }, [cards]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        overflow: "hidden",
      }}
    />
  );
}
