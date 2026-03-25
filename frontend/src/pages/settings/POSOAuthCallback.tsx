import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeStoredPOSOAuth } from './hooks/useIntegrationSettings';

export default function POSOAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finishing your POS connection...');

  useEffect(() => {
    let isMounted = true;

    const completeConnection = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        if (!isMounted) return;
        setStatus('error');
        setMessage('POS connection was cancelled or rejected.');
        return;
      }

      if (!code || !state) {
        if (!isMounted) return;
        setStatus('error');
        setMessage('Missing POS callback data. Start the connection again.');
        return;
      }

      try {
        await completeStoredPOSOAuth(code, state);
        if (!isMounted) return;
        setStatus('success');
        setMessage('Square is connected. Redirecting back to Integration Settings...');
        window.setTimeout(() => navigate('/settings/integrations', { replace: true }), 1200);
      } catch (callbackError) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(
          callbackError instanceof Error
            ? callbackError.message
            : 'POS connection failed. Start the connection again.'
        );
      }
    };

    void completeConnection();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams]);

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Square Connection
          </Typography>

          {status === 'loading' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>{message}</Typography>
            </Box>
          )}

          {status === 'success' && <Alert severity="success">{message}</Alert>}

          {status === 'error' && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate('/settings/integrations', { replace: true })}
              >
                Back to Integration Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
