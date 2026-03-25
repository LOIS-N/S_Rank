"use client";
import { useState, useEffect, useRef } from "react";
import { TUTORIAL_SCRIPTS } from "@/lib/tutorialData";
import { useGameStore } from "@/store/useGameStore";

interface Props {
  scriptId: string;
  onDone: () => void;
}

export default function TutorialQuestScript({ scriptId, onDone }: Props) {
  const lines = TUTORIAL_SCRIPTS[scriptId] ?? [];
  const [lineIdx, setLineIdx] = useState(0);
  const nickname = useGameStore(s => s.nickname);
  // 스크립트 표시 직후 클릭 이벤트가 즉시 전달되는 것을 막기 위한 guard
  const readyTimeRef = useRef(0);

  useEffect(() => {
    setLineIdx(0);
    readyTimeRef.current = Date.now() + 400;
  }, [scriptId]);

  if (lines.length === 0) { onDone(); return null; }

  const currentLine = lines[lineIdx];
  if (!currentLine) return null;

  const advance = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (Date.now() < readyTimeRef.current) return; // 400ms guard
    if (lineIdx < lines.length - 1) setLineIdx(lineIdx + 1);
    else onDone();
  };

  return (
    <div
      className="absolute inset-0 z-[200] pointer-events-auto flex flex-col justify-end"
      style={{ padding: "0 12.5cqw 6.5cqw" }}
      onClick={(e) => advance(e)}
    >
      <div style={{
        background: currentLine.isSystem ? "rgba(8,18,58,0.93)" : "rgba(14,24,50,0.88)",
        border: currentLine.isSystem ? "2px solid #3a6fad" : "2px solid #4a5a8a",
        borderRadius: "4px",
        padding: "1.5cqw 2cqw",
        minHeight: "8cqw",
        cursor: "pointer",
        userSelect: "none",
      }}>
        {currentLine.isSystem && (
          <div style={{ fontSize: "0.85cqw", color: "#7ab8ff", marginBottom: "0.5cqw", letterSpacing: "0.1em" }}>
            [ System ]
          </div>
        )}
        <div style={{
          fontSize: "1.4cqw",
          color: currentLine.isSystem ? "#c8e8ff" : "#e8e8e8",
          lineHeight: 1.6,
          fontFamily: "'Stardust', sans-serif",
        }}>
          {currentLine.text.replace('{{nickname}}', nickname || '유저')}
        </div>
        <div style={{ textAlign: "right", fontSize: "0.9cqw", color: "#6688bb", marginTop: "0.5cqw" }}>
          ▶ 클릭하여 계속
        </div>
      </div>
    </div>
  );
}
