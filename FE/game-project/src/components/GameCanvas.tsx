"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { useGameStore } from "@/store/useGameStore";

export default function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: "game-container",
      backgroundColor: "#000000",
      scale: {
        mode: Phaser.Scale.RESIZE, // 화면 크기에 맞게 캔버스 크기 변경
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: true, // 도트가 깨지지 않고 선명하게 출력됨
        antialias: false,
      },
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
      scene: {
        preload: function (this: Phaser.Scene) {
          // 생성한 부산 배경 이미지 로드
          this.load.image("city_bg", "/assets/city_bg.png");
        },
        create: function (this: Phaser.Scene) {
          const { width, height } = this.scale;

          // 배경 이미지를 화면 중앙에 배치
          const bg = this.add.image(width / 2, height / 2, "city_bg");
          
          // 배경 이미지 크기 최적화 함수
          const resizeBg = () => {
            const scaleX = this.scale.width / bg.width;
            const scaleY = this.scale.height / bg.height;
            const scale = Math.max(scaleX, scaleY); // 빈 공간 없이 꽉 채우기
            bg.setScale(scale).setScrollFactor(0);
          };

          resizeBg();

          // 브라우저 크기 변경 시 배경 크기 재조정
          this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            bg.setPosition(gameSize.width / 2, gameSize.height / 2);
            resizeBg();
          });
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="game-container" className="fixed inset-0 w-full h-full touch-none" />;
}