"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import { pauseGameBgm, playTutorialBgm, fadeTutorialBgmOut } from './BgmPlayer';
import { useGameStore } from '@/store/useGameStore';

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface DialogLine {
  text: string;
  isSystem?: boolean;
}

interface Scene {
  bg: 'black' | string;
  glitch?: boolean;
  lines: DialogLine[];
}

function getScenes(nickname: string): Scene[] {
  return [
  { bg: 'black', lines: [
    { text: '또다!' },
  ]},
  { bg: 'tutorialStory_000', lines: [
    { text: '대체 몇번째 불합격이지. 이젠 횟수를 세는 것도 힘들다.' },
    { text: `나는 개발자 지망생 ${nickname}.` },
    { text: '부트캠프를 졸업한 뒤 열심히 자소서를 쓰고 있지만, 생각보다 결과가 좋지 않다...' },
    { text: '왜 세상은 경력직만 찾는 거지? 신입은 경력을 어디서 쌓으라는 거야...' },
    { text: '어?' },
  ]},
  { bg: 'black', glitch: true, lines: [
    { text: '그런 내게 기적이 일어났다.' },
    { text: '[System: 중앙 집중형 데이터의 모순을 감지했습니다.]', isSystem: true },
    { text: "[System: '제네시스 블록'과 동기화합니다.]", isSystem: true },
  ]},
  { bg: 'black', glitch: true, lines: [
    { text: '음... 몇시지? 내가 노트북을 안 끄고 잤나....?' },
    { text: '화면이 왜 이래? 이상한 글자들이...?' },
  ]},
  { bg: 'tutorialStory_001', lines: [
    { text: '[System: 데이터 동기화 완료.]', isSystem: true },
    { text: "[System: 당신은 이제 모든 개발자의 '온체인(On-chain)' 기록을 읽을 수 있습니다.]", isSystem: true },
    { text: '뭐? 제네시스 블록? 온체인 데이터? 이게 다 무슨 소리야...?!' },
  ]},
  { bg: 'black', lines: [
    { text: '... 취업 때문인가, 힘들어서 별 걸 다 보네. 밥이나 먹자.' },
    { text: '어제 그게 꿈이 아니었나? 지나가는 사람들 머리 위에 계속 이상한 수치들이 보여.' },
    { text: '..어? 저 사람, 저게 뭐지?' },
  ]},
  { bg: 'tutorialStory_002', lines: [
    { text: '컵라면을 사러 들른 편의점에는 S급 개발자가 있었다.' },
    { text: '[System: S등급 개발자 박코딩 - 이더리움 코어 컨트리뷰터]', isSystem: true },
    { text: '저기요... 당신... 왜 이런 데 계세요? 당신은 이미 코딩 고수인데.' },
    { text: '박코딩 "드디어 나를 알아주는 사람이 나타난건가...?!"' },
  ]},
  { bg: 'tutorialStory_003', lines: [
    { text: '방금 박코딩 씨의 개발 능력치... 그건 거짓이 아니었어. 진짜야.' },
    { text: '세상은 여전히 포장된 스펙과 학벌만 원하지만, 나는 진짜 개발자들을 모으겠어. 이 투명한 블록체인 데이터들이 가리키는 사람들을.' },
    { text: '학벌, 스펙 인맥.... 그런 건 이제 상관 없어.' },
    { text: "내 눈에는 전 세계의 유니콘들이 보인다. 이제 내 회사들은 '진짜'들로만 채운다." },
    { text: '조작 불가능한 실력의 시대, 내가 열겠어.' },
  ]},
  ];
}

interface Props {
  onComplete: () => void;
}

export default function TutorialStory({ onComplete }: Props) {
  const nickname = useGameStore(s => s.nickname) || '김개발';
  const SCENES = getScenes(nickname);
  const [sceneIdx, setSceneIdx]       = useState(0);
  const [lineIdx, setLineIdx]         = useState(0);
  const [fading, setFading]           = useState(false);
  const [fadingOut, setFadingOut]     = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  // 이미지 씬 진입 시 천천히 fade-in
  const [imgVisible, setImgVisible]   = useState(true);

  // 언마운트 후 setTimeout 내 state 업데이트 방지
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const currentScene = SCENES[sceneIdx];
  const currentLine  = currentScene.lines[lineIdx];
  const isLastStep   = sceneIdx === SCENES.length - 1 && lineIdx === currentScene.lines.length - 1;
  const isGlitch     = !!currentScene.glitch;
  const bgImage      = currentScene.bg !== 'black'
    ? `${ASSET_BASE}/assets/tutorial/${currentScene.bg}.webp`
    : null;

  const showNextLine = useCallback((nextLine: number) => {
    setTextVisible(false);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setLineIdx(nextLine);
      setTextVisible(true);
    }, 120);
  }, []);

  const goToScene = useCallback((nextSi: number, nextLi: number) => {
    setFading(true);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setSceneIdx(nextSi);
      setLineIdx(nextLi);
      setTextVisible(true);
      setFading(false);
      // 이미지 씬이면 0 → 1 fade-in
      if (SCENES[nextSi].bg !== 'black') {
        setImgVisible(false);
        setTimeout(() => { if (mountedRef.current) setImgVisible(true); }, 40);
      } else {
        setImgVisible(true);
      }
    }, 320);
  }, []);

  const advance = useCallback(() => {
    if (fading) return;
    if (isLastStep) {
      setFadingOut(true);
      setTimeout(() => onComplete(), 900);
      return;
    }
    if (lineIdx < currentScene.lines.length - 1) {
      showNextLine(lineIdx + 1);
    } else {
      goToScene(sceneIdx + 1, 0);
    }
  }, [fading, isLastStep, lineIdx, currentScene.lines.length, sceneIdx, onComplete, showNextLine, goToScene]);

  const skip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete();
  }, [onComplete]);

  // 스토리 BGM: 마운트 시 awake.mp3 재생, 언마운트 시 퀘스트 BGM(tutorial.mp3)으로 전환
  useEffect(() => {
    pauseGameBgm();
    const timer = setTimeout(() => playTutorialBgm(), 2000);
    return () => { clearTimeout(timer); };
  }, []);

  // 마지막 스크립트 진입 시 awake.mp3 서서히 페이드 아웃
  useEffect(() => {
    if (isLastStep) fadeTutorialBgmOut(1200);
  }, [isLastStep]);


  return (
    <div
      className="absolute inset-0 font-dot select-none"
      style={{ zIndex: 200, cursor: 'pointer', pointerEvents: 'auto' }}
      onClick={advance}
    >
      <style>{`
        /* ── 이미지 씬 fade-in ── */
        .ts-img-fadein {
          transition: opacity 0.32s ease-in;
        }

        /* ── CRT 글리치: 전체 화면 흔들림 ── */
        @keyframes ts-crt-shake {
          0%,100%  { transform: translate(0,0); }
          4%       { transform: translate(-3px, 0); }
          8%       { transform: translate(3px, 0); }
          12%      { transform: translate(0, 0); }
          78%      { transform: translate(0, 0); }
          81%      { transform: translate(-6px, 1px); }
          84%      { transform: translate(6px, -1px); }
          87%      { transform: translate(-2px, 0); }
          90%      { transform: translate(0, 0); }
        }
        /* ── CRT 깜박임 ── */
        @keyframes ts-crt-flicker {
          0%,100%{ opacity:1; }
          91%    { opacity:1; }
          92%    { opacity:0.55; }
          93%    { opacity:1; }
          95%    { opacity:0.75; }
          96%    { opacity:1; }
          98%    { opacity:0.9; }
          99%    { opacity:1; }
        }
        /* ── 수평 아티팩트 슬라이스 A (위쪽 밴드) ── */
        @keyframes ts-art-a {
          0%,100%{ opacity:0; clip-path:inset(18% 0 72% 0); transform:translateX(0); }
          6%     { opacity:1; clip-path:inset(18% 0 72% 0); transform:translateX(-14px); }
          10%    { opacity:1; clip-path:inset(18% 0 72% 0); transform:translateX(10px); }
          13%    { opacity:0; }
          72%    { opacity:0; }
          75%    { opacity:0.8; clip-path:inset(12% 0 68% 0); transform:translateX(20px); }
          78%    { opacity:0.8; clip-path:inset(12% 0 68% 0); transform:translateX(-16px); }
          81%    { opacity:0; }
        }
        /* ── 수평 아티팩트 슬라이스 B (중간 밴드) ── */
        @keyframes ts-art-b {
          0%,100%{ opacity:0; clip-path:inset(42% 0 42% 0); transform:translateX(0); }
          20%    { opacity:0; }
          23%    { opacity:1; clip-path:inset(42% 0 42% 0); transform:translateX(12px); }
          27%    { opacity:1; clip-path:inset(42% 0 42% 0); transform:translateX(-9px); }
          30%    { opacity:0; }
          60%    { opacity:0; }
          63%    { opacity:0.7; clip-path:inset(38% 0 38% 0); transform:translateX(-18px); }
          67%    { opacity:0.7; clip-path:inset(38% 0 38% 0); transform:translateX(14px); }
          70%    { opacity:0; }
        }
        /* ── 수평 아티팩트 슬라이스 C (아래 밴드) ── */
        @keyframes ts-art-c {
          0%,100%{ opacity:0; clip-path:inset(70% 0 8% 0); transform:translateX(0); }
          40%    { opacity:0; }
          43%    { opacity:1; clip-path:inset(70% 0 8% 0); transform:translateX(-22px); }
          47%    { opacity:1; clip-path:inset(70% 0 8% 0); transform:translateX(18px); }
          50%    { opacity:0; }
          85%    { opacity:0; }
          88%    { opacity:0.9; clip-path:inset(65% 0 5% 0); transform:translateX(26px); }
          91%    { opacity:0; }
        }
        /* ── RGB 채널 분리 (적) ── */
        @keyframes ts-rgb-r {
          0%,100%{ opacity:0; transform:translateX(0); }
          7%     { opacity:0.18; transform:translateX(-4px); }
          11%    { opacity:0; }
          76%    { opacity:0; }
          79%    { opacity:0.22; transform:translateX(-5px); }
          82%    { opacity:0; }
        }
        /* ── RGB 채널 분리 (청) ── */
        @keyframes ts-rgb-b {
          0%,100%{ opacity:0; transform:translateX(0); }
          7%     { opacity:0.15; transform:translateX(4px); }
          11%    { opacity:0; }
          76%    { opacity:0; }
          79%    { opacity:0.18; transform:translateX(5px); }
          82%    { opacity:0; }
        }
        /* ── 이동하는 밝은 스캔라인 ── */
        @keyframes ts-scanline {
          0%   { transform:translateY(-8px); }
          100% { transform:translateY(720px); }
        }
        /* ── 진행 인디케이터 깜박임 ── */
        @keyframes ts-blink {
          0%,100%{ opacity:0.35; }
          50%    { opacity:1.0; }
        }
        /* ── ERROR / 해시 텍스트 깜박임 ── */
        @keyframes ts-error-flicker {
          0%,100% { opacity:0; }
          15%     { opacity:0; }
          20%     { opacity:0.85; }
          35%     { opacity:0.7; }
          42%     { opacity:0; }
          60%     { opacity:0; }
          65%     { opacity:0.9; }
          75%     { opacity:0.6; }
          82%     { opacity:0; }
        }
        @keyframes ts-hash-flicker {
          0%,100% { opacity:0; }
          8%      { opacity:0; }
          14%     { opacity:0.55; }
          28%     { opacity:0.4; }
          36%     { opacity:0; }
          55%     { opacity:0; }
          60%     { opacity:0.6; }
          72%     { opacity:0.35; }
          80%     { opacity:0; }
        }
      `}</style>

      {/* ── 배경 ── */}
      <div className="absolute inset-0 bg-black overflow-hidden">
        {bgImage && (
          <img
            src={bgImage}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            style={{
              imageRendering: 'pixelated',
              opacity: imgVisible ? 1 : 0,
              // fade-in만 transition 적용 (false→true). false일 때는 즉시 숨겨 이전 이미지 플래시 방지
              transition: imgVisible ? 'opacity 0.32s ease-in' : 'none',
            }}
          />
        )}
      </div>

      {/* ── CRT 글리치 레이어 (글리치 씬 전용) ── */}
      {isGlitch && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 5, animation: 'ts-crt-flicker 2.4s infinite, ts-crt-shake 2.4s infinite steps(1)' }}
        >
          {/* 수평 CRT 스캔라인 텍스처 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)',
            }}
          />

          {/* 이동하는 밝은 수평 선 */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, height: '2px',
              background: 'rgba(120,230,255,0.45)',
              animation: 'ts-scanline 2.1s linear infinite',
            }}
          />

          {/* 수평 슬라이스 아티팩트 A — 밝은 청록 컬러로 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,220,255,0.55) 25%, rgba(255,255,255,0.7) 50%, rgba(0,200,255,0.55) 75%, transparent 100%)',
              animation: 'ts-art-a 2.3s infinite steps(1)',
            }}
          />
          {/* 수평 슬라이스 아티팩트 B */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(180,255,255,0.45) 30%, rgba(255,255,255,0.6) 55%, rgba(100,220,255,0.45) 80%, transparent 100%)',
              animation: 'ts-art-b 1.9s infinite steps(1)',
            }}
          />
          {/* 수평 슬라이스 아티팩트 C */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(0,180,255,0.4) 0%, rgba(255,255,255,0.65) 40%, rgba(0,210,255,0.5) 70%, transparent 100%)',
              animation: 'ts-art-c 2.7s infinite steps(1)',
            }}
          />

          {/* RGB 채널 분리 — 적채널 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(255,0,0,1)',
              mixBlendMode: 'screen',
              opacity: 0,
              animation: 'ts-rgb-r 2.3s infinite steps(1)',
            }}
          />
          {/* ERROR 텍스트 */}
          {[
            { left: '7%',  top: '12%', delay: '0s',   dur: '3.2s', size: '1.4vw' },
            { left: '82%', top: '8%',  delay: '0.8s', dur: '2.9s', size: '1.2vw' },
            { left: '55%', top: '22%', delay: '1.5s', dur: '3.5s', size: '1.6vw' },
            { left: '18%', top: '38%', delay: '0.3s', dur: '2.8s', size: '1.3vw' },
            { left: '70%', top: '55%', delay: '2.0s', dur: '3.1s', size: '1.5vw' },
            { left: '88%', top: '70%', delay: '1.1s', dur: '3.4s', size: '1.2vw' },
            { left: '12%', top: '75%', delay: '0.5s', dur: '2.7s', size: '1.4vw' },
          ].map((p, i) => (
            <span key={`err-${i}`} style={{
              position: 'absolute', left: p.left, top: p.top,
              color: '#00ff41', fontSize: p.size, fontFamily: 'monospace', fontWeight: 'bold',
              textShadow: '0 0 6px #00ff41, 0 0 14px #00cc33',
              opacity: 0, animation: `ts-error-flicker ${p.dur} ${p.delay} infinite`,
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>error</span>
          ))}
          {/* 해시값 텍스트 */}
          {[
            { left: '62%', top: '10%', delay: '0.4s', dur: '4.0s', size: '1.1vw', text: '0x4f2a9c1b' },
            { left: '25%', top: '18%', delay: '1.2s', dur: '3.6s', size: '1.0vw', text: 'a3f8d2e1c7b4' },
            { left: '78%', top: '30%', delay: '0.7s', dur: '4.2s', size: '1.2vw', text: '#ff00e4a9' },
            { left: '5%',  top: '47%', delay: '1.8s', dur: '3.8s', size: '1.0vw', text: 'genesis::0x00' },
            { left: '44%', top: '35%', delay: '0.2s', dur: '3.4s', size: '1.15vw', text: 'b91c3d8f2a' },
            { left: '90%', top: '48%', delay: '1.4s', dur: '4.1s', size: '0.95vw', text: '7e2f1c9b3d' },
            { left: '33%', top: '62%', delay: '0.9s', dur: '3.7s', size: '1.1vw', text: '0xdeadbeef' },
            { left: '58%', top: '78%', delay: '2.2s', dur: '3.5s', size: '1.05vw', text: 'c4a8f3e2b7d1' },
            { left: '15%', top: '85%', delay: '0.6s', dur: '4.3s', size: '1.0vw', text: '#block:000001' },
            { left: '72%', top: '88%', delay: '1.6s', dur: '3.9s', size: '1.15vw', text: '9d1e7f4c2a' },
          ].map((p, i) => (
            <span key={`hash-${i}`} style={{
              position: 'absolute', left: p.left, top: p.top,
              color: '#00dd88', fontSize: p.size, fontFamily: 'monospace',
              textShadow: '0 0 5px #00dd88, 0 0 10px #00aa66',
              opacity: 0, animation: `ts-hash-flicker ${p.dur} ${p.delay} infinite`,
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>{p.text}</span>
          ))}
          {/* RGB 채널 분리 — 청채널 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,255,1)',
              mixBlendMode: 'screen',
              opacity: 0,
              animation: 'ts-rgb-b 2.3s infinite steps(1)',
            }}
          />
        </div>
      )}

      {/* ── 씬 전환 페이드 오버레이 ── */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{
          opacity: fading || fadingOut ? 1 : 0,
          transition: fadingOut
            ? 'opacity 0.8s ease-in'
            : fading ? 'opacity 0.16s ease-in' : 'opacity 0.32s ease-out',
          zIndex: 10,
        }}
      />

      {/* ── 스킵 버튼 ── */}
      {!isLastStep && (
        <button
          className="absolute top-0 right-0 text-white/50 hover:text-white border border-white/20 hover:border-white/50 transition-colors font-dot"
          style={{
            zIndex: 20,
            fontSize: '1.1cqw',
            padding: '0.5cqw 1.0cqw',
            margin: '1.2cqw',
            background: 'rgba(0,0,0,0.55)',
          }}
          onClick={skip}
        >
          스킵 ▶▶
        </button>
      )}

      {/* ── 대화창 ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 15, padding: '0 12.5cqw 2.5cqw' }}
      >
        <div
          style={{
            position: 'relative',
            // System 대사: 어두운 파란색 박스 / 일반 대사: 검은 박스
            background: currentLine.isSystem
              ? 'rgba(8,18,58,0.93)'
              : 'rgba(0,0,0,0.87)',
            border: currentLine.isSystem
              ? '2px solid rgba(100,160,255,0.35)'
              : '2px solid rgba(255,255,255,0.18)',
            padding: '1.8cqw 2.2cqw 2.2cqw',
            minHeight: '11cqw',
            boxShadow: currentLine.isSystem
              ? '0 0 18px rgba(60,120,255,0.25), inset 0 0 30px rgba(0,10,40,0.6)'
              : 'inset 0 0 30px rgba(0,0,0,0.5)',
            transition: 'background 0.15s, border 0.15s, box-shadow 0.15s',
          }}
        >
          <p
            style={{
              color: isLastStep ? '#ffd700'
                : currentLine.isSystem ? '#c8e8ff'
                : '#ffffff',
              fontSize: '1.75cqw',
              fontWeight: isLastStep ? 'bold' : undefined,
              lineHeight: 1.65,
              textShadow: isLastStep
                ? '0 0 12px rgba(255,200,0,0.7), 1px 1px 0 rgba(0,0,0,0.9)'
                : currentLine.isSystem
                ? '0 0 8px rgba(140,200,255,0.6)'
                : '1px 1px 0 rgba(0,0,0,0.9)',
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.12s ease-in',
              wordBreak: 'keep-all',
            }}
          >
            {currentLine.text}
          </p>

          {/* 진행 인디케이터 */}
          <div
            className="absolute bottom-0 right-0"
            style={{
              padding: '0.6cqw 1.0cqw',
              color: currentLine.isSystem ? 'rgba(180,220,255,0.5)' : 'rgba(255,255,255,0.4)',
              fontSize: '1.0cqw',
              animation: 'ts-blink 1s ease-in-out infinite',
            }}
          >
            {isLastStep ? '[ 클릭하여 완료 ]' : '▼'}
          </div>
        </div>
      </div>
    </div>
  );
}
