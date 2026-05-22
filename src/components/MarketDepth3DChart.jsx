import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { formatINR } from "../utils/format";

const GREEN = "#18f59b";
const RED = "#ff5267";
const CYAN = "#52d8ff";

export function MarketDepth3DChart({ candles = [], selected, loading = false, shockwaveEventId = 0 }) {
  const normalized = useMemo(() => normalizeCandles(candles).slice(-56), [candles]);
  const hasCandles = normalized.length >= 8;

  if (loading) {
    return <div className="depth3d-state">Loading 3D market depth...</div>;
  }

  if (!hasCandles) {
    return (
      <div className="depth3d-state">
        <b>3D depth chart unavailable</b>
        <span>Real OHLC candle data is required. No synthetic 3D candles are drawn.</span>
      </div>
    );
  }

  return (
    <div className="depth3d-wrap">
      <Canvas
        dpr={[1, 1.35]}
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 5.4, 10.5], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <DepthChartScene candles={normalized} selected={selected} shockwaveEventId={shockwaveEventId} />
      </Canvas>
      <div className="depth3d-caption">
        <span>{selected?.exchange}:{selected?.symbol}</span>
        <span>{normalized.length} real candles</span>
        <span>No fake 3D bars</span>
      </div>
    </div>
  );
}

function DepthChartScene({ candles, selected, shockwaveEventId }) {
  const group = useRef(null);
  const shock = useRef({ id: 0, startedAt: -100 });
  const bounds = useMemo(() => priceBounds(candles), [candles]);
  const bullish = Number(selected?.changePercent || candles.at(-1).close - candles[0].close) >= 0;
  const accent = bullish ? GREEN : RED;

  useFrame(({ clock }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    if (shockwaveEventId !== shock.current.id) shock.current = { id: shockwaveEventId, startedAt: t };
    const age = t - shock.current.startedAt;
    const shockPower = age >= 0 && age < 1.8 ? 1 - age / 1.8 : 0;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.15) * 0.08;
      group.current.position.y = shockPower * Math.sin(t * 36) * 0.08;
    }
  });

  return (
    <>
      <color attach="background" args={["#030713"]} />
      <fog attach="fog" args={["#030713", 10, 28]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 7, 5]} intensity={1.8} color="#d8f7ff" castShadow />
      <pointLight position={[-4, 3, 2]} intensity={22} color={accent} distance={16} />
      <group ref={group}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <planeGeometry args={[13.8, 7.5]} />
          <meshStandardMaterial color="#06101f" metalness={0.35} roughness={0.58} />
        </mesh>
        <gridHelper args={[14, 14, "#163557", "#0d1a2c"]} position={[0, -0.06, 0]} />
        {candles.map((candle, index) => (
          <DepthCandle key={`${candle.time}-${index}`} candle={candle} index={index} count={candles.length} bounds={bounds} />
        ))}
        <PriceRail bounds={bounds} />
        <Text position={[0, 3.9, -2.9]} fontSize={0.3} anchorX="center" color={accent}>
          {selected?.symbol || "SELECTED"} 3D MARKET DEPTH
        </Text>
      </group>
      <OrbitControls enableDamping enablePan={false} minDistance={7.5} maxDistance={14} maxPolarAngle={Math.PI / 2.1} />
    </>
  );
}

function DepthCandle({ candle, index, count, bounds }) {
  const body = useRef(null);
  const wick = useRef(null);
  const up = candle.close >= candle.open;
  const color = up ? GREEN : RED;
  const x = -6 + (index / Math.max(count - 1, 1)) * 12;
  const openY = mapPrice(candle.open, bounds);
  const closeY = mapPrice(candle.close, bounds);
  const highY = mapPrice(candle.high, bounds);
  const lowY = mapPrice(candle.low, bounds);
  const bodyHeight = Math.max(Math.abs(closeY - openY), 0.035);
  const bodyY = (openY + closeY) / 2;
  const wickHeight = Math.max(highY - lowY, 0.04);

  useFrame(({ clock }) => {
    if (!body.current || !wick.current) return;
    const t = clock.getElapsedTime();
    const lift = 1 - Math.exp(-Math.max(0, t - index * 0.015) * 4);
    body.current.scale.y = lift;
    wick.current.scale.y = lift;
    body.current.material.emissiveIntensity = 0.18 + Math.sin(t * 2.4 + index) * 0.05;
  });

  return (
    <group position={[x, 0, Math.sin(index * 0.38) * 0.18]}>
      <mesh ref={wick} position={[0, (highY + lowY) / 2, 0]} castShadow>
        <boxGeometry args={[0.035, wickHeight, 0.035]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={body} position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.14, bodyHeight, 0.34]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.25} roughness={0.28} />
      </mesh>
    </group>
  );
}

function PriceRail({ bounds }) {
  const labels = [bounds.min, bounds.min + bounds.range / 2, bounds.max];
  return (
    <group position={[6.6, 0, -3.3]}>
      {labels.map((price, index) => (
        <group key={price} position={[0, mapPrice(price, bounds), 0]}>
          <mesh>
            <boxGeometry args={[0.7, 0.012, 0.012]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.44} />
          </mesh>
          <Text position={[0.55, 0, 0]} fontSize={0.13} anchorX="left" color="#9fb8d7">
            {formatINR(price, 0)}
          </Text>
        </group>
      ))}
    </group>
  );
}

function normalizeCandles(candles) {
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
      candle.open > 0 &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.high >= candle.low &&
      candle.low <= candle.open &&
      candle.low <= candle.close
    );
}

function priceBounds(candles) {
  const lows = candles.map((candle) => candle.low);
  const highs = candles.map((candle) => candle.high);
  const minRaw = Math.min(...lows);
  const maxRaw = Math.max(...highs);
  const rangeRaw = Math.max(maxRaw - minRaw, maxRaw * 0.002, 1);
  const min = minRaw - rangeRaw * 0.12;
  const max = maxRaw + rangeRaw * 0.12;
  return { min, max, range: max - min };
}

function mapPrice(price, bounds) {
  return ((price - bounds.min) / bounds.range) * 4.8 + 0.18;
}
