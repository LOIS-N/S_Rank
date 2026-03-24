"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import { useUserStore } from "@/store/useUserStore";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';




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
          mode: Phaser.Scale.NONE, // CSS가 캔버스 스케일링을 관리하도록 변경 (기기별 오프셋 버그 방지)
          width: 1920,
          height: 1080,
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
            this.load.image("city_bg", `${ASSET_BASE}/assets/001/city_bg.webp`);
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

                this.load.image("bg_001", `${ASSET_BASE}/assets/002/background_001.webp`);
                this.load.image("bg_002", `${ASSET_BASE}/assets/002/background_002.webp`);
                this.load.image("bg_003", `${ASSET_BASE}/assets/002/background_003.webp`);
                this.load.image("ofc_001", `${ASSET_BASE}/assets/002/office_001.webp`);
                this.load.image("ofc_002", `${ASSET_BASE}/assets/002/office_002.webp`);
                this.load.image("ofc_003", `${ASSET_BASE}/assets/002/office_003.webp`);
                this.load.image("desks", `${ASSET_BASE}/assets/002/desks_001.webp`);
                this.load.image("new_001", `${ASSET_BASE}/assets/002/new_001.webp`);
                this.load.image("result_001", `${ASSET_BASE}/assets/002/result_001.webp`);
                this.load.image("lock_001", `${ASSET_BASE}/assets/002/lock_001.webp`);
                for (let i = 1; i <= 5; i++) {
                  this.load.image(`people${i}_001`, `${ASSET_BASE}/assets/002/people${i}_001.webp`);
                  this.load.image(`people${i}_002`, `${ASSET_BASE}/assets/002/people${i}_002.webp`);
                }
                this.load.image("bug_001", `${ASSET_BASE}/assets/002/bug_001.webp`);
                this.load.image("bug_002", `${ASSET_BASE}/assets/002/bug_002.webp`);
                this.load.image("goldBug", `${ASSET_BASE}/assets/002/goldBug.webp`);

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
                  const playOfc = sceneRef.add.image(0, 10, ofcKey);
                  playBg.setDisplaySize(1920, 1080);
                  playOfc.setDisplaySize(1920, 1080);
                  playContainer.add([playBg, playOfc]);

                  // ── 플로팅 캐릭터 ──
                  const floatScale = 0.0892 * 1.7 * 0.5 * 1.3 * 1.2;

                  // Bug: 오피스 바닥 안에서 랜덤 이동
                  const BUG_BOUNDS = { xMin: -480, xMax: 480, yMin: -180, yMax: 280 };
                  // 책상 회피: 각 책상 중심 ±160px(x) / ±90px(y) 타원 영역 제외
                  const DESK_AVOID_RX = 160;
                  const DESK_AVOID_RY = 90;
                  const isNearDesk = (nx: number, ny: number) =>
                    deskPositions.some(d => {
                      const ex = (nx - d.x) / DESK_AVOID_RX;
                      const ey = (ny - d.y) / DESK_AVOID_RY;
                      return ex * ex + ey * ey < 1;
                    });

                  // 버그 다음 위치: 현재 위치와 120px 이상 떨어진 완전 랜덤 안전 위치
                  const getNextBugPos = (cx: number, cy: number) => {
                    for (let attempt = 0; attempt < 50; attempt++) {
                      const nx = Phaser.Math.Between(BUG_BOUNDS.xMin + 40, BUG_BOUNDS.xMax - 40);
                      const ny = Phaser.Math.Between(BUG_BOUNDS.yMin + 40, BUG_BOUNDS.yMax - 40);
                      const dist = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);
                      if (dist > 120 && !isNearDesk(nx, ny)) return { x: nx, y: ny };
                    }
                    // 거리 조건 완화 fallback
                    for (let attempt = 0; attempt < 20; attempt++) {
                      const nx = Phaser.Math.Between(BUG_BOUNDS.xMin + 40, BUG_BOUNDS.xMax - 40);
                      const ny = Phaser.Math.Between(BUG_BOUNDS.yMin + 40, BUG_BOUNDS.yMax - 40);
                      if (!isNearDesk(nx, ny)) return { x: nx, y: ny };
                    }
                    return { x: -440, y: 250 };
                  };

                  // bug_001 × 4, bug_002 × 3 — 총 7마리 (책상 회피 위치로 배치)
                  const bugConfigs = [
                    { key: 'bug_001', sx: -440, sy:  250, startDelay:    0 },
                    { key: 'bug_001', sx:  440, sy:  250, startDelay:  900 },
                    { key: 'bug_001', sx: -440, sy: -150, startDelay: 1800 },
                    { key: 'bug_001', sx:  440, sy: -150, startDelay: 2700 },
                    { key: 'bug_002', sx:    0, sy:  270, startDelay:  450 },
                    { key: 'bug_002', sx: -440, sy:   60, startDelay: 1350 },
                    { key: 'bug_002', sx:  440, sy:   60, startDelay: 2250 },
                  ];

                  const bugLayer = sceneRef.add.container(0, 0);
                  playContainer.add(bugLayer);
                  sceneRef.registry.set('bugLayer', bugLayer);

                  bugConfigs.forEach(({ key, sx, sy, startDelay }) => {
                    const img = sceneRef.add.image(sx, sy, key);
                    img.setScale(floatScale);
                    img.setInteractive({ useHandCursor: true });
                    bugLayer.add(img);

                    let active = true;

                    const crawlNext = () => {
                      if (!active) return;
                      const dest = getNextBugPos(img.x, img.y);
                      img.setFlipX(dest.x < img.x);
                      const dist = Phaser.Math.Distance.Between(img.x, img.y, dest.x, dest.y);
                      sceneRef.tweens.add({
                        targets: img,
                        x: dest.x,
                        y: dest.y,
                        duration: Math.max(900, dist * 5),
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                          if (!active) return;
                          const landY = img.y;
                          sceneRef.tweens.add({
                            targets: img,
                            y: landY - 36,
                            duration: 120,
                            yoyo: true,
                            repeat: Phaser.Math.Between(1, 3),
                            ease: 'Cubic.easeOut',
                            onComplete: () => { if (active) crawlNext(); },
                          });
                        },
                      });
                    };

                    img.on('pointerdown', async () => {
                      if (!active) return;
                      active = false;
                      sceneRef.tweens.killTweensOf(img);

                      // API 호출 (NORMAL 버그 = +50)
                      try {
                        const token = useUserStore.getState().accessToken;
                        const res = await fetch(`${ASSET_BASE}/api/v1/users/goldbug`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ type: 'NORMAL' }),
                        });
                        const json = await res.json();
                        if (json.success) {
                          useGameStore.getState().setResources(json.data, useGameStore.getState().coffee);
                        }
                      } catch {
                        useGameStore.getState().increaseGold(50);
                      }

                      const floatText = sceneRef.add.text(img.x, img.y - 30, '+50', {
                        fontFamily: 'Stardust, sans-serif', fontSize: '32px',
                        color: '#ffdd00', stroke: '#000000', strokeThickness: 3,
                      }).setOrigin(0.5);
                      bugLayer.add(floatText);
                      sceneRef.tweens.add({
                        targets: floatText, y: floatText.y - 70, alpha: 0,
                        duration: 900, ease: 'Sine.easeOut',
                        onComplete: () => floatText.destroy(),
                      });

                      sceneRef.tweens.add({
                        targets: img, y: img.y - 52, duration: 140, ease: 'Back.easeOut',
                        onComplete: () => {
                          img.setVisible(false);
                          sceneRef.time.delayedCall(10000, () => {
                            active = true;
                            img.setPosition(sx, sy);
                            img.setVisible(true);
                            crawlNext();
                          });
                        },
                      });
                    });

                    sceneRef.time.delayedCall(startDelay, crawlNext);
                  });

                  // ── 황금 버그: 첫 등장 10초 후, 이후 클릭/자동소멸 후 60초 리젠 ──
                  const scheduleGoldenBug = (delay = 60000) => {
                    sceneRef.time.delayedCall(delay, spawnGoldenBug);
                  };

                  function spawnGoldenBug() {
                    const gx = Phaser.Math.Between(BUG_BOUNDS.xMin + 60, BUG_BOUNDS.xMax - 60);
                    const gy = Phaser.Math.Between(BUG_BOUNDS.yMin + 30, BUG_BOUNDS.yMax - 30);
                    const goldImg = sceneRef.add.image(gx, gy, 'goldBug');
                    goldImg.setScale(floatScale * (2 / 3));
                    goldImg.setInteractive({ useHandCursor: true });
                    bugLayer.add(goldImg);

                    let goldActive = true;

                    // 15초 뒤 미클릭 시 자동 사라짐 → 60초 후 리젠
                    const autoHide = sceneRef.time.delayedCall(15000, () => {
                      if (!goldActive) return;
                      goldActive = false;
                      sceneRef.tweens.add({
                        targets: goldImg, alpha: 0, duration: 500,
                        onComplete: () => { goldImg.destroy(); scheduleGoldenBug(); },
                      });
                    });

                    // 제자리 바운스
                    const goldenBounce = () => {
                      if (!goldActive) return;
                      sceneRef.tweens.add({
                        targets: goldImg, y: goldImg.y - 52, duration: 120,
                        yoyo: true, repeat: Phaser.Math.Between(2, 4), ease: 'Cubic.easeOut',
                        onComplete: () => { if (goldActive) sceneRef.time.delayedCall(400, goldenBounce); },
                      });
                    };
                    sceneRef.time.delayedCall(100, goldenBounce);

                    goldImg.on('pointerdown', async () => {
                      if (!goldActive) return;
                      goldActive = false;
                      autoHide.remove(false);
                      sceneRef.tweens.killTweensOf(goldImg);

                      // API 호출 (GOLDEN 버그 = +100)
                      try {
                        const token = useUserStore.getState().accessToken;
                        const res = await fetch(`${ASSET_BASE}/api/v1/users/goldbug`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ type: 'GOLDEN' }),
                        });
                        const json = await res.json();
                        if (json.success) {
                          useGameStore.getState().setResources(json.data, useGameStore.getState().coffee);
                        }
                      } catch {
                        useGameStore.getState().increaseGold(100);
                      }

                      const floatText = sceneRef.add.text(goldImg.x, goldImg.y - 30, '+100', {
                        fontFamily: 'Stardust, sans-serif', fontSize: '36px',
                        color: '#ffd700', stroke: '#000000', strokeThickness: 4,
                      }).setOrigin(0.5);
                      playContainer.add(floatText);
                      sceneRef.tweens.add({
                        targets: floatText, y: floatText.y - 80, alpha: 0,
                        duration: 1000, ease: 'Sine.easeOut',
                        onComplete: () => floatText.destroy(),
                      });

                      sceneRef.tweens.add({
                        targets: goldImg, y: goldImg.y - 60, alpha: 0,
                        duration: 200, ease: 'Back.easeOut',
                        onComplete: () => { goldImg.destroy(); scheduleGoldenBug(); },
                      });
                    });
                  }

                  scheduleGoldenBug(10000); // 첫 등장: 10초 후

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

                // 버그 레이어 visibility 동기화
                const bugLayer = this.registry.get('bugLayer');
                if (bugLayer) {
                  const bugsEnabled = useGameStore.getState().bugsEnabled;
                  bugLayer.setVisible(bugsEnabled);
                }

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

                      // SSE fallback: 타이머가 0이 됐지만 SSE quest-complete 이벤트를 못 받은 경우
                      if (quest.status === 'IN_PROGRESS' && remainMs <= 0) {
                        const store = useGameStore.getState();
                        store.finishQuestTimer(quest.id);

                        const notifTitle = "S급 개발자들이 나를 따르는 이유";
                        const notifBody = `${quest.title || '퀘스트'}가 완료됐어요! 지금 바로 보상을 수령하세요!`;
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                          new Notification(notifTitle, {
                            body: notifBody,
                            icon: `${ASSET_BASE}/assets/icons/icon-192.webp`,
                          });
                        } else {
                          store.pushNotification(notifTitle, notifBody);
                        }
                      }

                      const animFrame = Math.floor(now / 200) % 2 + 1;
                      deskData.charImage.setTexture(`people${deskData.peopleNum}_00${animFrame}`);
                      deskData.charImage.displayWidth = deskData.desk.displayWidth * 0.721;
                      deskData.charImage.scaleY = deskData.charImage.scaleX;
                      deskData.charImage.setY(0);
                      deskData.charImage.setVisible(true);
                      deskData.desk.setVisible(false);
                      deskData.newIcon.setVisible(false);

                      // result는 SSE 알림으로 COMPLETED 상태가 됐을 때만 표시
                      if (quest.status === 'COMPLETED') {
                        deskData.resultIcon.setVisible(true);
                        deskData.timerBg.setVisible(false);
                        deskData.timerText.setVisible(false);
                      } else {
                        deskData.resultIcon.setVisible(false);
                        deskData.timerText.setVisible(true);
                        // 1시간 미만: MM:SS, 1시간 이상: H:MM:SS
                        const totalSec = Math.max(0, Math.ceil(remainMs / 1000));
                        const hh = Math.floor(totalSec / 3600);
                        const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
                        const ss = (totalSec % 60).toString().padStart(2, '0');
                        deskData.timerText.setText(hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`);
                        // 10분+ 초록, 1분+ 노랑, 1분 미만 빨강
                        const bgColor = remainMs > 600000 ? 0x80c880 : remainMs > 60000 ? 0xe0cc50 : 0xe07878;
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

  return (
    <div
      id="game-container"
      style={{
        position: 'absolute',
        // 상단 토글바와 하단 네비게이션바를 피해서 정중앙 배치
        top: 'calc(5.8cqw + 3px)', 
        bottom: 'calc(5.9cqw + 6px + env(safe-area-inset-bottom, 0px))', 
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        touchAction: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
