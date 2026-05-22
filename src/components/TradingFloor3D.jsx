import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

const SECTOR_BLOCKS = [
  ["IT", -9, -7, 1.4, "#5ca8ff"],
  ["BANK", -5, -8, 2.1, "#18c683"],
  ["ENERGY", -1, -7, 1.7, "#f5b84b"],
  ["AUTO", 3, -8, 1.3, "#ff7a66"],
  ["PHARMA", 7, -7, 1.6, "#9d7bff"],
  ["FMCG", 10, -9, 1.1, "#7ee7ba"]
];

const RAILS = [
  { y: 4.8, z: -5.8, speed: 0.18, color: "#18c683" },
  { y: 3.5, z: -9.2, speed: -0.12, color: "#5ca8ff" },
  { y: 2.4, z: -12.4, speed: 0.1, color: "#f5b84b" }
];

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) ||
          canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function TradingFloor3D({ indices = [], marketStatus, selected }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(supportsWebGL());
  }, []);

  return (
    <div className="three-shell" aria-hidden="true">
      <div className="three-fallback-grid" />
      {enabled && (
        <Canvas
          dpr={[1, 1.45]}
          frameloop="always"
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
          }}
        >
          <TradingFloorScene indices={indices} marketStatus={marketStatus} selected={selected} />
        </Canvas>
      )}
    </div>
  );
}

function TradingFloorScene({ indices, marketStatus, selected }) {
  const sceneRef = useRef(null);
  const cameraRig = useRef(null);
  const phase = marketStatus?.session?.phase || "closed";
  const isOpen = phase === "open";
  const accent = isOpen ? "#18c683" : phase === "pre" ? "#f5b84b" : "#ff5f6f";

  useFrame(({ clock, camera }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    if (sceneRef.current) {
      sceneRef.current.rotation.y = Math.sin(t * 0.11) * 0.025;
    }
    if (cameraRig.current) {
      cameraRig.current.position.x = Math.sin(t * 0.08) * 0.45;
      cameraRig.current.position.y = Math.sin(t * 0.12) * 0.18;
    }
    camera.lookAt(0, 0.8, -7);
  });

  return (
    <>
      <fog attach="fog" args={["#03060d", 12, 33]} />
      <PerspectiveCamera ref={cameraRig} makeDefault position={[0, 5.6, 10.8]} fov={43} />
      <ambientLight intensity={0.52} />
      <directionalLight position={[4, 8, 6]} intensity={1.3} color="#a9d5ff" />
      <pointLight position={[-6, 3, -5]} intensity={isOpen ? 22 : 11} color={accent} distance={16} />
      <group ref={sceneRef}>
        <MarketFloor accent={accent} />
        <IndexTowers indices={indices} accent={accent} />
        <SectorBlocks />
        <TickerRails selected={selected} />
        <PulseRing color={accent} />
      </group>
    </>
  );
}

function MarketFloor({ accent }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -7.2]}>
        <planeGeometry args={[34, 24, 1, 1]} />
        <meshStandardMaterial color="#050914" metalness={0.35} roughness={0.6} transparent opacity={0.62} />
      </mesh>
      <gridHelper args={[34, 34, "#173857", "#0f1a2d"]} position={[0, 0.01, -7.2]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -7.2]}>
        <ringGeometry args={[4.4, 4.48, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -7.2]}>
        <ringGeometry args={[8.2, 8.28, 112]} />
        <meshBasicMaterial color="#5ca8ff" transparent opacity={0.13} />
      </mesh>
    </group>
  );
}

function IndexTowers({ indices, accent }) {
  const towers = useMemo(() => {
    const defaults = [
      { symbol: "NIFTY", changePercent: 0, price: null },
      { symbol: "SENSEX", changePercent: 0, price: null },
      { symbol: "BANK", changePercent: 0, price: null }
    ];
    return defaults.map((fallback, index) => ({
      ...fallback,
      ...(indices[index] || {})
    }));
  }, [indices]);

  return (
    <group position={[0, 0, -7.1]}>
      {towers.map((item, index) => {
        const change = Number(item?.changePercent || 0);
        const height = THREE.MathUtils.clamp(1.7 + Math.abs(change) * 0.5, 1.7, 4.4);
        const color = change > 0 ? "#18c683" : change < 0 ? "#ff5f6f" : accent;
        const x = (index - 1) * 3.4;
        return (
          <Float key={`${item.symbol}-${index}`} speed={1.1 + index * 0.18} floatIntensity={0.08} rotationIntensity={0.05}>
            <group position={[x, height / 2, 0]}>
              <mesh>
                <boxGeometry args={[1.15, height, 1.15]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.25} roughness={0.36} transparent opacity={0.72} />
              </mesh>
              <mesh position={[0, height / 2 + 0.18, 0]}>
                <boxGeometry args={[1.42, 0.08, 1.42]} />
                <meshBasicMaterial color={color} transparent opacity={0.52} />
              </mesh>
              <mesh position={[0, -height / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.72, 0.78, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} />
              </mesh>
            </group>
          </Float>
        );
      })}
    </group>
  );
}

function SectorBlocks() {
  return (
    <group>
      {SECTOR_BLOCKS.map(([name, x, z, height, color], index) => (
        <group key={name} position={[x, height / 2, z]}>
          <mesh>
            <boxGeometry args={[1.75, height, 1.15]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} metalness={0.2} roughness={0.52} transparent opacity={0.44} />
          </mesh>
          <mesh position={[0, height / 2 + 0.12, 0]}>
            <boxGeometry args={[1.95, 0.06, 1.32]} />
            <meshBasicMaterial color={color} transparent opacity={0.32 + index * 0.018} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TickerRails({ selected }) {
  const railRefs = useRef([]);
  const symbolBias = (selected?.symbol || "NIFTY").length % 5;

  useFrame(({ clock }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    railRefs.current.forEach((rail, index) => {
      if (!rail) return;
      rail.position.x = Math.sin(t * RAILS[index].speed + symbolBias) * 2.6;
    });
  });

  return (
    <group>
      {RAILS.map((rail, railIndex) => (
        <group
          key={rail.z}
          ref={(node) => {
            railRefs.current[railIndex] = node;
          }}
          position={[0, rail.y, rail.z]}
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <mesh key={`${rail.z}-${index}`} position={[(index - 4) * 2.15, 0, 0]}>
              <boxGeometry args={[1.34, 0.16, 0.06]} />
              <meshBasicMaterial color={rail.color} transparent opacity={0.18 + (index % 3) * 0.08} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function PulseRing({ color }) {
  const ringRef = useRef(null);

  useFrame(({ clock }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    if (!ringRef.current) return;
    const scale = 1 + (Math.sin(t * 0.9) + 1) * 0.08;
    ringRef.current.scale.set(scale, scale, scale);
    ringRef.current.material.opacity = 0.12 + (Math.sin(t * 0.9) + 1) * 0.05;
  });

  return (
    <mesh ref={ringRef} position={[0, 1.08, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[5.1, 0.018, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.16} />
    </mesh>
  );
}
