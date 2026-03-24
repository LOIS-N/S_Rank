"use client";

interface DiscordModalProps {
  onClose: () => void;
}

export default function DiscordModal({ onClose }: DiscordModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#8ea4b8]/80 font-dot font-bold pointer-events-auto">
      <div className="bg-[#b0c4de] p-8 border-4 border-white w-[455px] text-center shadow-[8px_8px_0px_#4a5d73] relative">

        <button onClick={onClose} className="absolute top-2 right-4 text-white hover:text-red-600 text-xl drop-shadow-md">
          &times;
        </button>

        <h2 className="text-slate-900 font-bold text-3xl mb-7">디스코드 채널 연동</h2>

        <p className="text-slate-800 mb-8 text-xl leading-relaxed font-bold">
          공식 디스코드 채널에 참여하여<br/>다른 플레이어와 소통하세요!
        </p>

        <div className="flex flex-col gap-4">
          <a
            href="https://discord.gg/vVtweyat"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full block shrink-0 py-5 text-lg bg-[#5865F2] text-white border-b-4 border-r-4 border-[#3c45a5] active:border-0 active:translate-y-1 transition-all"
          >
            디스코드 채널로 이동하기
          </a>
          <button
            onClick={onClose}
            className="w-full py-5 text-lg bg-[#6b859e] text-white border-b-4 border-r-4 border-[#3e5368] active:border-0 active:translate-y-1 transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}