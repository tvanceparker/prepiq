// src/components/TierGatedRoute.tsx
import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Box, Typography, Paper, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

interface TierGatedRouteProps {
  requiredTiers: string[];
}

export default function TierGatedRoute({ requiredTiers }: TierGatedRouteProps): JSX.Element {
  const { user, tier, loading } = useContext(AuthContext) as any;

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's tier is in the required tiers list
  const hasAccess = tier && requiredTiers.map(t => t.toLowerCase()).includes(tier.toLowerCase());

  if (!hasAccess) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
          p: 3,
        }}
      >
        <Paper
          sx={{
            p: 6,
            maxWidth: 500,
            textAlign: 'center',
            boxShadow: 3,
          }}
        >
          <LockIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Upgrade Required
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            This feature is only available for <strong>{requiredTiers.join(' and ')}</strong> tier
            subscribers.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your current tier: <strong>{tier || 'Basic'}</strong>
          </Typography>
          <Button variant="contained" color="primary" sx={{ mt: 2 }} href="/admin/tenant">
            Upgrade Subscription
          </Button>
        </Paper>
      </Box>
    );
  }

  return <Outlet />;
}
