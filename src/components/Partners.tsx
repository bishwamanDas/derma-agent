"use client";

const clinicalDatasets = [
  "ISIC 2019 Benchmark",
  "HAM10000 Cohort",
  "BCN20000 Dataset",
  "Medical University of Vienna",
  "Harvard Dataverse",
  "Memorial Sloan Kettering",
  "DermNet NZ Clinical Atlas",
  "ISIC Archive",
];

const agentTechnologies = [
  "Google Gemini",
  "PyTorch",
  "MobileNetV3 Neural Network",
  "ReAct Multi-Agent Engine",
  "FastAPI",
  "Next.js 16",
  "TorchVision",
  "Computer Vision ABCDE",
];

export default function Partners() {

  const track = [...clinicalDatasets, ...clinicalDatasets];
  const track2 = [...agentTechnologies, ...agentTechnologies];

  return (
    <section className="relative py-16 border-y border-white/5 overflow-hidden">
      <div className="flex flex-col">

        <div className="flex animate-marquee w-max mb-8">
          {track.map((name, i) => (
            <div
              key={`row1-${name}-${i}`}
              className="flex items-center justify-center px-12 text-lg font-semibold
                text-slate-900/15 font-heading whitespace-nowrap
                hover:text-blue-500 transition-colors duration-500 cursor-default"
            >
              {name}
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 my-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted text-center font-medium">
            Powered by open dermatology research &amp; autonomous clinical AI agents
          </p>
        </div>

        <div className="flex animate-marquee-reverse w-max mt-8">
          {track2.map((name, i) => (
            <div
              key={`row2-${name}-${i}`}
              className="flex items-center justify-center px-12 text-lg font-semibold
                text-slate-900/15 font-heading whitespace-nowrap
                hover:text-blue-500 transition-colors duration-500 cursor-default"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
