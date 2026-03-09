import dynamic from "next/dynamic";
import UIOverlay from "@/components/UIOverlay";

// Phaser는 클라이언트에서만 렌더링되도록 설정
const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-4">
      <h1 className="text-4xl font-bold text-white mb-4">My React Phaser Game</h1>
      
      <div className="relative">
        <GameCanvas />
        <UIOverlay />
      </div>
    </main>
  );
}