import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

let latestScrollProgress = 0;
let latestAnimationFrame = null;

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

function updateModuleScrollProgress() {
  latestAnimationFrame = null;
  latestScrollProgress = readScrollProgress();
}

function requestModuleScrollProgressUpdate() {
  if (typeof window === "undefined" || latestAnimationFrame !== null) {
    return;
  }

  latestAnimationFrame = window.requestAnimationFrame(updateModuleScrollProgress);
}

function interpolateKeyframes(progress, keyframes, target) {
  if (progress <= keyframes[0].progress) {
    target.copy(keyframes[0].position);
    return target;
  }

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const current = keyframes[index];
    const next = keyframes[index + 1];

    if (progress <= next.progress) {
      const segmentProgress = (progress - current.progress) / (next.progress - current.progress);
      target.copy(current.position).lerp(next.position, clamp01(segmentProgress));
      return target;
    }
  }

  target.copy(keyframes[keyframes.length - 1].position);
  return target;
}

export default function ScrollCamera() {
  const { camera } = useThree();

  const keyframes = useMemo(
    () => [
      { progress: 0, position: new THREE.Vector3(0, 0, 10) },
      { progress: 0.33, position: new THREE.Vector3(3, -1, 7) },
      { progress: 0.66, position: new THREE.Vector3(-2, 2, 5) },
      { progress: 1, position: new THREE.Vector3(0, 0, 3) },
    ],
    []
  );

  const targetPosition = useMemo(() => new THREE.Vector3(0, 0, 10), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    updateModuleScrollProgress();

    window.addEventListener("scroll", requestModuleScrollProgressUpdate, { passive: true });
    window.addEventListener("resize", requestModuleScrollProgressUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestModuleScrollProgressUpdate);
      window.removeEventListener("resize", requestModuleScrollProgressUpdate);

      if (latestAnimationFrame !== null) {
        window.cancelAnimationFrame(latestAnimationFrame);
        latestAnimationFrame = null;
      }
    };
  }, []);

  useFrame(() => {
    interpolateKeyframes(latestScrollProgress, keyframes, targetPosition);
    camera.position.lerp(targetPosition, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
