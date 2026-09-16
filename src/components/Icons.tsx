import React from "react";

import { Dna, Microscope } from "lucide-react";


export const GradientSVG = ({ 
  SvgComponent, 
  className 
}: { 
  SvgComponent: React.FC<React.SVGProps<SVGSVGElement>>, 
  className?: string 
}) => {
  return (
    <div className={`relative group cursor-default w-full h-full ${className || ''}`} style={{ willChange: "transform" }}>

      <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-100 group-hover:opacity-0 will-change-opacity">
        <SvgComponent className="w-full h-full" stroke="url(#grad-normal)" />
      </div>

      <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-0 group-hover:opacity-100 will-change-opacity">
        <SvgComponent className="w-full h-full" stroke="url(#grad-hover)" />
      </div>
    </div>
  )
}

export const CellSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5" {...props}>
    <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
    <circle cx="50" cy="50" r="30" />
    <circle cx="50" cy="50" r="20" strokeDasharray="2 4" />
    <circle cx="50" cy="50" r="5" />
  </svg>
);

export const DnaSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <Dna {...props} strokeWidth={1.5} />
);

export const MicroscopeSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <Microscope {...props} strokeWidth={1.5} />
);

export const VirusSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="50,15 70,35 50,55 30,35" />
    <line x1="50" y1="15" x2="50" y2="55" />
    <line x1="30" y1="35" x2="70" y2="35" />
    <line x1="50" y1="55" x2="50" y2="75" />
    <path d="M50,75 L35,95 M50,75 L65,95 M50,65 L25,85 M50,65 L75,85" />
  </svg>
);

export const ChromosomeSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>

    <line x1="40" y1="30" x2="60" y2="30" strokeDasharray="2 2" opacity="0.4" />
    <line x1="40" y1="70" x2="60" y2="70" strokeDasharray="2 2" opacity="0.4" />

    <line x1="50" y1="45" x2="50" y2="55" />

    <line x1="50" y1="45" x2="40" y2="30" />
    <line x1="40" y1="30" x2="30" y2="15" />
    <line x1="40" y1="30" x2="28" y2="35" />

    <line x1="50" y1="45" x2="60" y2="30" />
    <line x1="60" y1="30" x2="70" y2="15" />
    <line x1="60" y1="30" x2="72" y2="35" />

    <line x1="50" y1="55" x2="40" y2="70" />
    <line x1="40" y1="70" x2="30" y2="85" />
    <line x1="40" y1="70" x2="28" y2="65" />

    <line x1="50" y1="55" x2="60" y2="70" />
    <line x1="60" y1="70" x2="70" y2="85" />
    <line x1="60" y1="70" x2="72" y2="65" />

    <circle cx="50" cy="45" r="2.5" fill="currentColor" />
    <circle cx="50" cy="55" r="2.5" fill="currentColor" />
    
    <circle cx="40" cy="30" r="2" fill="currentColor" />
    <circle cx="30" cy="15" r="1.5" fill="currentColor" />
    <circle cx="28" cy="35" r="1" />
    
    <circle cx="60" cy="30" r="2" fill="currentColor" />
    <circle cx="70" cy="15" r="1.5" fill="currentColor" />
    <circle cx="72" cy="35" r="1" />

    <circle cx="40" cy="70" r="2" fill="currentColor" />
    <circle cx="30" cy="85" r="1.5" fill="currentColor" />
    <circle cx="28" cy="65" r="1" />

    <circle cx="60" cy="70" r="2" fill="currentColor" />
    <circle cx="70" cy="85" r="1.5" fill="currentColor" />
    <circle cx="72" cy="65" r="1" />
  </svg>
);

export const RnaSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>

    <path d="M 10 50 C 20 20, 40 20, 50 50 C 60 80, 80 80, 90 50" strokeWidth="2.5" />

    <g strokeWidth="1.5">
      <line x1="20" y1="38" x2="24" y2="47" />
      <line x1="30" y1="27.5" x2="30" y2="37.5" />
      <line x1="40" y1="38" x2="36" y2="47" />
      
      <line x1="60" y1="62" x2="64" y2="52" />
      <line x1="70" y1="72.5" x2="70" y2="62.5" />
      <line x1="80" y1="62" x2="76" y2="52" />
    </g>

    <circle cx="24" cy="47" r="2" fill="currentColor" />
    <circle cx="30" cy="37.5" r="2" fill="currentColor" />
    <circle cx="36" cy="47" r="2" fill="currentColor" />
    
    <circle cx="64" cy="52" r="2" fill="currentColor" />
    <circle cx="70" cy="62.5" r="2" fill="currentColor" />
    <circle cx="76" cy="52" r="2" fill="currentColor" />
  </svg>
);

export const ScanLesionSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* scanner corner brackets */}
    <path d="M 8 28 L 8 8 L 28 8" strokeWidth="2.5" />
    <path d="M 72 8 L 92 8 L 92 28" strokeWidth="2.5" />
    <path d="M 92 72 L 92 92 L 72 92" strokeWidth="2.5" />
    <path d="M 28 92 L 8 92 L 8 72" strokeWidth="2.5" />
    {/* lesion outline */}
    <path d="M 50 32 C 61 32, 69 40, 68 51 C 67 62, 59 70, 49 69 C 38 68, 31 60, 32 49 C 33 39, 40 32, 50 32 Z" strokeWidth="1.8" />
    {/* crosshair */}
    <line x1="50" y1="24" x2="50" y2="34" strokeWidth="1.2" />
    <line x1="50" y1="66" x2="50" y2="76" strokeWidth="1.2" />
    <line x1="24" y1="50" x2="34" y2="50" strokeWidth="1.2" />
    <line x1="66" y1="50" x2="76" y2="50" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
  </svg>
);

export const SkinCellSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    {/* cell membrane */}
    <circle cx="50" cy="50" r="42" strokeWidth="2" />
    <circle cx="50" cy="50" r="36" strokeDasharray="2 4" opacity="0.5" />
    {/* nucleus */}
    <circle cx="50" cy="50" r="14" strokeWidth="2" />
    <circle cx="46" cy="46" r="4" fill="currentColor" stroke="none" opacity="0.6" />
    {/* organelles */}
    <circle cx="30" cy="62" r="2.5" fill="currentColor" stroke="none" opacity="0.4" />
    <circle cx="68" cy="34" r="2" fill="currentColor" stroke="none" opacity="0.4" />
    <circle cx="64" cy="66" r="3" fill="currentColor" stroke="none" opacity="0.3" />
    <circle cx="34" cy="32" r="1.8" fill="currentColor" stroke="none" opacity="0.4" />
  </svg>
);

export const LesionBlobSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
    <path d="M52 12 C70 14, 86 28, 84 48 C82 66, 70 84, 50 86 C30 88, 14 74, 14 54 C14 32, 32 10, 52 12 Z" />
    <path d="M48 32 C60 30, 68 40, 66 52 C64 64, 54 70, 44 66 C34 62, 30 50, 34 42 C38 34, 42 33, 48 32 Z" strokeWidth="1.2" opacity="0.6" />
    <circle cx="54" cy="46" r="2" fill="currentColor" stroke="none" />
    <circle cx="44" cy="56" r="1.5" fill="currentColor" stroke="none" opacity="0.7" />
  </svg>
);

export const HexagonSVG = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
    <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
    <polygon points="50,25 70,35 70,65 50,75 30,65 30,35" />
    <circle cx="50" cy="50" r="5" />
  </svg>
);
