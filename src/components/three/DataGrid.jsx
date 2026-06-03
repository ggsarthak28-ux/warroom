import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const GRID_SIZE = 20;
const INSTANCE_COUNT = GRID_SIZE * GRID_SIZE;
const GRID_SPACING = 0.45;
const ACTIVE_COLOR = new THREE.Color("#00ff88");
const IDLE_COLOR = new THREE.Color("#1a1a2e");

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

export default function DataGrid({ scrollProgress = 0 }) {
  const meshRef = useRef(null);
  const timeRef = useRef(0);

  const instancedMesh = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.04, 12, 8);
    const material = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const offset = ((GRID_SIZE - 1) * GRID_SPACING) / 2;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const index = row * GRID_SIZE + column;
        position.set(column * GRID_SPACING - offset, row * GRID_SPACING - offset, -8);
        quaternion.identity();
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, IDLE_COLOR);
      }
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
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    timeRef.current += 0.02;
    mesh.rotation.x = clamp01(scrollProgress) * Math.PI * 0.4;

    for (let index = 0; index < INSTANCE_COUNT; index += 1) {
      const wave = Math.sin(index * 0.5 + timeRef.current);
      mesh.setColorAt(index, wave > 0 ? ACTIVE_COLOR : IDLE_COLOR);
    }

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return <primitive ref={meshRef} object={instancedMesh} />;
}
