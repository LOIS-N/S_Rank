"use client";
import { useState } from "react";
import { TUTORIAL_SCRIPTS } from "@/lib/tutorialData";

interface Props { onComplete: () => void; }

export default function TutorialCompleteOverlay({ onComplete }: Props) {
  const lines = TUTORIAL_SCRIPTS['step99_final'] ?? [];
  const [lineIdx, setLineIdx] = useState(0);

  const advance = () => {
    if (lineIdx < lines.length - 1) setLineIdx(lineIdx + 1);
    else onComplete();
  };

  const currentLine = lines[lineIdx];
  if (!currentLine) return null;

  return (
    <div
      className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-auto font-dot"
      style={{ background: "rgba(0,0,8,0.85)" }}
      onClick={advance}
    >
      <div style={{
        background: "rgba(8,18,58,0.97)",
        border: "2px solid #3a6fad",
        borderRadius: "4px",
        padding: "2cqw 3cqw",
        maxWidth: "50cqw",
        textAlign: "center",
        cursor: "pointer",
        userSelect: "none",
      }}>
        <div style={{ fontSize: "0.85cqw", color: "#7ab8ff", marginBottom: "0.8cqw", letterSpacing: "0.1em" }}>
          [ System ]
        </div>
        <div style={{ fontSize: "1.5cqw", color: "#c8e8ff", lineHeight: 1.8 }}>
          {currentLine.text}
        </div>
        <div style={{ fontSize: "0.9cqw", color: "#6688bb", marginTop: "1cqw" }}>▶ 클릭하여 계속</div>
      </div>
    </div>
  );
}
