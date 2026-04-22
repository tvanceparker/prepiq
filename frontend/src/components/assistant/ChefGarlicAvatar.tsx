import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SmartToy as AssistantIcon } from '@mui/icons-material';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type ChefGarlicMotionState = 'idle' | 'thinking' | 'celebrate';

interface ChefGarlicAvatarProps {
  motionState?: ChefGarlicMotionState;
  waveToken?: number;
}

interface ChefGarlicModelProps {
  motionState: ChefGarlicMotionState;
  waveToken: number;
  onReady: () => void;
}

const WAVE_DURATION_MS = 1400;

function ChefGarlicModel({ motionState, waveToken, onReady }: ChefGarlicModelProps): JSX.Element {
  const rootRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/chef_garlic.glb') as { scene: THREE.Group };
  const model = useMemo(() => scene.clone(), [scene]);
  const waveUntilRef = useRef(0);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    waveUntilRef.current = performance.now() + WAVE_DURATION_MS;
  }, [waveToken]);

  useFrame(state => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const isWaving = performance.now() < waveUntilRef.current;
    const idleLift = Math.sin(elapsed * 1.8) * 0.08;
    const idleTilt = Math.sin(elapsed * 1.2) * 0.06;
    const thinkingPulse = motionState === 'thinking' ? Math.sin(elapsed * 4.5) * 0.05 : 0;
    const celebrateKick = motionState === 'celebrate' ? Math.sin(elapsed * 8.5) * 0.14 : 0;
    const waveSwing = isWaving ? Math.sin(elapsed * 11) * 0.55 : 0;

    const targetY = -0.12 + idleLift + (motionState === 'thinking' ? 0.05 : 0);
    const targetRotX = -0.2 + idleTilt * 0.35 - thinkingPulse * 0.25;
    const targetRotY = 0.4 + Math.sin(elapsed * 0.9) * 0.16 + celebrateKick * 0.35;
    const targetRotZ = idleTilt * 0.25 + waveSwing + celebrateKick;

    root.position.y = THREE.MathUtils.lerp(root.position.y, targetY, 0.1);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetRotX, 0.12);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetRotY, 0.12);
    root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, targetRotZ, 0.15);
  });

  return (
    <group ref={rootRef} scale={2.05}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload('/chef_garlic.glb');

export default function ChefGarlicAvatar({
  motionState = 'idle',
  waveToken = 0,
}: ChefGarlicAvatarProps): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [localWaveToken, setLocalWaveToken] = useState(1);

  const statusLabel =
    motionState === 'thinking'
      ? 'Thinking'
      : motionState === 'celebrate'
        ? 'Serving ideas'
        : 'Tap to wave';

  return (
    <Box
      onClick={() => setLocalWaveToken(current => current + 1)}
      sx={{
        width: 88,
        height: 88,
        borderRadius: '22px',
        background:
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.96), rgba(250,238,205,0.88) 42%, rgba(222,183,106,0.86) 100%)',
        border: '1px solid rgba(129, 94, 32, 0.18)',
        boxShadow:
          motionState === 'thinking'
            ? '0 16px 34px rgba(78, 55, 16, 0.24)'
            : '0 12px 30px rgba(78, 55, 16, 0.18)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        transition: 'box-shadow 180ms ease, transform 180ms ease',
        '@keyframes chefGarlicCardFloat': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        animation: 'chefGarlicCardFloat 3s ease-in-out infinite',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 18px 36px rgba(78, 55, 16, 0.24)',
        },
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 28 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <directionalLight position={[-3, 2, 4]} intensity={1.1} color="#fff1ce" />
        <Suspense fallback={null}>
          <ChefGarlicModel
            motionState={motionState}
            waveToken={waveToken + localWaveToken}
            onReady={() => setIsReady(true)}
          />
        </Suspense>
      </Canvas>

      {!isReady && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 0.25,
            color: '#5f4415',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0))',
          }}
        >
          <AssistantIcon sx={{ fontSize: 34 }} />
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
            CHEF GARLIC
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          left: 7,
          right: 7,
          bottom: 7,
          borderRadius: 999,
          px: 0.75,
          py: 0.25,
          bgcolor: 'rgba(70, 46, 10, 0.68)',
          backdropFilter: 'blur(6px)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#fff5de', letterSpacing: 0.25 }}>
          {statusLabel}
        </Typography>
      </Box>
    </Box>
  );
}
