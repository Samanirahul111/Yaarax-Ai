import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, Center, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';

const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json';

function AnimatedBrandSequence() {
  const yRef = useRef();
  const xRef = useRef();
  const aaraRef = useRef();
  const aiRef = useRef();
  const groupRef = useRef();

  const { size } = useThree();
  const isMobile = size.width < 768;

  // We render inline now, so no need for fixed viewport offsets!
  const baseScale = isMobile ? 1.5 : 2.4;
  const offsetX = 0;
  const offsetY = 1.0; // Shift up further

  useFrame((state) => {
    // 14 second animation loop
    const time = state.clock.elapsedTime % 14;
    const lerp = THREE.MathUtils.lerp;

    // Default targets for "YX" (Closed state)
    let targetScaleYX = 1;
    let targetY_X = -0.6; // Keep Y and X close together
    let targetX_X = 0.6;
    let targetAaraScale = 0;
    let targetAiScale = 0;

    // Fade out at the very end to reset loop cleanly
    if (time < 0.5 || time > 13) {
      targetScaleYX = 0;
    }

    // Y and X move far apart to make room for AARA!
    if (time > 2 && time < 10) {
      targetY_X = -2.6;
      targetX_X = 2.6;
    }

    // AARA appears exactly between them
    if (time > 3.5 && time < 9.5) {
      targetAaraScale = 1;
    }

    // AI appears
    if (time > 5 && time < 13) {
      targetAiScale = 1;
    }

    // Apply smooth Lerps to actual properties
    if (yRef.current) {
      yRef.current.scale.setScalar(lerp(yRef.current.scale.x, targetScaleYX, 0.08));
      yRef.current.position.x = lerp(yRef.current.position.x, targetY_X, 0.06);
    }
    if (xRef.current) {
      xRef.current.scale.setScalar(lerp(xRef.current.scale.x, targetScaleYX, 0.08));
      xRef.current.position.x = lerp(xRef.current.position.x, targetX_X, 0.06);
    }
    if (aaraRef.current) {
      aaraRef.current.scale.setScalar(lerp(aaraRef.current.scale.x, targetAaraScale, 0.1));
    }
    if (aiRef.current) {
      aiRef.current.scale.setScalar(lerp(aiRef.current.scale.x, targetAiScale, 0.08));
      // AI smoothly follows the X so it stays attached when "YX" closes back together
      if (xRef.current) {
        aiRef.current.position.x = xRef.current.position.x + 1.6;
      }
    }

    // Gentle floating for the entire group
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  // Bright, clean materials (reduced metalness so colors pop more)
  const materialCyan = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FF7E67', metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.85, emissive: '#083344', emissiveIntensity: 0.4
  }), []);

  const materialViolet = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F9A826', metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0.85, emissive: '#2e1065', emissiveIntensity: 0.4
  }), []);

  return (
    // Rendered perfectly centered since it is inline now
    <group position={[offsetX, offsetY, -5]} scale={baseScale}>
      <group ref={groupRef}>

        {/* Y */}
        <group ref={yRef} position={[-0.6, 0, 0]} scale={0}>
          <Center>
            <Text3D font={FONT_URL} size={1.0} height={0.2} curveSegments={12} bevelEnabled bevelThickness={0.03} bevelSize={0.015}>
              Y
              <primitive object={materialCyan} attach="material" />
            </Text3D>
          </Center>
        </group>

        {/* AARA */}
        <group ref={aaraRef} position={[0, 0, 0]} scale={0}>
          <Center>
            <Text3D font={FONT_URL} size={1.0} height={0.2} curveSegments={12} bevelEnabled bevelThickness={0.03} bevelSize={0.015}>
              AARA
              <primitive object={materialCyan} attach="material" />
            </Text3D>
          </Center>
        </group>

        {/* X */}
        <group ref={xRef} position={[0.6, 0, 0]} scale={0}>
          <Center>
            <Text3D font={FONT_URL} size={1.0} height={0.2} curveSegments={12} bevelEnabled bevelThickness={0.03} bevelSize={0.015}>
              X
              <primitive object={materialCyan} attach="material" />
            </Text3D>
          </Center>
        </group>

        {/* AI */}
        <group ref={aiRef} position={[2.2, 0, 0]} scale={0}>
          <Center>
            <Text3D font={FONT_URL} size={1.0} height={0.2} curveSegments={12} bevelEnabled bevelThickness={0.03} bevelSize={0.015}>
              AI
              <primitive object={materialViolet} attach="material" />
            </Text3D>
          </Center>
        </group>

      </group>
    </group>
  );
}

export { AnimatedBrandSequence };

export default function Background3D() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      pointerEvents: 'none',
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
    }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <fog attach="fog" args={['#020617', 10, 25]} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#FF7E67" />

        <Environment preset="city" />
        
        <Stars radius={100} depth={50} count={1500} factor={3} saturation={0} fade speed={0.5} />
      </Canvas>
    </div>
  );
}
