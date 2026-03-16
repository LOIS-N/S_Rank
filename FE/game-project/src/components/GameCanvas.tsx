"use client";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";

export default function GameCanvas() {
  const gameRef = useRef<any>(null);
  const { gameStatus } = useGameStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 비동기로 Phaser 로드 (SSR 오류 방지)
    const initPhaser = async () => {
      const Phaser = await import("phaser");

      if (gameRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: "game-container",
        backgroundColor: "#000000",
        scale: {
          mode: Phaser.Scale.FIT, // 16:9 래퍼에 맞게 핏 맞춤
          width: 1920,
          height: 1080,
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
            // 배경 이미지
            this.load.image("city_bg", "/assets/city_bg.png");
            this.load.image("bg_001", "/assets/background_001.png");
            this.load.image("bg_002", "/assets/background_002.png");
            this.load.image("bg_003", "/assets/background_003.png");
            // 오피스 이미지
            this.load.image("ofc_001", "/assets/office_001.png");
            this.load.image("ofc_002", "/assets/office_002.png");
            this.load.image("ofc_003", "/assets/office_003.png");
            // 책상 및 퀘스트 아이콘
            this.load.image("desks", "/assets/desks_001.png");
            this.load.image("new_001", "/assets/new_001.png");
            this.load.image("result_001", "/assets/result_001.png");
          },
          create: function (this: Phaser.Scene) {
            const scene = this;
            const { width, height } = scene.scale;

            const hour = new Date().getHours();
            let bgKey = "bg_001";
            let ofcKey = "ofc_001";

            if (hour >= 8 && hour < 17) {
              bgKey = "bg_001";
              ofcKey = "ofc_001";
            } else if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)) {
              bgKey = "bg_002";
              ofcKey = "ofc_002";
            } else {
              bgKey = "bg_003";
              ofcKey = "ofc_003";
            }

            // 컨테이너 2개로 분리 (로그인용, 플레이용)
            const mainContainer = scene.add.container(width / 2, height / 2);

            // 1. City BG (로그인, 닉네임 입력용)
            // 1920x1080 규격에 딱 맞도록 강제
            const cityBg = scene.add.image(0, 0, "city_bg");
            cityBg.setDisplaySize(1920, 1080);
            
            // 2. Play BG (사무실)
            const playContainer = scene.add.container(0, 0);
            const playBg = scene.add.image(0, 0, bgKey);
            const playOfc = scene.add.image(0, 0, ofcKey);
            
            // bg와 ofc 크기를 1920x1080에 맞춤
            playBg.setDisplaySize(1920, 1080);
            playOfc.setDisplaySize(1920, 1080);

            playContainer.add([playBg, playOfc]);

            // 책상 5개 배치 (원근비례 고려하여 해상도 1.5배 증가에 맞춰 위치/스케일 보정)
            const originDeskScale = 0.3375; // (0.225 * 1.5)
            const deskPositions = [
              // 2nd desk from left (index 0) 
              { x: 135, y: 105 },
              // 4th desk from left (index 1) 
              { x: 45, y: 240 },
              // 1st desk from left (index 2) 
              { x: -300, y: 105 },
              // 5th desk from left (index 3) 
              { x: 75, y: 285 },
              // 3rd desk from left (index 4) 
              { x: -135, y: 180 },
            ];

            const deskDataList: any[] = [];

            deskPositions.forEach((pos, index) => {
              const deskContainer = scene.add.container(pos.x, pos.y);
              deskContainer.setDepth(pos.y); // Isometric depth sorting
              
              const desk = scene.add.image(0, 0, "desks");
              desk.setScale(originDeskScale);
              desk.setInteractive({ useHandCursor: true });

              // 클릭 이벤트 - Zustand Store 액션 호출
              desk.on('pointerdown', () => {
                const quest = useGameStore.getState().quests[index];
                if (quest.status === 'IDLE') {
                  useGameStore.getState().startQuest(index);
                } else if (quest.status === 'COMPLETED') {
                  useGameStore.getState().completeQuest(index);
                }
              });

              // 상태 UI 그래픽들 (책상의 중앙부에 가깝게 배치)
              const uiY = -15; // 중앙에 맞추기 위해 Y 오프셋을 조절
              
              const newIcon = scene.add.image(0, uiY, "new_001");
              newIcon.setScale(0.052); // 기존 0.04에서 30% 증가
              newIcon.setVisible(false);

              const resultIcon = scene.add.image(0, uiY, "result_001");
              resultIcon.setScale(0.052); // 기존 0.04에서 30% 증가
              resultIcon.setVisible(false);

              const timerText = scene.add.text(0, uiY, "00:00", {
                fontFamily: "BitBit, sans-serif",
                fontSize: "24px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
              }).setOrigin(0.5);
              timerText.setVisible(false);

              deskContainer.add([desk, newIcon, resultIcon, timerText]);
              playContainer.add(deskContainer);

              deskDataList.push({ id: index, newIcon, resultIcon, timerText });
            });
            
            mainContainer.add([cityBg, playContainer]);

            // Set initial visibility based on the store's sync state
            const initialStatus = useGameStore.getState().gameStatus;
            scene.registry.set('currentStatus', initialStatus);
            
            if (initialStatus === "PLAYING") {
              cityBg.setVisible(false);
              playContainer.setVisible(true);
            } else {
              cityBg.setVisible(true);
              playContainer.setVisible(false);
            }

            // scene 업데이트에서 gameStatus에 따라 visible 변경을 위해 registry 저장
            scene.registry.set('cityBg', cityBg);
            scene.registry.set('playContainer', playContainer);
            scene.registry.set('deskDataList', deskDataList);
          },
          update: function (this: Phaser.Scene) {
            const currentStatus = this.registry.get('currentStatus');
            const cityBg = this.registry.get('cityBg');
            const playContainer = this.registry.get('playContainer');
            const deskDataList = this.registry.get('deskDataList');
            
            if (cityBg && playContainer) {
               if (currentStatus === "PLAYING") {
                  cityBg.setVisible(false);
                  playContainer.setVisible(true);
                  
                  // 퀘스트 상태 동기화
                  if (deskDataList) {
                    const quests = useGameStore.getState().quests;
                    
                    deskDataList.forEach((deskData: any, i: number) => {
                      const quest = quests[i];
                      if (!quest) return;

                      if (quest.status === 'IDLE') {
                        deskData.newIcon.setVisible(true);
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(false);
                      } 
                      else if (quest.status === 'IN_PROGRESS') {
                        deskData.newIcon.setVisible(false);
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(true);

                        const now = Date.now();
                        const remainMs = (quest.endTime || now) - now;
                        
                        if (remainMs <= 0) {
                           useGameStore.getState().finishQuestTimer(quest.id);
                           deskData.timerText.setVisible(false);
                        } else {
                           const totalSec = Math.floor(remainMs / 1000);
                           const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
                           const s = (totalSec % 60).toString().padStart(2, '0');
                           deskData.timerText.setText(`${m}:${s}`);
                        }
                      } 
                      else if (quest.status === 'COMPLETED') {
                        deskData.newIcon.setVisible(false);
                        deskData.resultIcon.setVisible(true);
                        deskData.timerText.setVisible(false);
                      }
                    });
                  }

               } else {
                  cityBg.setVisible(true);
                  playContainer.setVisible(false);
               }
            }
          }
        },
      };

      gameRef.current = new Phaser.Game(config);
    };

    initPhaser();

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // 외부(Zustand) 상태가 바뀔 때 Phaser registry에 반영하여 update에서 처리하도록 함
  useEffect(() => {
    if (gameRef.current && gameRef.current.scene?.scenes[0]) {
      const scene = gameRef.current.scene.scenes[0];
      scene.registry.set('currentStatus', gameStatus);
    }
  }, [gameStatus]);

  return <div id="game-container" className="absolute inset-0 w-full h-full touch-none" />;
}