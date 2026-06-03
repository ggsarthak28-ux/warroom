import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 500;
const CYLINDER_RADIUS = 8;
const CYLINDER_HALF_HEIGHT = 10;
const BASE_SPEED = 0.02;

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export default function ParticleStream({ scrollProgress = 0 }) {
  const pointsRef = useRef(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const angle = seededRandom(index + 17) * Math.PI * 2;
      const radius = Math.sqrt(seededRandom(index + 113)) * CYLINDER_RADIUS;
      const y = seededRandom(index + 251) * CYLINDER_HALF_HEIGHT * 2 - CYLINDER_HALF_HEIGHT;

      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      color: "#ffd700",
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    return {
      geometry: bufferGeometry,
      material: pointsMaterial,
    };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    const points = pointsRef.current;

    if (!points) {
      return;
    }

    const positionAttribute = points.geometry.attributes.position;
    const positions = positionAttribute.array;
    const speed = BASE_SPEED * (1 + clamp01(scrollProgress) * 2);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const yIndex = index * 3 + 1;
      positions[yIndex] -= speed;

      if (positions[yIndex] < -CYLINDER_HALF_HEIGHT) {
        positions[yIndex] = CYLINDER_HALF_HEIGHT;
      }
    }

    positionAttribute.needsUpdate = true;
  });

  return <points ref={pointsRef} args={[geometry, material]} frustumCulled={false} />;
}
