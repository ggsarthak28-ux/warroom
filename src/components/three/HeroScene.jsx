import { useEffect, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import ScrollCamera from "./ScrollCamera";
import CandlestickField from "./CandlestickField";
import ParticleStream from "./ParticleStream";
import DataGrid from "./DataGrid";

let moduleScrollProgress = 0;
let moduleAnimationFrame = null;
const scrollSubscribers = new Set();

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function readScrollProgress() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return 0;
  }

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const documentHeight = Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0
  );
  const maxScroll = Math.max(documentHeight - window.innerHeight, 0);

  return maxScroll > 0 ? clamp01(scrollY / maxScroll) : 0;
}

function publishScrollProgress() {
  moduleAnimationFrame = null;
  moduleScrollProgress = readScrollProgress();
  scrollSubscribers.forEach((subscriber) => subscriber(moduleScrollProgress));
}

function requestScrollProgressUpdate() {
  if (typeof window === "undefined" || moduleAnimationFrame !== null) {
    return;
  }

  moduleAnimationFrame = window.requestAnimationFrame(publishScrollProgress);
}

function useModuleScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(moduleScrollProgress);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleScrollProgress = (nextScrollProgress) => {
      setScrollProgress(nextScrollProgress);
    };

    scrollSubscribers.add(handleScrollProgress);
    publishScrollProgress();

    window.addEventListener("scroll", requestScrollProgressUpdate, { passive: true });
    window.addEventListener("resize", requestScrollProgressUpdate, { passive: true });

    return () => {
      scrollSubscribers.delete(handleScrollProgress);
      window.removeEventListener("scroll", requestScrollProgressUpdate);
      window.removeEventListener("resize", requestScrollProgressUpdate);

      if (moduleAnimationFrame !== null && scrollSubscribers.size === 0) {
        window.cancelAnimationFrame(moduleAnimationFrame);
        moduleAnimationFrame = null;
      }
    };
  }, []);

  return scrollProgress;
}

export default function HeroScene() {
  const sp = useModuleScrollProgress();

  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      frameloop="always"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <color attach="background" args={["#0a0a0f"]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} color="#00ff88" intensity={2} />
      <directionalLight position={[0, 10, 5]} color="#ffd700" intensity={0.5} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      <ScrollCamera />
      <CandlestickField scrollProgress={sp} />
      <ParticleStream scrollProgress={sp} />
      <DataGrid scrollProgress={sp} />
    </Canvas>
  );
}
