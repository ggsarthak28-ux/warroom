import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

const ROSE = "#ff8fab";
const GOLD = "#f0b56b";
const VIOLET = "#b794ff";
const CITY_POINTS = [
  { name: "Mumbai", lat: 19.076, lon: 72.8777, tone: ROSE },
  { name: "New York", lat: 40.7128, lon: -74.006, tone: GOLD },
  { name: "London", lat: 51.5072, lon: -0.1276, tone: "#fff0b8" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, tone: VIOLET }
];

export function FinancialGlobe3D({ selected, marketStatus, shockwaveEventId = 0 }) {
  return (
    <div className="globe3d-wrap">
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0.35, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <GlobeScene selected={selected} marketStatus={marketStatus} shockwaveEventId={shockwaveEventId} />
      </Canvas>
      <div className="globe3d-caption">
        <span>Drag globe</span>
        <span>Market flow map</span>
      </div>
    </div>
  );
}

function GlobeScene({ selected, marketStatus, shockwaveEventId }) {
  const globe = useRef(null);
  const pulse = useRef(null);
  const shock = useRef({ id: 0, startedAt: -100 });
  const open = (marketStatus?.session?.phase || marketStatus?.phase) === "open";
  const accent = Number(selected?.changePercent || 0) >= 0 ? ROSE : "#ff5267";

  const arcs = useMemo(() => {
    const pairs = [
      ["Mumbai", "London"],
      ["London", "New York"],
      ["Tokyo", "Mumbai"],
      ["New York", "Tokyo"]
    ];
    const byName = new Map(CITY_POINTS.map((city) => [city.name, city]));
    return pairs.map(([from, to]) => curveBetween(byName.get(from), byName.get(to)));
  }, []);

  useFrame(({ clock }) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const t = clock.getElapsedTime();
    if (shockwaveEventId !== shock.current.id) shock.current = { id: shockwaveEventId, startedAt: t };
    const age = t - shock.current.startedAt;
    const shockPower = age >= 0 && age < 1.8 ? 1 - age / 1.8 : 0;
    if (globe.current) {
      globe.current.rotation.y += 0.0028 + shockPower * 0.02;
      globe.current.rotation.x = Math.sin(t * 0.22) * 0.045;
    }
    if (pulse.current) {
      pulse.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.035 + shockPower * 0.18);
      pulse.current.material.opacity = 0.18 + shockPower * 0.25;
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} color="#fff2ce" />
      <pointLight position={[-3, 1.5, 2]} intensity={20} color={accent} distance={9} />
      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[1.85, 96, 48]} />
          <meshStandardMaterial color="#f2d8df" emissive="#f0cbd5" emissiveIntensity={0.12} metalness={0.18} roughness={0.45} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.875, 48, 24]} />
          <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.18} />
        </mesh>
        <mesh ref={pulse}>
          <sphereGeometry args={[1.98, 48, 24]} />
          <meshBasicMaterial color={open ? accent : "#8b6f7b"} transparent opacity={0.18} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
        </mesh>
        {CITY_POINTS.map((city) => (
          <CityHotspot key={city.name} city={city} />
        ))}
        {arcs.map((points, index) => (
          <Line key={index} points={points} color={index % 2 ? GOLD : accent} lineWidth={1.2} transparent opacity={0.7} />
        ))}
      </group>
      <Text position={[0, -2.55, 0]} fontSize={0.22} anchorX="center" color={accent}>
        {selected?.symbol || "NIFTY"} GLOBAL FLOW
      </Text>
      <OrbitControls enableDamping enablePan={false} minDistance={4.2} maxDistance={8} />
    </>
  );
}

function CityHotspot({ city }) {
  const ref = useRef(null);
  const position = latLonToVector(city.lat, city.lon, 1.93);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const scale = 1 + Math.sin(clock.getElapsedTime() * 2.2 + city.lat) * 0.28;
    ref.current.scale.setScalar(scale);
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial color={city.tone} />
      </mesh>
      <Text position={[0, 0.16, 0]} fontSize={0.105} anchorX="center" color="#fff0dc">
        {city.name}
      </Text>
    </group>
  );
}

function curveBetween(from, to) {
  const start = latLonToVector(from.lat, from.lon, 1.98);
  const end = latLonToVector(to.lat, to.lon, 1.98);
  const mid = start.clone().add(end).normalize().multiplyScalar(2.65);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  return curve.getPoints(38);
}

function latLonToVector(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
