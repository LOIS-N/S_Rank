"use client";

import { useEffect } from "react";

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 시간대 → BGM 트랙 URL 계산 (GameCanvas와 동일한 기준)
// 오전/낮  (08:00~16:59): 7번.mp3
// 저녁     (06:00~07:59, 17:00~18:59): 저녁.mp3
// 밤       (19:00~05:59): 밤.mp3
function getTrackUrl(): string {
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 17) {
    return `${ASSET_BASE}/assets/7%EB%B2%88.mp3`;
  } else if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)) {
    return `${ASSET_BASE}/assets/%EC%A0%80%EB%85%81.mp3`; // 저녁.mp3
  } else {
    return `${ASSET_BASE}/assets/%EB%B0%A4.mp3`; // 밤.mp3
  }
}

// 모듈 레벨 싱글톤: 페이지 이동·StrictMode 재실행에도 인스턴스 유지
let _audio: HTMLAudioElement | null = null;
let _currentSrc = "";
let _listenerAttached = false;
let _muted = false;
let _tutorialMode = false; // 튜토리얼 중 게임 BGM 자동재생 차단

function ensureCorrectTrack(): HTMLAudioElement {
  const src = getTrackUrl();
  if (!_audio) {
    _audio = new Audio(src);
    _audio.loop = true;
    _audio.volume = 0.5;
    _currentSrc = src;
  } else if (_currentSrc !== src) {
    const wasPlaying = !_audio.paused;
    _audio.pause();
    _audio.src = src;
    _audio.load();
    _currentSrc = src;
    if (wasPlaying && !_muted) _audio.play().catch(() => {});
  }
  return _audio;
}

function tryPlay() {
  if (_muted || _tutorialMode) return;
  const audio = ensureCorrectTrack();
  if (audio.paused) {
    audio.play().catch(() => {});
  }
}

// 시간대 변경 여부만 확인 (매 분마다)
function checkTrackChange() {
  const src = getTrackUrl();
  if (_audio && _currentSrc !== src) {
    const wasPlaying = !_audio.paused;
    _audio.pause();
    _audio.src = src;
    _audio.load();
    _currentSrc = src;
    if (wasPlaying && !_muted) _audio.play().catch(() => {});
  }
}

/** BGM 뮤트 토글. 뮤트 상태(true=꺼짐)를 반환 */
export function toggleBgm(): boolean {
  _muted = !_muted;
  const audio = ensureCorrectTrack();
  if (_muted) {
    audio.pause();
  } else {
    audio.play().catch(() => {});
  }
  return _muted;
}

/** 현재 뮤트 상태 반환 (true=꺼짐) */
export function isBgmMuted(): boolean {
  return _muted;
}

/** 게임 BGM만 즉시 일시정지 (튜토리얼 모드 진입) */
export function pauseGameBgm() {
  _tutorialMode = true;
  if (_audio && !_audio.paused) _audio.pause();
}

// ── 튜토리얼 전용 BGM ──
let _tutorialAudio: HTMLAudioElement | null = null;       // 스토리: awake.mp3
let _questTutorialAudio: HTMLAudioElement | null = null;  // 퀘스트: tutorial.mp3
let _fadeInterval: ReturnType<typeof setInterval> | null = null;

/** 스토리 BGM(awake.mp3) 재생 — 게임 BGM 차단 후 볼륨 0에서 서서히 fade-in */
export function playTutorialBgm() {
  // 기존 게임 BGM 일시정지
  if (_audio && !_audio.paused) _audio.pause();

  const src = `${ASSET_BASE}/assets/awake.mp3`;
  if (!_tutorialAudio) {
    _tutorialAudio = new Audio(src);
    _tutorialAudio.loop = true;
  }
  _tutorialAudio.volume = 0;
  _tutorialAudio.currentTime = 0;
  _tutorialAudio.play().catch(() => {});

  // 2초에 걸쳐 볼륨 0 → 0.5 fade-in
  const target = 0.5;
  const steps = 40;
  const stepMs = 2000 / steps;
  let step = 0;
  const fadeIn = setInterval(() => {
    step++;
    if (_tutorialAudio) {
      _tutorialAudio.volume = Math.min(target, target * (step / steps));
    }
    if (step >= steps) clearInterval(fadeIn);
  }, stepMs);
}

/** awake.mp3 볼륨을 durationMs 동안 서서히 0으로 낮춤 */
export function fadeTutorialBgmOut(durationMs = 1200) {
  if (!_tutorialAudio) return;
  if (_fadeInterval) { clearInterval(_fadeInterval); _fadeInterval = null; }
  const steps = 30;
  const stepMs = durationMs / steps;
  const startVolume = _tutorialAudio.volume;
  let step = 0;
  _fadeInterval = setInterval(() => {
    step++;
    if (_tutorialAudio) {
      _tutorialAudio.volume = Math.max(0, startVolume * (1 - step / steps));
    }
    if (step >= steps) {
      clearInterval(_fadeInterval!);
      _fadeInterval = null;
    }
  }, stepMs);
}

/** 퀘스트 튜토리얼 BGM(tutorial.mp3) 재생 — 스토리 BGM 정지 후 서서히 볼륨 올리며 재생 */
export function playQuestTutorialBgm() {
  // 페이드 인터벌 정리
  if (_fadeInterval) { clearInterval(_fadeInterval); _fadeInterval = null; }
  // awake.mp3 정지 + 볼륨 초기화
  if (_tutorialAudio) {
    _tutorialAudio.pause();
    _tutorialAudio.currentTime = 0;
    _tutorialAudio.volume = 0.5;
  }
  // 게임 BGM 차단 유지
  _tutorialMode = true;

  const src = `${ASSET_BASE}/assets/tutorial.mp3`;
  if (!_questTutorialAudio) {
    _questTutorialAudio = new Audio(src);
    _questTutorialAudio.loop = true;
  }
  _questTutorialAudio.volume = 0;
  _questTutorialAudio.currentTime = 0;

  // 2초 딜레이 후 서서히 볼륨 올리며 재생
  setTimeout(() => {
    if (!_questTutorialAudio) return;
    _questTutorialAudio.play().catch(() => {});
    const target = 0.5;
    const steps = 30;
    const stepMs = 1500 / steps; // 1.5초에 걸쳐 fade-in
    let step = 0;
    const fadeIn = setInterval(() => {
      step++;
      if (_questTutorialAudio) {
        _questTutorialAudio.volume = Math.min(target, target * (step / steps));
      }
      if (step >= steps) clearInterval(fadeIn);
    }, stepMs);
  }, 2000);
}

/** 튜토리얼 BGM 전체 중지 — 게임 BGM 재개 */
export function stopTutorialBgm() {
  _tutorialMode = false;
  if (_tutorialAudio) {
    _tutorialAudio.pause();
    _tutorialAudio.currentTime = 0;
  }
  if (_questTutorialAudio) {
    _questTutorialAudio.pause();
    _questTutorialAudio.currentTime = 0;
  }
  // 뮤트 상태가 아니면 게임 BGM 재개
  if (!_muted) {
    ensureCorrectTrack().play().catch(() => {});
  }
}

export default function BgmPlayer() {
  useEffect(() => {
    tryPlay();

    if (!_listenerAttached) {
      _listenerAttached = true;
      const onInteract = () => tryPlay();
      window.addEventListener("click", onInteract, true);
      window.addEventListener("touchend", onInteract, true);
      window.addEventListener("keydown", onInteract, true);
    }

    const interval = setInterval(checkTrackChange, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
