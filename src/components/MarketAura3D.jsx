import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const ROSE = "#ff8fab";
const GOLD = "#f0b56b";
const VIOLET = "#b794ff";
const RED = "#ff5267";

export function MarketAura3D({ selected }) {
  const positive = Number(selected?.changePercent || 0) >= 0;
  const accent = positive ? ROSE : RED;
  const labels = useMemo(() => [selected?.symbol || "NIFTY", "SCAN", "RISK", "PLAN"], [selected?.symbol]);

  return (
    <div className="aura3d-wrap" aria-label="Animated market decision halo">
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0.35, 5.8], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <AuraScene accent={accent} labels={labels} />
      </Canvas>
      <div className="aura-caption">
        <span>Decision halo</span>
        <b>Scan. Risk. Plan.</b>
      </div>
    </div>
  );
}

function AuraScene({ accent, labels }) {
  const group = useRef(null);
  const core = useRef(null);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.28 + pointer.x * 0.18;
      group.current.rotation.x = Math.sin(t * 0.42) * 0.14 + pointer.y * 0.1;
      group.current.position.y = Math.sin(t * 0.9) * 0.08;
    }
    if (core.current) {
      core.current.rotation.x = t * 0.7;
      core.current.rotation.y = t * 0.55;
      core.current.material.emissiveIntensity = 0.65 + Math.sin(t * 2.2) * 0.18;
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <pointLight position={[2.4, 2.2, 3]} intensity={14} color={GOLD} distance={9} />
      <pointLight position={[-2, -1.2, 2.2]} intensity={11} color={VIOLET} distance={8} />
      <group ref={group}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} rotation={[Math.PI / 2 + index * 0.52, index * 0.3, index * 0.24]}>
            <torusGeometry args={[1.08 + index * 0.2, 0.012, 10, 128]} />
            <meshBasicMaterial
              color={[accent, GOLD, VIOLET, "#ffd0dc"][index]}
              transparent
              opacity={0.42 - index * 0.055}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
        <mesh ref={core}>
          <dodecahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.7}
            metalness={0.42}
            roughness={0.18}
            transparent
            opacity={0.82}
          />
        </mesh>
        {labels.map((label, index) => {
          const angle = (index / labels.length) * Math.PI * 2;
          return (
            <Text
              key={`${label}-${index}`}
              position={[Math.cos(angle) * 1.75, Math.sin(index * 0.8) * 0.32, Math.sin(angle) * 1.75]}
              rotation={[0, -angle + Math.PI / 2, 0]}
              fontSize={index === 0 ? 0.22 : 0.15}
              anchorX="center"
              anchorY="middle"
              color={index === 0 ? GOLD : "#fff0dc"}
            >
              {label}
            </Text>
          );
        })}
      </group>
    </>
  );
}
