"use client";

import { useEffect, useRef } from "react";

interface EnhanceAnimationCard {
  cardId: number;
  grade: string;
  imageUrl: string;
}

interface Props {
  card: EnhanceAnimationCard;
  isSuccess: boolean;
  onShowResult: () => void;
  onComplete: () => void;
}

// React Compiler에서 "Inline class declarations are not supported" 에러를 피하기 위해
// 컴포넌트 밖에서 Phaser Scene 클래스들을 동적으로 생성하는 팩토리 함수를 정의합니다.
function createScenes(Phaser: any) {
  class EnhanceScene extends Phaser.Scene {
    private cardData!: EnhanceAnimationCard;
    private isSuccess!: boolean;
    private onShowResultRef!: { current: () => void };
    private onCompleteRef!: { current: () => void };
    private W!: number;
    private H!: number;
    private CARD_W!: number;
    private CARD_H!: number;
    private centerX!: number;
    private centerY!: number;
    private leftTargetX!: number;

    private bg!: Phaser.GameObjects.Rectangle;
    private cardSprite!: Phaser.GameObjects.Sprite;
    private cardContainer!: Phaser.GameObjects.Container;
    private isEnding: boolean = false;

    constructor() {
      super({ key: 'EnhanceScene' });
    }

    init(data: any) {
      this.cardData = data.cardData;
      this.isSuccess = data.isSuccess;
      this.onShowResultRef = data.onShowResultRef;
      this.onCompleteRef = data.onCompleteRef;
      this.W = data.W;
      this.H = data.H;
      this.CARD_W = data.CARD_W;
      this.CARD_H = data.CARD_H;
      this.centerX = data.centerX;
      this.centerY = data.centerY;
      this.leftTargetX = data.leftTargetX;
    }

    preload() {
      this.load.image("enhance_card", this.cardData.imageUrl);
    }

    create() {
      // 1. Dim background
      this.bg = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0);
      this.bg.setDepth(0);

      this.tweens.add({
        targets: this.bg,
        alpha: 0.85,
        duration: 500,
        ease: "Quad.easeIn",
      });

      this.time.delayedCall(1000, () => {
         // Card Setup
         this.cardSprite = this.add.sprite(0, 0, "enhance_card");
         this.cardSprite.setDisplaySize(this.CARD_W, this.CARD_H);
         
         this.cardContainer = this.add.container(this.centerX, this.centerY, [this.cardSprite]);
         this.cardContainer.setSize(this.CARD_W, this.CARD_H);
         this.cardContainer.setDepth(5);
         this.cardContainer.setScale(0); // Pop-in 준비

         this.tweens.add({
             targets: this.cardContainer,
             scale: 1,
             duration: 500,
             ease: "Back.easeOut"
         });

         // Text prompt
         const titleText = this.add.text(this.centerX, this.centerY - this.CARD_H / 2 - 60, "강화 중...", {
            fontFamily: "'StardustS', 'Stardust', Arial, sans-serif",
            fontSize: "48px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 6,
         });
         titleText.setOrigin(0.5, 0.5).setAlpha(0).setDepth(10);
         this.tweens.add({ targets: titleText, alpha: 1, duration: 400 });

         // Phase 1: Energy Gathering
         const startEnergyGathering = () => {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture("energy_dot", 8, 8);
            g.destroy();

            const emitter = this.add.particles(this.centerX, this.centerY, "energy_dot", {
                speed: { min: -100, max: -400 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0 },
                alpha: { start: 0, end: 1 },
                lifespan: 600,
                quantity: 3,
                tint: [0xffec8b, 0xffd700, 0xffffff],
                emitZone: {
                    type: "edge",
                    source: new Phaser.Geom.Circle(0, 0, this.CARD_H) as any,
                    quantity: 60,
                } as any,
            }).setDepth(4);

            this.tweens.add({
                targets: this.cardContainer,
                y: `+=${10}`,
                duration: 60,
                yoyo: true,
                repeat: 24,
                ease: "Sine.easeInOut"
            });
            
            this.tweens.add({
                targets: this.cardSprite,
                scale: 1.05,
                duration: 800,
                yoyo: true,
                repeat: 1,
                ease: "Cubic.easeInOut"
            });

            this.time.delayedCall(1450, () => emitter.stop());
         };

         startEnergyGathering();

         // Phase 2: Result
         const playSuccessAnimation = () => {
            const color = this.cardData.grade === 'S' ? 0x00e5ff : this.cardData.grade === 'A' ? 0xffea00 : 0x00ffaa;
            
            const flash = this.add.rectangle(this.centerX, this.centerY, this.W, this.H, color, 0.8).setDepth(100);
            this.tweens.add({ targets: flash, alpha: 0, duration: 800, ease: "Expo.easeOut", onComplete: () => flash.destroy() });

            this.cameras.main.shake(400, 0.02);

            const txt = this.add.text(this.centerX, this.centerY, "SUCCESS!", {
                fontFamily: "'StardustS', 'Stardust', Arial, sans-serif",
                fontSize: "80px",
                fontStyle: "bold",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 10,
            });
            txt.setOrigin(0.5, 0.5).setDepth(11).setScale(0);
            this.tweens.add({ targets: txt, scale: 1.2, duration: 400, yoyo: true, ease: "Back.easeOut" });

            this.add.particles(this.centerX, this.centerY, "energy_dot", {
                speed: { min: 200, max: 800 },
                angle: { min: 0, max: 360 },
                scale: { start: 2, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 800,
                quantity: 40,
                tint: [color, 0xffffff],
                gravityY: 400,
                duration: 200,
            }).setDepth(15);

            this.tweens.add({
                targets: this.cardContainer,
                scale: 1.2,
                duration: 400,
                ease: "Back.easeOut",
            });
         };

         const playFailureAnimation = () => {
            const flash = this.add.rectangle(this.centerX, this.centerY, this.W, this.H, 0xff0000, 0.4).setDepth(100);
            this.tweens.add({ targets: flash, alpha: 0, duration: 500, ease: "Quad.easeOut", onComplete: () => flash.destroy() });

            this.cameras.main.shake(300, 0.015);

            const txt = this.add.text(this.centerX, this.centerY, "FAILED", {
                fontFamily: "'StardustS', 'Stardust', Arial, sans-serif",
                fontSize: "80px",
                fontStyle: "bold",
                color: "#888888",
                stroke: "#000000",
                strokeThickness: 10,
            });
            txt.setOrigin(0.5, 0.5).setDepth(11).setAlpha(0).setScale(2);
            this.tweens.add({ targets: txt, scale: 1, alpha: 1, duration: 300, ease: "Bounce.easeOut" });

            this.cardSprite.setTint(0x666666);
            
            this.tweens.add({
                targets: this.cardContainer,
                y: `+=${80}`,
                rotation: 0.1,
                alpha: 0.8,
                duration: 600,
                ease: "Cubic.easeIn",
            });
         };

         this.time.delayedCall(1500, () => {
            this.tweens.killTweensOf(titleText);
            titleText.destroy();
            if (this.isSuccess) playSuccessAnimation();
            else playFailureAnimation();
         });

         // Phase 3: Transition Out
         const slideLeftAndShowResult = () => {
            this.tweens.add({
               targets: this.bg,
               alpha: 0,
               duration: 500,
               ease: "Sine.easeOut"
            });

            this.tweens.add({
               targets: this.cardContainer,
               x: this.leftTargetX,
               duration: 600,
               ease: "Cubic.easeInOut"
            });

            this.onShowResultRef.current();
         };

         this.time.delayedCall(2500, () => slideLeftAndShowResult());
         
         // Phase 4: Final Cleanup
         this.time.delayedCall(3500, () => {
            if (this.isEnding) return;
            this.isEnding = true;
            
            this.tweens.add({
               targets: this.cardContainer,
               alpha: 0,
               duration: 300,
               ease: "Sine.easeIn",
               onComplete: () => this.onCompleteRef.current()
            });
         });
      });
    }
  }

  class BootScene extends Phaser.Scene {
     constructor() {
        super({ key: 'BootScene' });
     }
     create(data: any) {
        this.scene.add("EnhanceScene", EnhanceScene, true, data);
     }
  }

  return [BootScene, EnhanceScene];
}

export function EnhanceAnimationOverlay({ card, isSuccess, onShowResult, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onShowResultRef = useRef(onShowResult);
  onShowResultRef.current = onShowResult;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let game: any = null;
    let mounted = true;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (!mounted || !el) return;

      const W = window.innerWidth;
      const H = window.innerHeight;

      // 우측 상세/강화 패널 영역을 기준으로 애니메이션 좌표 설정
      const gameContainer = document.querySelector('.cardlist-right-box');
      const rect = gameContainer 
          ? gameContainer.getBoundingClientRect() 
          : { left: W * 0.5, top: 0, width: W * 0.5, height: H };

      const gameW = rect.width;
      const gameH = rect.height;
      const originX = rect.left;
      const originY = rect.top;

      const centerX = originX + gameW / 2;
      const centerY = originY + gameH / 2;
      const leftTargetX = originX + gameW * 0.25;

      // 카드의 눈에 띄게 큰 연출을 위하되, 게임 컨테이너 높이 대비 가독성 유지 (오른쪽 패널 65% 높이)
      // 오른쪽 패널 안에서의 왼쪽(빅 카드 영역)으로 들어가는 카드 크기에 맞도록 조율
      const CARD_H = Math.round(gameH * 0.65);
      const CARD_W = Math.round(CARD_H / 1.5);

      const [BootScene] = createScenes(Phaser);

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: W,
        height: H,
        transparent: true,
        parent: el,
        backgroundColor: '#00000000',
        banner: false,
        audio: { noAudio: true },
        scene: [BootScene],
        render: { pixelArt: true },
      });

      // 강제로 BootScene 시작시키며 데이터 패스
      game.scene.start('BootScene', {
         cardData: card,
         isSuccess,
         onShowResultRef,
         onCompleteRef,
         W,
         H,
         CARD_W,
         CARD_H,
         centerX,
         centerY,
         leftTargetX
      });

    })();

    return () => {
       mounted = false;
       if (game) {
         try {
           game.destroy(true);
         } catch (e) {
           console.error("Phaser game destroy error:", e);
         }
       }
    };
  }, [card, isSuccess]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    />
  );
}
