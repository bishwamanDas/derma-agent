import React from "react";
import { SkinCellSVG, LesionBlobSVG, ScanLesionSVG, CellSVG } from "./Icons";

export default function BackgroundDecorations() {
  return (
    <>
      <style>{`
        @keyframes roam-1 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          33% { transform: translate3d(15vw, 15vh, 0) rotate(45deg); }
          66% { transform: translate3d(-10vw, 25vh, 0) rotate(90deg); }
          100% { transform: translate3d(0, 0, 0) rotate(180deg); }
        }
        @keyframes roam-2 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50% { transform: translate3d(-20vw, -15vh, 0) rotate(-60deg) scale(1.1); }
          100% { transform: translate3d(15vw, 10vh, 0) rotate(60deg) scale(0.9); }
        }
        .animate-roam-1 {
          animation: roam-1 45s infinite ease-in-out alternate;
          will-change: transform;
          backface-visibility: hidden;
        }
        .animate-roam-2 {
          animation: roam-2 60s infinite ease-in-out alternate;
          will-change: transform;
          backface-visibility: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-roam-1, .animate-roam-2 { animation: none !important; will-change: auto; }
        }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[500px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent blur-[100px] -rotate-45 pointer-events-none" />

        <div className="absolute top-[10%] -right-16 text-blue-400/10 animate-roam-1 w-64 h-64 pointer-events-auto hover:scale-125 hover:text-blue-400/30 hover:drop-shadow-lg transition-all duration-300 ease-out cursor-default">
          <SkinCellSVG className="w-full h-full" />
        </div>

        <div className="absolute bottom-[10%] -left-32 text-blue-300/40 animate-spin-slow w-[400px] h-[400px] pointer-events-auto hover:scale-110 hover:text-blue-400/60 transition-all duration-300 ease-out cursor-default">
          <CellSVG className="w-full h-full" />
        </div>

        <div className="absolute top-[40%] left-[10%] text-blue-400/30 animate-roam-2 w-64 h-64 pointer-events-auto hover:scale-125 hover:text-blue-400/60 hover:drop-shadow-xl transition-all duration-300 ease-out cursor-default" style={{ animationDelay: "2s" }}>
          <LesionBlobSVG className="w-full h-full" />
        </div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[15%] right-[10%] text-blue-300/40 animate-float-slow w-48 h-48 pointer-events-auto hover:scale-125 hover:text-blue-400/60 transition-all duration-300 ease-out cursor-default">
          <ScanLesionSVG className="w-full h-full" />
        </div>

        <div className="absolute top-[35%] left-[5%] text-blue-400/10 animate-roam-2 w-56 h-56 pointer-events-auto hover:scale-125 hover:text-blue-400/30 hover:drop-shadow-lg transition-all duration-300 ease-out cursor-default" style={{ animationDelay: "5s" }}>
          <SkinCellSVG className="w-full h-full" />
        </div>

        <div className="absolute top-[55%] right-[15%] text-blue-300/30 animate-roam-1 w-72 h-72 pointer-events-auto hover:scale-110 hover:text-blue-400/60 transition-all duration-300 ease-out cursor-default">
          <CellSVG className="w-full h-full" />
        </div>

        <div className="absolute top-[75%] left-[20%] text-blue-400/10 animate-float w-64 h-64 pointer-events-auto hover:scale-125 hover:text-blue-400/30 hover:drop-shadow-lg transition-all duration-300 ease-out cursor-default">
          <LesionBlobSVG className="w-full h-full" />
        </div>

        <div className="absolute top-[90%] right-[25%] text-blue-300/40 animate-spin-slow w-40 h-40 pointer-events-auto hover:scale-125 hover:text-blue-400/60 transition-all duration-300 ease-out cursor-default">
          <ScanLesionSVG className="w-full h-full" />
        </div>
      </div>
    </>
  );
}
