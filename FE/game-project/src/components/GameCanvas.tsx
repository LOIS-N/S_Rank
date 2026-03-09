"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { useGameStore } from "@/store/useGameStore";

export default function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { increaseScore } = useGameStore();

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: "game-container",
      physics: { default: "arcade" },
      scene: {
        preload: function (this: Phaser.Scene) {
          this.load.setBaseURL("https://labs.phaser.io");
          this.load.image("sky", "assets/skies/space3.png");
          this.load.image("logo", "assets/sprites/phaser3-logo.png");
        },
        create: function (this: Phaser.Scene) {
          this.add.image(400, 300, "sky");
          const logo = this.physics.add.image(400, 100, "logo");
          logo.setVelocity(100, 200);
          logo.setBounce(1, 1);
          logo.setCollideWorldBounds(true);
          
          // 클릭 시 Zustand 점수 업데이트 예시
          logo.setInteractive().on("pointerdown", () => {
            increaseScore(10);
          });
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [increaseScore]);

  return <div id="game-container" className="rounded-lg overflow-hidden border-4 border-slate-700" />;
}