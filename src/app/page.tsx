import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Partners from "@/components/Partners";
import About from "@/components/About";
import Tech from "@/components/Tech";
import Services from "@/components/Services";
import RiskCheck from "@/components/RiskCheck";
import SkinAnalysis from "@/components/SkinAnalysis";
import AgentChat from "@/components/AgentChat";
import Stats from "@/components/Stats";
import Quote from "@/components/Quote";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Partners />
      <About />
      <Tech />
      <Services />
      <RiskCheck />
      <SkinAnalysis />
      <AgentChat />
      <Stats />
      <Quote />
      <Cta />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
