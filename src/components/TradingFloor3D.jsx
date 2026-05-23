import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { RGBShiftShader } from "three/examples/jsm/shaders/RGBShiftShader.js";

const TICKERS = ["NIFTY", "SENSEX", "RELIANCE", "BTC", "AAPL", "BANKNIFTY", "TSLA", "INFY", "TCS", "USDINR"];
const GRID_DEPTHS = [-18, -12, -6, 0, 6];
const WALL_LAYERS = [
  { x: -11.4, y: 3.1, z: -17.8, rotation: 0.42, width: 7.2, height: 4.4 },
  { x: 11.4, y: 3.25, z: -18.6, rotation: -0.42, width: 7.2, height: 4.4 },
  { x: 0, y: 5.35, z: -22.8, rotation: 0, width: 13.2, height: 3.2 }
];
const GREEN = "#18f59b";
const RED = "#ff5267";
const AMBER = "#ffb020";

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

function detectQuality() {
  if (typeof window === "undefined") return { tier: "performance", dpr: 1, particles: 700, effects: false, tickerCount: 5 };
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const narrow = window.innerWidth < 760;
  const highDpr = window.devicePixelRatio >= 2;
  if (reduced || narrow) return { tier: "performance", dpr: 1, particles: 720, effects: false, tickerCount: 5 };
  if (highDpr || window.innerWidth < 1280) return { tier: "balanced", dpr: 1.2, particles: 1300, effects: true, tickerCount: 7 };
  return { tier: "ultra", dpr: 1.45, particles: 2200, effects: true, tickerCount: 10 };
}

function trendFrom(selected, indices) {
  const values = [selected?.changePercent, ...(indices || []).map((item) => item?.changePercent)]
    .map(Number)
    .filter(Number.isFinite);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function TradingFloor3D({
  indices = [],
  selected,
  selectedHistory = [],
  marketStatus,
  dataStatus,
  shockwaveEventId = 0
}) {
  const [enabled, setEnabled] = useState(false);
  const [quality, setQuality] = useState(() => detectQuality());

  useEffect(() => {
    setEnabled(supportsWebGL());
    const onResize = () => setQuality(detectQuality());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const trend = trendFrom(selected, indices);
  const mood = trend >= 0 ? "bullish" : "bearish";

  return (
    <div className={`three-shell three-${quality.tier} three-${mood}`} aria-hidden="true">
      <div className="three-fallback-grid" />
      {enabled && (
        <Canvas
          dpr={[1, quality.dpr]}
          frameloop="always"
          shadows={quality.tier !== "performance" ? { type: THREE.PCFShadowMap } : false}
          gl={{
            alpha: true,
            antialias: quality.tier !== "performance",
            powerPreference: "high-performance"
          }}
        >
          <CinematicMarketUniverse
            indices={indices}
            selected={selected}
            selectedHistory={selectedHistory}
            marketStatus={marketStatus}
            dataStatus={dataStatus}
            quality={quality}
            trend={trend}
            shockwaveEventId={shockwaveEventId}
          />
        </Canvas>
      )}
    </div>
  );
}

function CinematicMarketUniverse({ indices, selected, selectedHistory, marketStatus, dataStatus, quality, trend, shockwaveEventId }) {
  const world = useRef(null);
  const cameraRig = useRef(null);
  const shockwave = useRef({ id: 0, startedAt: -100 });
  const bullish = trend >= 0;
  const accent = bullish ? GREEN : RED;
  const secondary = bullish ? AMBER : "#ff9aa5";
  const sessionOpen = marketStatus?.session?.phase === "open";

  useFrame(({ clock, camera, pointer }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    if (shockwaveEventId !== shockwave.current.id) {
      shockwave.current = { id: shockwaveEventId, startedAt: t };
    }
    const shockAge = t - shockwave.current.startedAt;
    const shockPower = shockAge >= 0 && shockAge < 2 ? 1 - shockAge / 2 : 0;

    if (world.current) {
      world.current.rotation.y = Math.sin(t * 0.08) * 0.04;
      world.current.position.x = pointer.x * 0.32;
      world.current.position.y = pointer.y * 0.16;
      world.current.position.z = ((t * 0.82) % 8) - 4;
    }
    if (cameraRig.current) {
      cameraRig.current.position.x = Math.sin(t * 0.12) * 0.55 + pointer.x * 0.28 + shockPower * Math.sin(t * 48) * 0.07;
      cameraRig.current.position.y = 5.8 + Math.sin(t * 0.18) * 0.18 + pointer.y * 0.14 + shockPower * Math.cos(t * 52) * 0.05;
      cameraRig.current.position.z = 12.2 - ((t * 0.22) % 2.2) + shockPower * 0.18;
    }
    camera.lookAt(0, 0.8, -8);
  });

  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 7, 34]} />
      <PerspectiveCamera ref={cameraRig} makeDefault position={[0, 5.8, 12.2]} fov={48} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 8, 5]} intensity={1.5} color="#d6f6ff" castShadow={quality.tier !== "performance"} />
      <pointLight position={[-5, 3, -4]} intensity={sessionOpen ? 34 : 18} color={accent} distance={22} />
      <pointLight position={[5, 5, -10]} intensity={18} color={secondary} distance={20} />

      <group ref={world}>
        <CyberTradingFloor indices={indices} quality={quality} accent={accent} secondary={secondary} bullish={bullish} />
        <FinancialDataGrids accent={accent} />
        <NeonGraphLines candles={selectedHistory} accent={accent} secondary={secondary} />
        <MarketIndexTowers indices={indices} accent={accent} />
        <HolographicTickerRibbon selected={selected} quality={quality} accent={accent} />
      </group>
      <MarketParticles count={quality.particles} bullish={bullish} accent={accent} shockwaveEventId={shockwaveEventId} />
      <ShockwavePulse eventId={shockwaveEventId} accent={accent} />
      <HudStatus selected={selected} dataStatus={dataStatus} accent={accent} />
      {quality.effects && <PostProcessing quality={quality} accent={accent} />}
    </>
  );
}

function CyberTradingFloor({ indices, quality, accent, secondary, bullish }) {
  return (
    <group>
      <HolographicDataWalls quality={quality} accent={accent} secondary={secondary} bullish={bullish} />
      <ScanningMarketFloor quality={quality} accent={accent} secondary={secondary} />
      <MarketLightColumns indices={indices} quality={quality} accent={accent} secondary={secondary} />
      {quality.tier !== "performance" && <DepthLightRails accent={accent} secondary={secondary} />}
    </group>
  );
}

function HolographicDataWalls({ quality, accent, secondary, bullish }) {
  const group = useRef(null);
  const wallCells = useMemo(() => {
    const density = quality.tier === "ultra" ? 54 : quality.tier === "balanced" ? 36 : 20;
    return WALL_LAYERS.map((wall, wallIndex) =>
      Array.from({ length: density }, (_, index) => ({
        x: -wall.width / 2 + deterministic(index, wallIndex + 8) * wall.width,
        y: -wall.height / 2 + deterministic(index, wallIndex + 12) * wall.height,
        w: 0.16 + deterministic(index, wallIndex + 16) * 0.72,
        h: 0.025 + deterministic(index, wallIndex + 22) * 0.09,
        tone: deterministic(index, wallIndex + 30) > 0.72 ? secondary : accent,
        delay: deterministic(index, wallIndex + 36) * 4
      }))
    );
  }, [accent, quality.tier, secondary]);

  useFrame(({ clock, pointer }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.x = pointer.x * 0.42;
    group.current.rotation.y = Math.sin(t * 0.08) * 0.025;
  });

  return (
    <group ref={group}>
      {WALL_LAYERS.map((wall, wallIndex) => (
        <group
          key={`${wall.z}-${wallIndex}`}
          position={[wall.x, wall.y, wall.z]}
          rotation={[0, wall.rotation, 0]}
        >
          <mesh>
            <planeGeometry args={[wall.width, wall.height]} />
            <meshBasicMaterial color="#031120" transparent opacity={quality.tier === "performance" ? 0.24 : 0.36} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[wall.width - 0.16, wall.height - 0.16]} />
            <meshBasicMaterial color={bullish ? "#0c2e2a" : "#2b1019"} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {Array.from({ length: 7 }).map((_, index) => (
            <mesh key={`h-${index}`} position={[0, -wall.height / 2 + index * (wall.height / 6), 0.025]}>
              <boxGeometry args={[wall.width, 0.01, 0.012]} />
              <meshBasicMaterial color={index % 2 ? secondary : accent} transparent opacity={0.16} depthWrite={false} />
            </mesh>
          ))}
          {Array.from({ length: 10 }).map((_, index) => (
            <mesh key={`v-${index}`} position={[-wall.width / 2 + index * (wall.width / 9), 0, 0.025]}>
              <boxGeometry args={[0.01, wall.height, 0.012]} />
              <meshBasicMaterial color={index % 2 ? secondary : accent} transparent opacity={0.1} depthWrite={false} />
            </mesh>
          ))}
          {wallCells[wallIndex].map((cell, index) => (
            <DataWallPulse key={`${wallIndex}-${index}`} cell={cell} />
          ))}
          <ScanningWallBeam width={wall.width} height={wall.height} accent={accent} secondary={secondary} offset={wallIndex * 0.8} />
        </group>
      ))}
    </group>
  );
}

function DataWallPulse({ cell }) {
  const mesh = useRef(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const pulse = 0.36 + Math.max(0, Math.sin(clock.getElapsedTime() * 1.8 + cell.delay)) * 0.46;
    mesh.current.material.opacity = pulse;
    mesh.current.scale.x = 0.74 + pulse * 0.45;
  });

  return (
    <mesh ref={mesh} position={[cell.x, cell.y, 0.045]}>
      <boxGeometry args={[cell.w, cell.h, 0.018]} />
      <meshBasicMaterial color={cell.tone} transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function ScanningWallBeam({ width, height, accent, secondary, offset }) {
  const beam = useRef(null);

  useFrame(({ clock }) => {
    if (!beam.current) return;
    const t = (clock.getElapsedTime() * 0.34 + offset) % 1;
    beam.current.position.y = -height / 2 + t * height;
    beam.current.material.opacity = 0.08 + Math.sin(t * Math.PI) * 0.26;
  });

  return (
    <mesh ref={beam} position={[0, -height / 2, 0.06]}>
      <boxGeometry args={[width, 0.08, 0.022]} />
      <meshBasicMaterial color={offset % 2 ? secondary : accent} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function ScanningMarketFloor({ quality, accent, secondary }) {
  const scan = useRef(null);
  const backScan = useRef(null);

  useFrame(({ clock }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    if (scan.current) {
      scan.current.position.z = -23 + ((t * 4.4) % 26);
      scan.current.material.opacity = quality.tier === "performance" ? 0.18 : 0.32;
    }
    if (backScan.current) {
      backScan.current.position.z = -23 + (((t * 2.7) + 12) % 26);
      backScan.current.material.opacity = 0.16 + Math.sin(t * 1.2) * 0.04;
    }
  });

  return (
    <group position={[0, -0.2, -10]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -4]}>
        <planeGeometry args={[32, 34]} />
        <meshBasicMaterial color="#020813" transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh ref={backScan} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -14]}>
        <planeGeometry args={[28, 0.18]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -18]}>
        <planeGeometry args={[30, 0.32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {Array.from({ length: quality.tier === "performance" ? 8 : 14 }).map((_, index) => (
        <mesh key={index} position={[-14 + index * 2.15, 0.04, -10]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.018, 0.85 + (index % 3) * 0.55, 0.018]} />
          <meshBasicMaterial color={index % 2 ? secondary : accent} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function MarketLightColumns({ indices, quality, accent, secondary }) {
  const columns = useMemo(() => {
    const source = indices?.filter(Boolean)?.length ? indices.filter(Boolean) : [
      { symbol: "NIFTY", changePercent: 0.3 },
      { symbol: "SENSEX", changePercent: 0.2 },
      { symbol: "BANK", changePercent: -0.1 }
    ];
    const total = quality.tier === "performance" ? 5 : 8;
    return Array.from({ length: total }, (_, index) => {
      const item = source[index % source.length] || {};
      const change = Number(item.changePercent || 0);
      return {
        symbol: item.symbol || TICKERS[index % TICKERS.length],
        change,
        x: -10.4 + index * (20.8 / Math.max(total - 1, 1)),
        z: -14 - deterministic(index, 44) * 7,
        delay: deterministic(index, 49) * 3
      };
    });
  }, [indices, quality.tier]);

  return (
    <group>
      {columns.map((column, index) => (
        <LightColumn key={`${column.symbol}-${index}`} column={column} accent={accent} secondary={secondary} />
      ))}
    </group>
  );
}

function LightColumn({ column, accent, secondary }) {
  const group = useRef(null);
  const positive = column.change >= 0;
  const color = positive ? accent : RED;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const pulse = 0.75 + Math.sin(t * 1.4 + column.delay) * 0.18;
    group.current.scale.y = pulse;
    group.current.position.y = 1.6 + Math.sin(t * 0.8 + column.delay) * 0.14;
  });

  return (
    <group ref={group} position={[column.x, 1.7, column.z]}>
      <mesh>
        <cylinderGeometry args={[0.055, 0.18, 4.8, 10, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -2.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.44, 24]} />
        <meshBasicMaterial color={positive ? secondary : RED} transparent opacity={0.38} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <Text position={[0, 2.68, 0]} fontSize={0.16} anchorX="center" anchorY="middle" color={color}>
        {String(column.symbol).slice(0, 7)}
      </Text>
    </group>
  );
}

function DepthLightRails({ accent, secondary }) {
  const rails = useRef(null);

  useFrame(({ clock, pointer }) => {
    if (!rails.current) return;
    const t = clock.getElapsedTime();
    rails.current.position.x = pointer.x * 0.22;
    rails.current.rotation.z = Math.sin(t * 0.16) * 0.018;
  });

  return (
    <group ref={rails} position={[0, 2.8, -16]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 8.8, 0, 0]} rotation={[0, side * -0.22, side * 0.08]}>
          {Array.from({ length: 5 }).map((_, index) => (
            <mesh key={index} position={[0, index * 0.54, -index * 1.24]} rotation={[0.1, 0, side * 0.32]}>
              <boxGeometry args={[0.034, 0.034, 6.2]} />
              <meshBasicMaterial color={index % 2 ? secondary : accent} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function FinancialDataGrids({ accent }) {
  return (
    <group>
      {GRID_DEPTHS.map((z, index) => (
        <group key={z} position={[0, 0, z - 11]}>
          <gridHelper args={[28, 28, index % 2 ? AMBER : accent, "#102033"]} position={[0, -0.3, 0]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]}>
            <planeGeometry args={[28, 28]} />
            <meshBasicMaterial color="#020713" transparent opacity={0.16} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 12 }).map((_, index) => (
        <mesh key={index} position={[-11 + index * 2, 2.4 + (index % 3) * 0.42, -18 + (index % 4) * 5]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.018, 3.6, 0.018]} />
          <meshBasicMaterial color={index % 2 ? AMBER : accent} transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function NeonGraphLines({ candles, accent, secondary }) {
  const points = useMemo(() => {
    const data = validCandles(candles).slice(-42);
    if (!data.length) {
      return Array.from({ length: 24 }, (_, index) => {
        const x = -8 + index * 0.7;
        const y = 1.2 + Math.sin(index * 0.6) * 0.5 + index * 0.03;
        return new THREE.Vector3(x, y, -9 - index * 0.16);
      });
    }
    const closes = data.map((candle) => candle.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = Math.max(max - min, max * 0.002, 1);
    return data.map((candle, index) => {
      const x = -9 + (index / Math.max(data.length - 1, 1)) * 18;
      const y = 1 + ((candle.close - min) / range) * 4.2;
      const z = -15 + Math.sin(index * 0.5) * 0.7;
      return new THREE.Vector3(x, y, z);
    });
  }, [candles]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group>
      <line geometry={geometry}>
        <lineBasicMaterial color={accent} transparent opacity={0.92} linewidth={2} />
      </line>
      <line geometry={geometry} position={[0, -0.08, 0.08]}>
        <lineBasicMaterial color={secondary} transparent opacity={0.36} linewidth={1} />
      </line>
      {points.filter((_, index) => index % 5 === 0).map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color={index % 2 ? secondary : accent} />
        </mesh>
      ))}
    </group>
  );
}

function MarketIndexTowers({ indices, accent }) {
  const towers = useMemo(() => {
    const defaults = [
      { symbol: "NIFTY", changePercent: 0 },
      { symbol: "SENSEX", changePercent: 0 },
      { symbol: "BANK", changePercent: 0 }
    ];
    return defaults.map((fallback, index) => ({ ...fallback, ...(indices[index] || {}) }));
  }, [indices]);

  return (
    <group position={[0, 0, -8]}>
      {towers.map((item, index) => {
        const change = Number(item.changePercent || 0);
        const color = change > 0 ? GREEN : change < 0 ? RED : accent;
        const height = THREE.MathUtils.clamp(1.4 + Math.abs(change) * 0.7, 1.4, 4.8);
        return (
          <group key={`${item.symbol}-${index}`} position={[(index - 1) * 3.1, height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.08, height, 1.08]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} metalness={0.45} roughness={0.24} transparent opacity={0.78} />
            </mesh>
            <Text position={[0, height / 2 + 0.42, 0]} fontSize={0.22} anchorX="center" anchorY="middle" color={color}>
              {String(item.symbol || "").slice(0, 8)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function HolographicTickerRibbon({ selected, quality, accent }) {
  const group = useRef(null);
  const symbols = useMemo(() => {
    const active = selected?.symbol ? [selected.symbol, ...TICKERS] : TICKERS;
    return Array.from(new Set(active)).slice(0, quality.tickerCount);
  }, [quality.tickerCount, selected]);

  useFrame(({ clock }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y = t * 0.07;
    group.current.position.y = Math.sin(t * 0.4) * 0.18;
  });

  return (
    <group ref={group} position={[0, 4.4, -11]}>
      {symbols.map((symbol, index) => {
        const angle = (index / symbols.length) * Math.PI * 2;
        const radius = 7.4;
        return (
          <Text
            key={`${symbol}-${index}`}
            position={[Math.cos(angle) * radius, Math.sin(index * 0.7) * 0.45, Math.sin(angle) * radius]}
            rotation={[0, -angle + Math.PI / 2, 0]}
            fontSize={0.34}
            anchorX="center"
            anchorY="middle"
            color={index % 3 === 0 ? accent : AMBER}
          >
            {symbol}
          </Text>
        );
      })}
    </group>
  );
}

function MarketParticles({ count, bullish, accent, shockwaveEventId }) {
  const mesh = useRef(null);
  const shock = useRef({ id: 0, startedAt: -100 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      x: deterministic(index, 1) * 28 - 14,
      y: deterministic(index, 2) * 10 - 2,
      z: deterministic(index, 3) * -28 + 3,
      size: 0.012 + deterministic(index, 4) * 0.04,
      speed: 0.08 + deterministic(index, 5) * 0.16
    }));
  }, [count]);

  useFrame(({ clock, pointer }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    if (shockwaveEventId !== shock.current.id) shock.current = { id: shockwaveEventId, startedAt: t };
    const shockAge = t - shock.current.startedAt;
    const shockPower = shockAge >= 0 && shockAge < 1.6 ? 1 - shockAge / 1.6 : 0;

    particles.forEach((particle, index) => {
      const drift = bullish ? particle.speed * t : -particle.speed * t;
      const shockRadius = shockPower * 6.5;
      const direction = index % 2 ? 1 : -1;
      dummy.position.set(
        particle.x + pointer.x * 1.2 + direction * shockRadius * deterministic(index, 6),
        wrap(particle.y + drift + shockRadius * 0.18, -2, 8.5),
        particle.z + pointer.y * 1.4 - shockRadius * deterministic(index, 7)
      );
      const scale = particle.size * (1 + shockPower * 5);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(t * 0.2 + index, t * 0.15, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.material.color.lerp(new THREE.Color(accent), 0.08);
    mesh.current.material.opacity = 0.35 + shockPower * 0.4;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={accent} transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

function ShockwavePulse({ eventId, accent }) {
  const ring = useRef(null);
  const startedAt = useRef(-100);
  const lastId = useRef(0);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = clock.getElapsedTime();
    if (eventId !== lastId.current) {
      lastId.current = eventId;
      startedAt.current = t;
    }
    const age = t - startedAt.current;
    const active = age >= 0 && age < 2;
    const scale = active ? 0.5 + age * 7 : 0.01;
    ring.current.scale.setScalar(scale);
    ring.current.material.opacity = active ? Math.max(0, 0.75 - age * 0.38) : 0;
  });

  return (
    <mesh ref={ring} position={[0, 1.5, -8]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.5, 0.015, 10, 128]} />
      <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function HudStatus({ selected, dataStatus, accent }) {
  return (
    <group position={[-6.7, 5.2, -9.5]} rotation={[0.12, 0.2, 0]}>
      <Text fontSize={0.18} anchorX="left" color={accent}>
        {selected?.symbol || "NIFTY"} / {dataStatus?.quoteLabel || "DATA"}
      </Text>
      <mesh position={[1.9, -0.08, 0]}>
        <boxGeometry args={[3.8, 0.03, 0.03]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function PostProcessing({ quality }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef(null);

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera);
    const nextComposer = new EffectComposer(gl);
    nextComposer.addPass(renderPass);
    nextComposer.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), quality.tier === "ultra" ? 0.62 : 0.42, 0.55, 0.18));
    if (quality.tier === "ultra") {
      const rgb = new ShaderPass(RGBShiftShader);
      rgb.uniforms.amount.value = 0.0007;
      nextComposer.addPass(rgb);
      const bokeh = new BokehPass(scene, camera, {
        focus: 12,
        aperture: 0.00008,
        maxblur: 0.004
      });
      nextComposer.addPass(bokeh);
    }
    nextComposer.setSize(size.width, size.height);
    composer.current = nextComposer;
    return () => {
      composer.current?.dispose?.();
      composer.current = null;
    };
  }, [camera, gl, quality.tier, scene, size.height, size.width]);

  useEffect(() => {
    composer.current?.setSize(size.width, size.height);
  }, [size.height, size.width]);

  useFrame((_, delta) => {
    composer.current?.render(delta);
  }, 1);

  return null;
}

function validCandles(candles = []) {
  return candles
    .map((candle) => ({
      time: Number(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close)
    }))
    .filter((candle) =>
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close) &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.low <= candle.open &&
      candle.low <= candle.close
    );
}

function deterministic(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function wrap(value, min, max) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}
