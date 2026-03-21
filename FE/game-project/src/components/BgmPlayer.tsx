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
  if (_muted) return;
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
