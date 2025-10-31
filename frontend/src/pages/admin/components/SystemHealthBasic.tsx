import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import TableShell from '../../../components/TableShell';
import DateSelector from '../../../components/DateSelector';
import HintBox from '../../../components/HintBox';
import { useSystemHealth } from '../hooks/useSystemHealth';
import type { SystemHealthBasicProps, SystemHealthCheck } from '../../../interfaces/admin';
import { Box, Typography, Paper } from '@mui/material';

const CheckMark = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="green"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label="Checkmark"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RedX = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label="Cross"
    style={{ color: '#d32f2f' }} // MUI red[700]
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function SystemHealthBasic({ initialDate }: SystemHealthBasicProps) {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    checkDate,
    setCheckDate,
    refresh,
    runSalesCheck,
    salesCheckLoading,
    salesCheckMessage,
  } = useSystemHealth(initialDate);

  if (loading)
    return (
      <Typography variant="body1" sx={{ p: 3 }}>
        Loading system health...
      </Typography>
    );
  if (error)
    return (
      <Typography variant="body1" color="error" sx={{ p: 3 }}>
        Error loading system health: {error.message || error.toString()}
      </Typography>
    );
  if (!data)
    return (
      <Typography variant="body1" sx={{ p: 3 }}>
        No data
      </Typography>
    );

  const { overall_status, ...checks } = data as {
    overall_status: string;
    [key: string]: string | SystemHealthCheck;
  };

  const tableData = Object.entries(checks).map(([key, value]) => ({
    id: key,
    check: key.replace(/_/g, ' '),
    exists: typeof value === 'object' && 'exists' in value ? value.exists : false,
  }));

  const columns = [
    {
      key: 'check',
      label: 'Check',
      sortable: true,
    },
    {
      key: 'exists',
      label: 'Exists',
      sortable: false,
      render: (_, row) => (row.exists ? <CheckMark /> : <RedX />),
    },
  ];

  return (
    <Paper
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      <Typography variant="h5" fontWeight={600}>
        System Health Status:{' '}
        <Box
          component="span"
          sx={{
            color: overall_status === 'OK' ? 'success.main' : 'warning.main',
            fontWeight: 'bold',
          }}
        >
          {overall_status}
        </Box>
      </Typography>

      <DateSelector
        label="Select Check Date"
        mode="single"
        startDate={checkDate ? new Date(checkDate) : new Date()}
        onStartDateChange={setCheckDate}
        sx={{ maxWidth: 320 }}
      />

      <TableShell
        columns={columns}
        data={tableData}
        loading={loading}
        emptyMessage="No health checks found."
        searchable={false}
        showCheckboxes={false}
        compact={true}
        maxHeight={300}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 4 }}>
        <Button variant="default" onClick={() => refresh()} showIcon={false}>
          Refresh
        </Button>

        <Button
          variant="confirm"
          onClick={() => runSalesCheck()}
          disabled={salesCheckLoading}
          showIcon={false}
        >
          {salesCheckLoading ? 'Running Sales Check...' : 'Run Sales Data Check'}
        </Button>

        <Button variant="edit" onClick={() => navigate('/dashboard/alerts')} showIcon={false}>
          Go to Alerts
        </Button>
      </Box>

      {salesCheckMessage && (
        <Typography
          sx={{
            mt: 2,
            fontWeight: 'medium',
            color: salesCheckMessage.toLowerCase().includes('failed')
              ? 'error.main'
              : 'success.main',
          }}
        >
          {salesCheckMessage}
        </Typography>
      )}

      <HintBox
        title="Sales Data Check Instructions"
        link={{ href: '/dashboard/alerts', label: 'Go to Alerts' }}
      >
        After running <strong>Run Sales Data Check</strong>, go to alerts to see what is wrong with
        the sales data you uploaded. You can fix issues from there. Make sure you have your past
        sales history ready.
      </HintBox>
    </Paper>
  );
}
