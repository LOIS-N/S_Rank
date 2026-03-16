"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

export default function GameCanvas() {
  const gameRef = useRef<any>(null);
  const router = useRouter();
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
            this.load.image("city_bg", "/assets/001/city_bg.png");
            this.load.image("bg_001", "/assets/002/background_001.png");
            this.load.image("bg_002", "/assets/002/background_002.png");
            this.load.image("bg_003", "/assets/002/background_003.png");
            // 오피스 이미지
            this.load.image("ofc_001", "/assets/002/office_001.png");
            this.load.image("ofc_002", "/assets/002/office_002.png");
            this.load.image("ofc_003", "/assets/002/office_003.png");
            // 책상 및 퀘스트 아이콘
            this.load.image("desks", "/assets/002/desks_001.png");
            this.load.image("new_001", "/assets/002/new_001.png");
            this.load.image("result_001", "/assets/002/result_001.png");
            this.load.image("lock_001", "/assets/002/lock_001.png");

            // 캐릭터 애니메이션용 에셋 로드
            for (let i = 1; i <= 5; i++) {
              this.load.image(`people${i}_001`, `/assets/002/people${i}_001.png`);
              this.load.image(`people${i}_002`, `/assets/002/people${i}_002.png`);
            }
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

            // 책상 5개 배치
            const originDeskScale = 0.350; // 3% 확대 (0.340 * 1.03)
            const deskPositions = [
              { x: 160, y: 55, layer: 2 },   // 0 (오른쪽에서 2번째)
              { x: -125, y: 200, layer: 2 }, // 1 (오른쪽에서 4번째)
              { x: -340, y: 105, layer: 3 }, // 2 (오른쪽에서 5번째)
              { x: 215, y: 235, layer: 1 },  // 3 (제일 오른쪽)
              { x: -55, y: -50, layer: 3 },  // 4 (오른쪽에서 3번째)
            ];

            const deskDataList: any[] = [];

            deskPositions.forEach((pos, index) => {
              const deskContainer = scene.add.container(pos.x, pos.y);
              
              // 사용자 정의 레이어링 (Layer 1: Highest Depth, Layer 3: Lowest Depth)
              // Phaser에서는 Depth가 클수록 화면 상단(앞쪽)에 그려짐
              const depthMap = { 1: 3000, 2: 2000, 3: 1000 };
              deskContainer.setDepth((depthMap as any)[pos.layer] || pos.y);
              
              const desk = scene.add.image(0, 0, "desks");
              desk.setScale(originDeskScale);

              // 상태 UI 그래픽들 (10% 크게, x: 3, y: -37 오프셋)
              const newIcon = scene.add.image(3, -37, "new_001");
              newIcon.setScale(0.0892); 
              newIcon.setAlpha(0.9); 
              newIcon.setVisible(false);
              newIcon.setInteractive({ useHandCursor: true });
              newIcon.on('pointerdown', () => {
                useGameStore.getState().setSelectingDeskId(index);
                router.push('/quest');
              });

              const resultIcon = scene.add.image(3, -37, "result_001");
              resultIcon.setScale(0.0892); 
              resultIcon.setVisible(false);
              resultIcon.setInteractive({ useHandCursor: true });
              resultIcon.on('pointerdown', () => {
                useGameStore.getState().completeQuest(index);
              });

              const lockIcon = scene.add.image(3, -37, "lock_001"); 
              lockIcon.setScale(0.0892);
              lockIcon.setVisible(false);
              lockIcon.setInteractive({ useHandCursor: true });
              lockIcon.on('pointerdown', () => {
                useGameStore.getState().setUnlockConfirm(index);
              });

              // 캐릭터 이미지 (퀘스트 진행 중 코딩 효과)
              const charImage = scene.add.image(0, 0, `people${index + 1}_001`);
              charImage.setVisible(false);

              const timerText = scene.add.text(3, -37, "00:00", {
                fontFamily: "Stardust, sans-serif",
                fontSize: "25px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
              }).setOrigin(0.5);
              timerText.setVisible(false);

              deskContainer.add([desk, charImage, newIcon, resultIcon, lockIcon, timerText]);
              playContainer.add(deskContainer);

              deskDataList.push({ id: index, desk, charImage, newIcon, resultIcon, lockIcon, timerText });
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
            scene.registry.set('originDeskScale', originDeskScale);
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

                      // 잠금 상태 처리
                      if (quest.isLocked) {
                        deskData.desk.setTint(0x666666);
                        deskData.lockIcon.setVisible(true);
                        deskData.newIcon.setVisible(false);
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(false);
                        deskData.charImage.setVisible(false);
                        return;
                      } else {
                        deskData.desk.clearTint();
                        deskData.lockIcon.setVisible(false);
                      }

                      if (quest.status === 'IDLE') {
                        deskData.desk.setVisible(true);
                        deskData.newIcon.setVisible(true);
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(false);
                        deskData.charImage.setVisible(false);
                      } 
                      else if (quest.status === 'IN_PROGRESS') {
                        deskData.desk.setVisible(false);
                        deskData.newIcon.setVisible(false);
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(true);
                        deskData.charImage.setVisible(true);

                        const animFrame = Math.floor(Date.now() / 200) % 2 + 1;
                        deskData.charImage.setTexture(`people${i + 1}_00${animFrame}`);
                        deskData.charImage.displayWidth = deskData.desk.displayWidth * 0.721;
                        deskData.charImage.scaleY = deskData.charImage.scaleX;
                        deskData.charImage.setY(0);

                        const now = Date.now();
                        const remainMs = (quest.endTime || now) - now;
                        
                        if (remainMs <= 0) {
                           useGameStore.getState().finishQuestTimer(quest.id);
                        } else {
                           const totalSec = Math.floor(remainMs / 1000);
                           const h = Math.floor(totalSec / 3600);
                           const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
                           const s = (totalSec % 60).toString().padStart(2, '0');
                           
                           if (h > 0) {
                             deskData.timerText.setText(`${h}:${m}:${s}`);
                           } else {
                             deskData.timerText.setText(`${m}:${s}`);
                           }
                        }
                      } 
                      else if (quest.status === 'COMPLETED') {
                        deskData.desk.setVisible(false);
                        deskData.newIcon.setVisible(false);
                        deskData.resultIcon.setVisible(true);
                        deskData.timerText.setVisible(false);
                        deskData.charImage.setVisible(true);

                        const animFrame = Math.floor(Date.now() / 200) % 2 + 1;
                        deskData.charImage.setTexture(`people${i + 1}_00${animFrame}`);
                        deskData.charImage.displayWidth = deskData.desk.displayWidth * 0.721;
                        deskData.charImage.scaleY = deskData.charImage.scaleX;
                        deskData.charImage.setY(0);
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

  useEffect(() => {
    if (gameRef.current && gameRef.current.scene?.scenes[0]) {
      const scene = gameRef.current.scene.scenes[0];
      scene.registry.set('currentStatus', gameStatus);
    }
  }, [gameStatus]);

  return <div id="game-container" className="absolute inset-0 w-full h-full touch-none" />;
}