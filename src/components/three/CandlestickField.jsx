import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const CANDLE_COUNT = 80;
const UP_COLOR = new THREE.Color("#00ff88");
const DOWN_COLOR = new THREE.Color("#ff4444");

function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function randomBetween(seed, min, max) {
  return min + seededRandom(seed) * (max - min);
}

export default function CandlestickField({ scrollProgress = 0 }) {
  const groupRef = useRef(null);
  const instancedMeshRef = useRef(null);
  const driftRef = useRef({ x: 0, y: 0 });

  const instancedMesh = useMemo(() => {
    const boxGeometry = new THREE.BoxGeometry(0.08, 1, 0.08);
    const meshMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.32,
      metalness: 0.18,
      emissive: "#111111",
      emissiveIntensity: 0.28,
    });

    const mesh = new THREE.InstancedMesh(boxGeometry, meshMaterial, CANDLE_COUNT);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let index = 0; index < CANDLE_COUNT; index += 1) {
      const height = randomBetween(index + 11, 0.2, 1.2);
      const x = randomBetween(index + 101, -15, 15);
      const y = randomBetween(index + 211, -8, 8);
      const z = randomBetween(index + 307, -20, 2);
      const isUp = seededRandom(index + 401) < 0.6;

      position.set(x, y, z);
      quaternion.identity();
      scale.set(1, height, 1);
      matrix.compose(position, quaternion, scale);

      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, isUp ? UP_COLOR : DOWN_COLOR);
    }

    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    mesh.frustumCulled = false;

    return mesh;
  }, []);

  useEffect(() => {
    return () => {
      instancedMesh.geometry.dispose();
      instancedMesh.material.dispose();
    };
  }, [instancedMesh]);

  useFrame(() => {
    const group = groupRef.current;
    const mesh = instancedMeshRef.current;

    if (!group || !mesh) {
      return;
    }

    const progress = Math.min(Math.max(scrollProgress, 0), 1);

    driftRef.current.x += 0.001;
    driftRef.current.y += 0.002;

    group.rotation.x = driftRef.current.x;
    group.rotation.y = progress * Math.PI * 0.3 + driftRef.current.y;
    group.position.z = progress * -5;

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <primitive ref={instancedMeshRef} object={instancedMesh} />
    </group>
  );
}
