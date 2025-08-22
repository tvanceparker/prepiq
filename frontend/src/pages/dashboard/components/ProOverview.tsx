import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { DailyOverviewDTO } from '../../../interfaces/dashboardInterfaceFrontend';

interface Props {
  data?: DailyOverviewDTO | null;
}

export default function ProOverview({ data = null }: Props) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Pro Overview</Typography>
      <Typography variant="body2">This area contains advanced metrics.</Typography>
      {data && <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>}
    </Paper>
  );
}
