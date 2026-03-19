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
        audio: {
          disableWebAudio: true, // "Cannot resume a context that has been closed" 방지
        },
        physics: {
          default: "arcade",
          arcade: { debug: false },
        },
        scene: {
          preload: function (this: Phaser.Scene) {
            // ── Stage 1: 로그인 화면에 필요한 에셋만 먼저 로드 ──
            this.load.image("city_bg", "/assets/001/city_bg.webp");
          },
          create: function (this: Phaser.Scene) {
            const scene = this;
            const { width, height } = scene.scale;

            // ── Stage 1 완료: city_bg만 로드된 상태 ──
            // 컨테이너 2개로 분리 (로그인용, 플레이용)
            const mainContainer = scene.add.container(width / 2, height / 2);

            // 1. City BG (로그인, 닉네임 입력용)
            const cityBg = scene.add.image(0, 0, "city_bg");
            cityBg.setDisplaySize(1920, 1080);
            
            // 2. Play Container: 처음엔 비워두고 플레이 에셋 로드 후 채움
            const playContainer = scene.add.container(0, 0);
            playContainer.setVisible(false);

            mainContainer.add([cityBg, playContainer]);

            scene.registry.set('currentStatus', useGameStore.getState().gameStatus);
            scene.registry.set('cityBg', cityBg);
            scene.registry.set('playContainer', playContainer);
            scene.registry.set('playAssetsLoaded', false);
            scene.registry.set('deskDataList', null);
          },
          update: function (this: Phaser.Scene) {
            const currentStatus = this.registry.get('currentStatus');
            const cityBg = this.registry.get('cityBg');
            const playContainer = this.registry.get('playContainer');
            const playAssetsLoaded = this.registry.get('playAssetsLoaded');
            const deskDataList = this.registry.get('deskDataList');
            
            if (!cityBg || !playContainer) return;

            if (currentStatus === "PLAYING") {
              // ── Stage 2: 플레이 씬 진입 시 처음 한 번만 에셋 lazy 로드 ──
              if (!playAssetsLoaded && !this.registry.get('playAssetsLoading')) {
                this.registry.set('playAssetsLoading', true);

                const hour = new Date().getHours();
                let bgKey = "bg_001";
                let ofcKey = "ofc_001";
                if (hour >= 8 && hour < 17) { bgKey = "bg_001"; ofcKey = "ofc_001"; }
                else if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)) { bgKey = "bg_002"; ofcKey = "ofc_002"; }
                else { bgKey = "bg_003"; ofcKey = "ofc_003"; }

                this.load.image("bg_001", "/assets/002/background_001.webp");
                this.load.image("bg_002", "/assets/002/background_002.webp");
                this.load.image("bg_003", "/assets/002/background_003.webp");
                this.load.image("ofc_001", "/assets/002/office_001.webp");
                this.load.image("ofc_002", "/assets/002/office_002.webp");
                this.load.image("ofc_003", "/assets/002/office_003.webp");
                this.load.image("desks", "/assets/002/desks_001.webp");
                this.load.image("new_001", "/assets/002/new_001.webp");
                this.load.image("result_001", "/assets/002/result_001.webp");
                this.load.image("lock_001", "/assets/002/lock_001.webp");
                for (let i = 1; i <= 5; i++) {
                  this.load.image(`people${i}_001`, `/assets/002/people${i}_001.webp`);
                  this.load.image(`people${i}_002`, `/assets/002/people${i}_002.webp`);
                }

                const sceneRef = this;
                this.load.once('complete', () => {
                  // 플레이 씬 구성
                  const originDeskScale = 0.350;
                  const deskPositions = [
                    { x: 160, y: 55, layer: 1 },
                    { x: 215, y: 235, layer: 0 },
                    { x: -125, y: 200, layer: 1 },
                    { x: -340, y: 105, layer: 2 },
                    { x: -55, y: -50, layer: 2 },
                  ];

                  const playBg = sceneRef.add.image(0, 0, bgKey);
                  const playOfc = sceneRef.add.image(0, 0, ofcKey);
                  playBg.setDisplaySize(1920, 1080);
                  playOfc.setDisplaySize(1920, 1080);
                  playContainer.add([playBg, playOfc]);

                  const isAnyModalOpen = () => {
                    const s = useGameStore.getState();
                    return !!(
                      s.comingSoonModal?.isOpen ||
                      s.activeRewardModal?.isOpen ||
                      s.activeUnlockConfirm?.isOpen ||
                      s.questInfoModal ||
                      s.isHUDModalOpen
                    );
                  };

                  // 각 책상(FE index 0~4)에 사용할 people 번호 매핑
                  // index 3(BE 4, 가장 왼쪽)은 people1 재사용
                  const PEOPLE_MAP = [1, 2, 3, 1, 5];

                  const builtDeskDataList: any[] = [];
                  deskPositions.forEach((pos, index) => {
                    const deskContainer = sceneRef.add.container(pos.x, pos.y);
                    const depthMap = { 0: 3000, 1: 2000, 2: 1000 };
                    deskContainer.setDepth((depthMap as any)[pos.layer] || pos.y);

                    const desk = sceneRef.add.image(0, 0, "desks");
                    desk.setScale(originDeskScale);

                    const newIcon = sceneRef.add.image(3, -37, "new_001");
                    newIcon.setScale(0.0892);
                    newIcon.setAlpha(0.9);
                    newIcon.setVisible(false);
                    newIcon.setInteractive({ useHandCursor: true });
                    newIcon.on('pointerdown', () => {
                      if (isAnyModalOpen()) return;
                      useGameStore.getState().setSelectingDeskId(index);
                      router.push('/quest');
                    });

                    const resultIcon = sceneRef.add.image(3, -37, "result_001");
                    resultIcon.setScale(0.0892);
                    resultIcon.setVisible(false);
                    resultIcon.setInteractive({ useHandCursor: true });
                    resultIcon.on('pointerdown', () => {
                      if (isAnyModalOpen()) return;
                      const state = useGameStore.getState();
                      const q = state.quests[index];
                      if (q && q.questId && q.questType) {
                        state.setCompleteQuestTrigger({
                          deskId: index,
                          questId: q.questId,
                          questType: q.questType.toUpperCase() as 'MAIN' | 'SUB',
                        });
                      } else {
                        state.completeQuest(index);
                      }
                    });

                    const lockIcon = sceneRef.add.image(3, -37, "lock_001");
                    lockIcon.setScale(0.0892);
                    lockIcon.setVisible(false);
                    lockIcon.setInteractive({ useHandCursor: true });
                    lockIcon.on('pointerdown', () => {
                      if (isAnyModalOpen()) return;
                      useGameStore.getState().setUnlockConfirm(index);
                    });

                    const charImage = sceneRef.add.image(0, 0, `people${PEOPLE_MAP[index]}_001`);
                    charImage.setVisible(false);
                    charImage.setInteractive({ useHandCursor: true });
                    charImage.on('pointerdown', () => {
                      if (isAnyModalOpen()) return;
                      const state = useGameStore.getState();
                      const q = state.quests[index];
                      if (q && (q.status === 'IN_PROGRESS' || q.status === 'COMPLETED')) {
                        const endTime = q.endAt ? new Date(q.endAt).getTime() : (q.endTime || Date.now());
                        const remainMs = Math.max(0, endTime - Date.now());
                        // store에 이미 syncActiveQuests로 title이 저장돼 있으므로 직접 사용
                        state.setQuestInfoModal({
                          questTitle: q.title || `퀘스트 #${index + 1}`,
                          rewardGold: q.reward,
                          remainMs,
                          endAt: q.endAt,
                        });
                      }
                    });

                    // Graphics: 라운드 직사각형 + 테두리, 시간에 따라 색 변경
                    const timerBg = sceneRef.add.graphics();
                    timerBg.setPosition(3, -37);
                    timerBg.setVisible(false);

                    const timerText = sceneRef.add.text(3, -37, "00:00", {
                      fontFamily: "Stardust, sans-serif",
                      fontSize: "25px",
                      color: "#111111",
                      stroke: "#000000",
                      strokeThickness: 1,
                    }).setOrigin(0.5);
                    timerText.setVisible(false);

                    deskContainer.add([desk, charImage, newIcon, resultIcon, lockIcon, timerBg, timerText]);
                    builtDeskDataList.push({ id: index, desk, charImage, newIcon, resultIcon, lockIcon, timerBg, timerText, peopleNum: PEOPLE_MAP[index], container: deskContainer, posY: pos.y });
                  });

                  // y 오름차순(뒤→앞) 순서로 playContainer에 추가해야
                  // Phaser Container의 렌더 순서(나중 추가 = 위에 그려짐)가 올바른 아이소메트릭 z-order를 갖게 됨
                  [...builtDeskDataList]
                    .sort((a, b) => a.posY - b.posY)
                    .forEach(d => playContainer.add(d.container));

                  sceneRef.registry.set('deskDataList', builtDeskDataList);
                  sceneRef.registry.set('originDeskScale', originDeskScale);
                  sceneRef.registry.set('playAssetsLoaded', true);
                  sceneRef.registry.set('playAssetsLoading', false);
                  playContainer.setVisible(true);
                  cityBg.setVisible(false);
                });

                this.load.start();
                return; // 로딩 중엔 아직 아무것도 그리지 않음
              }

              if (playAssetsLoaded) {
                cityBg.setVisible(false);
                playContainer.setVisible(true);

                // 퀘스트 상태 동기화
                if (deskDataList) {
                  const quests = useGameStore.getState().quests;
                  deskDataList.forEach((deskData: any, i: number) => {
                    const quest = quests[i];
                    if (!quest) return;

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
                    } else if (quest.status === 'IN_PROGRESS' || quest.status === 'COMPLETED') {
                      const now = Date.now();
                      const endTime = quest.endAt ? new Date(quest.endAt).getTime() : (quest.endTime || now);
                      const remainMs = endTime - now;

                      const animFrame = Math.floor(now / 200) % 2 + 1;
                      deskData.charImage.setTexture(`people${deskData.peopleNum}_00${animFrame}`);
                      deskData.charImage.displayWidth = deskData.desk.displayWidth * 0.721;
                      deskData.charImage.scaleY = deskData.charImage.scaleX;
                      deskData.charImage.setY(0);
                      deskData.charImage.setVisible(true);
                      deskData.desk.setVisible(false);
                      deskData.newIcon.setVisible(false);

                      if (remainMs <= 0) {
                        deskData.resultIcon.setVisible(true);
                        deskData.timerBg.setVisible(false);
                        deskData.timerText.setVisible(false);
                        if (quest.status === 'IN_PROGRESS') {
                          useGameStore.getState().finishQuestTimer(quest.id);
                        }
                      } else {
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(true);
                        const totalSec = Math.floor(remainMs / 1000);
                        const h = Math.floor(totalSec / 3600);
                        const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
                        const s = (totalSec % 60).toString().padStart(2, '0');
                        deskData.timerText.setText(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
                        // 시간에 따라 박스 색상 변경: 1h+ 초록, 10m+ 노랑, 10m 미만 빨강 (모두 뮤트톤)
                        const bgColor = remainMs > 3600000 ? 0x80c880 : remainMs > 600000 ? 0xe0cc50 : 0xe07878;
                        deskData.timerBg.clear();
                        deskData.timerBg.fillStyle(bgColor, 0.88);
                        deskData.timerBg.fillRoundedRect(-60, -19, 120, 36, 6);
                        deskData.timerBg.lineStyle(1, 0x000000, 1);
                        deskData.timerBg.strokeRoundedRect(-60, -19, 120, 36, 6);
                        deskData.timerBg.setVisible(true);
                      }
                    }
                  });
                }
              }
            } else {
              cityBg.setVisible(true);
              playContainer.setVisible(false);
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