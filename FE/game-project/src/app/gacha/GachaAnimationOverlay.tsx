"use client";

import { useEffect, useRef } from "react";

interface CardSkill {
  skillType: string;
  value: number;
}

interface GachaAnimationCard {
  grade: string;
  imageUrl: string;
  skill1: CardSkill;
  skill2: CardSkill;
  skill3: CardSkill;
}

interface Props {
  cards: GachaAnimationCard[];
  onComplete: () => void;
  onDone: () => void;
}

function skillLabel(type: string): string {
  return type?.toUpperCase() === "DEVOPS" ? "DEV" : (type?.toUpperCase() ?? "?");
}

export function GachaAnimationOverlay({ cards, onComplete, onDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

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

      // 결과 화면과 동일한 카드 크기로 연출
      const CARD_W = cardCount === 1 ? 280 : 130;
      const CARD_H = Math.round(CARD_W * 1.5);

      // 이미 결과 크기이므로 축소 없음
      const FINAL_SCALE = 1;

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
          // 어두운 배경
          this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0);
          this.bg.setDepth(0);

          this.tweens.add({
            targets: this.bg,
            alpha: 0.88,
            duration: 250,
            ease: "Quad.easeIn",
          });

          // Phase 1: 이력서 폭풍 (0.25s~2.4s)
          this.time.delayedCall(250, () => this.startResumeStorm());

          // Phase 2: 카드 낙하 (2.4s~)
          this.time.delayedCall(2400, () => this.startCardDrop());

          // 스킵 허용 (1.2s 이후)
          this.time.delayedCall(1200, () => { this.canSkip = true; });
          this.input.on("pointerdown", () => {
            if (this.canSkip && !this.isEnding) this.skipToEnd();
          });
        }

        // =============================================
        // Phase 1 — 이력서 폭풍
        // =============================================
        private startResumeStorm() {
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

          // Wave 1: 위에서 비처럼 떨어짐
          for (let i = 0; i < 18; i++) {
            const resume = this.add.sprite(0, 0, "card_back");
            const scale = 0.6 + Math.random() * 0.5;
            resume.setDisplaySize(CARD_W * scale, CARD_H * scale);
            const sx = Math.random() * W;
            resume.setPosition(sx, -150 - Math.random() * 500);
            resume.setRotation((Math.random() - 0.5) * 1.2);
            resume.setAlpha(0);
            resume.setDepth(2 + i);
            this.flyingObjects.push(resume);

            this.tweens.add({ targets: resume, alpha: 0.5 + Math.random() * 0.4, duration: 200, delay: i * 50 });
            const drift = (Math.random() - 0.5) * 300;
            this.tweens.add({
              targets: resume,
              x: sx + drift, y: H + 200 + Math.random() * 300,
              rotation: resume.rotation + (Math.random() - 0.5) * 6,
              duration: 1200 + Math.random() * 800,
              delay: i * 50, ease: "Quad.easeIn",
            });
          }

          // Wave 2: 중앙에서 사방으로 폭발
          this.time.delayedCall(300, () => {
            for (let i = 0; i < 14; i++) {
              const resume = this.add.sprite(W / 2, H / 2, "card_back");
              const scale = 0.4 + Math.random() * 0.5;
              resume.setDisplaySize(CARD_W * scale, CARD_H * scale);
              resume.setAlpha(0);
              resume.setDepth(20 + i);
              this.flyingObjects.push(resume);

              const angle = Math.random() * Math.PI * 2;
              const dist = 500 + Math.random() * 600;
              this.tweens.add({ targets: resume, alpha: 0.6 + Math.random() * 0.3, duration: 150 });
              this.tweens.add({
                targets: resume,
                x: W / 2 + Math.cos(angle) * dist,
                y: H / 2 + Math.sin(angle) * dist,
                rotation: (Math.random() - 0.5) * 8,
                duration: 800 + Math.random() * 500, ease: "Cubic.easeOut",
              });
            }

            const burstFlash = this.add.circle(W / 2, H / 2, 60, 0xffffff, 0.6).setDepth(50);
            this.tweens.add({
              targets: burstFlash, scaleX: 8, scaleY: 8, alpha: 0,
              duration: 500, ease: "Quad.easeOut", onComplete: () => burstFlash.destroy(),
            });
            this.cameras.main.shake(300, 0.008);
          });

          // Wave 3: 우측 상단에서 추가로 쏟아짐
          this.time.delayedCall(700, () => {
            for (let i = 0; i < 12; i++) {
              const resume = this.add.sprite(0, 0, "card_back");
              const scale = 0.5 + Math.random() * 0.6;
              resume.setDisplaySize(CARD_W * scale, CARD_H * scale);
              const sx = W * 0.5 + Math.random() * W * 0.7;
              resume.setPosition(sx, -100 - Math.random() * 400);
              resume.setRotation((Math.random() - 0.5) * 1.5);
              resume.setAlpha(0.5 + Math.random() * 0.4);
              resume.setDepth(35 + i);
              this.flyingObjects.push(resume);

              this.tweens.add({
                targets: resume,
                x: sx - 200 - Math.random() * 400, y: H + 150,
                rotation: resume.rotation + (Math.random() > 0.5 ? 4 : -4),
                duration: 1000 + Math.random() * 600, delay: i * 40, ease: "Sine.easeIn",
              });
            }
          });

          // 바람 스트릭
          this.add.particles(W + 30, H / 2, "streak", {
            speed: { min: 400, max: 800 },
            angle: { min: 178, max: 182 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.3, end: 0 },
            lifespan: { min: 400, max: 700 },
            quantity: 3, frequency: 25,
            emitZone: {
              type: "random",
              source: new Phaser.Geom.Rectangle(0, -H / 2, 10, H),
            } as Phaser.Types.GameObjects.Particles.EmitZoneData,
            duration: 1800,
          }).setDepth(1);

          // 반짝이 파티클
          this.add.particles(W / 2, H / 2, "sparkDot", {
            speed: { min: 30, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: { min: 600, max: 1200 },
            quantity: 2, frequency: 60,
            tint: [0xffffff, 0xccddff, 0xeeeeff],
            emitZone: {
              type: "random",
              source: new Phaser.Geom.Rectangle(-W / 2, -H / 2, W, H),
            } as Phaser.Types.GameObjects.Particles.EmitZoneData,
            duration: 1800,
          }).setDepth(60);

          this.time.delayedCall(1000, () => { this.cameras.main.shake(200, 0.005); });

          // 낙하 이력서 페이드 아웃 (카드 낙하 직전)
          this.time.delayedCall(1700, () => {
            this.flyingObjects.forEach((obj) => {
              const sprite = obj as Phaser.GameObjects.Sprite;
              this.tweens.add({
                targets: sprite, alpha: 0, duration: 500, ease: "Sine.easeIn",
                onComplete: () => sprite.destroy(),
              });
            });
            this.flyingObjects = [];
          });
        }

        // =============================================
        // Phase 2 — 카드 낙하
        // =============================================
        private startCardDrop() {
          for (let i = 0; i < cardCount; i++) {
            this.containers.push(null);
            this.backs.push(null);
            this.fronts.push(null);
          }

          dropOrder.forEach((ci, di) => {
            const pos = posLocal[ci];
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
              x: pos.x, y: pos.y, rotation: 0,
              duration: 500, delay, ease: "Back.easeOut",
              onComplete: () => {
                this.tweens.add({
                  targets: container, scaleY: 0.95, scaleX: 1.03,
                  duration: 60, yoyo: true, ease: "Sine.easeOut",
                });
                this.spawnDust(pos.x, pos.y + CARD_H / 2);
              },
            });
          });

          // 카드 착지 후 A/S 등급 이펙트 발동, 이후 React GachaRevealCard가 플립 담당
          const landedAt = (cardCount - 1) * 100 + 500 + 100;
          this.time.delayedCall(landedAt + 100, () => {
            const aCards: number[] = [];
            const sCards: number[] = [];
            cardsLocal.forEach((c, i) => {
              if (c.grade === "S") sCards.push(i);
              else if (c.grade === "A") aCards.push(i);
            });
            if (aCards.length > 0) {
              this.cameras.main.shake(350, 0.01);
              aCards.forEach(idx => this.effectA(idx));
            }
            if (sCards.length > 0) {
              this.cameras.main.shake(500, 0.02);
              this.flash(0x00e5ff, 0.4);
              sCards.forEach(idx => this.effectS(idx));
            }
          });
          this.time.delayedCall(landedAt + 900, () => this.finish());
        }

        // =============================================
        // 스킵 처리
        // =============================================
        private skipToEnd() {
          if (this.isEnding) return;
          this.tweens.killAll();
          this.time.removeAllEvents();
          this.bg.setAlpha(0.88);

          this.flyingObjects.forEach((o) => o.destroy());
          this.flyingObjects = [];

          this.finish();
        }

        // =============================================
        // 종료 — React 결과 즉시 표시 + Phaser 크로스페이드
        // =============================================
        private finish() {
          if (this.isEnding) return;
          this.isEnding = true;
          onCompleteRef.current();                         // React 결과 화면 즉시 렌더
          el.style.transition = "opacity 500ms ease-out"; // Phaser 컨테이너 fade-out
          el.style.opacity = "0";
          setTimeout(() => onDoneRef.current(), 550);     // fade 완료 후 언마운트
        }

        // =============================================
        // 헬퍼 메서드들
        // =============================================
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
            speed: { min: 60, max: 250 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.9, end: 0 },
            lifespan: { min: 350, max: 800 }, quantity: 12,
            tint: [0xffd700, 0xffec80, 0xffffff], gravityY: 50, duration: 350,
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
            speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 },
            lifespan: { min: 500, max: 1200 }, quantity: 25,
            tint: [0x00e5ff, 0xb9f2ff, 0xffffff], gravityY: 60, duration: 500,
          }).setDepth(50);
          this.time.delayedCall(150, () => {
            this.add.particles(p.x, p.y, "sp_s", {
              speed: { min: 40, max: 150 }, angle: { min: 0, max: 360 },
              scale: { start: 0.7, end: 0 }, alpha: { start: 0.6, end: 0 },
              lifespan: { min: 300, max: 800 }, quantity: 12,
              tint: [0x00e5ff, 0xffffff], gravityY: 30, duration: 400,
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

        private spawnDust(x: number, y: number) {
          if (!this.textures.exists("dust")) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(2, 2, 2);
            g.generateTexture("dust", 4, 4);
            g.destroy();
          }
          this.add.particles(x, y, "dust", {
            speed: { min: 20, max: 60 }, angle: { min: 230, max: 310 },
            scale: { start: 0.5, end: 0 }, alpha: { start: 0.4, end: 0 },
            lifespan: 350, quantity: 4, tint: [0xaaaaaa, 0x888888], gravityY: 40, duration: 80,
          }).setDepth(5);
        }

        private flash(color: number, alpha: number) {
          const f = this.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(100);
          this.tweens.add({
            targets: f, alpha: 0, duration: 450, ease: "Sine.easeOut",
            onComplete: () => f.destroy(),
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
