import React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import BasicOverview from './BasicOverview';
import ProOverview from './ProOverview';
import type { DailyOverviewDTO } from '../../../interfaces/dashboardInterfaceFrontend';

export default function MasterOverview({ data }: { data?: DailyOverviewDTO | null }): JSX.Element {
  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <BasicOverview data={data} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProOverview data={data} />
        </Grid>
      </Grid>
    </Paper>
  );
}
