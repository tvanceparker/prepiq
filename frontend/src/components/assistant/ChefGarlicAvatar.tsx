import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SmartToy as AssistantIcon } from '@mui/icons-material';

const MODEL_VIEWER_SCRIPT_ID = 'chef-garlic-model-viewer';

export default function ChefGarlicAvatar(): JSX.Element {
  const [viewerReady, setViewerReady] = useState<boolean>(() =>
    Boolean(window.customElements?.get('model-viewer'))
  );

  useEffect(() => {
    if (window.customElements?.get('model-viewer')) {
      setViewerReady(true);
      return;
    }

    const existing = document.getElementById(MODEL_VIEWER_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onLoad = (): void => setViewerReady(true);
      existing.addEventListener('load', onLoad);
      return () => existing.removeEventListener('load', onLoad);
    }

    const script = document.createElement('script');
    script.id = MODEL_VIEWER_SCRIPT_ID;
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.onload = () => setViewerReady(true);
    document.head.appendChild(script);
    return () => (script.onload = null);
  }, []);

  return (
    <Box
      sx={{
        width: 88,
        height: 88,
        borderRadius: '22px',
        background:
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.95), rgba(244,232,201,0.8) 45%, rgba(218,180,105,0.78) 100%)',
        border: '1px solid rgba(129, 94, 32, 0.16)',
        boxShadow: '0 12px 30px rgba(78, 55, 16, 0.18)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        '@keyframes chefGarlicFloat': {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-5px) rotate(2deg)' },
        },
        animation: 'chefGarlicFloat 2.8s ease-in-out infinite',
      }}
    >
      {viewerReady ? (
        React.createElement('model-viewer', {
          src: '/chef_garlic.glb',
          alt: 'Chef Garlic assistant avatar',
          autoplay: true,
          'camera-controls': false,
          'disable-zoom': true,
          'interaction-prompt': 'none',
          'shadow-intensity': '0.9',
          exposure: '1.1',
          style: {
            width: '100%',
            height: '100%',
            '--poster-color': 'transparent',
          } as React.CSSProperties,
        })
      ) : (
        <Box sx={{ textAlign: 'center', color: '#5f4415' }}>
          <AssistantIcon sx={{ fontSize: 36 }} />
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
            CHEF GARLIC
          </Typography>
        </Box>
      )}
    </Box>
  );
}
