import React, { useState, useEffect, useCallback } from 'react';
import {
  Snackbar,
  Box,
  Alert,
  Grid,
  Typography,
  Paper,
  Stack,
  LinearProgress,
  CircularProgress,
  Divider,
  Card,
  CardHeader,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BarChartIcon from '@mui/icons-material/BarChart';

import { downloadSalesTemplate } from '../../../api/dashboard';
import SalesUploadModal from './SalesUploadModal';
import { useUploadSalesData } from '../hooks/useUploadSalesData';
import DateSelector from '../../../components/DateSelector';
import HintBox from '../../../components/HintBox';
import Button from '../../../components/Button';
import { PageHeader } from '../../../components/PageHeader';
import type { DailyOverviewDTO } from '../../../interfaces/dashboardInterfaceFrontend';

type SummaryCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
};

const SummaryCard: React.FC<SummaryCardProps> = ({ title, subtitle, children, color, icon }) => {
  const theme = useTheme();
  return (
    <Card elevation={4} sx={{ minHeight: 160, borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={
          icon &&
          React.cloneElement(icon as any, {
            sx: {
              color: color || theme.palette.text.primary,
              width: 40,
              height: 40,
            },
          })
        }
        title={
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', marginBottom: 0 }} noWrap>
            {title}
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', marginBottom: 0 }} noWrap>
            {subtitle}
          </Typography>
        }
        sx={{ pb: 0, pt: 2, pl: 2, pr: 2 }}
      />

      <CardContent sx={{ flexGrow: 1, pt: 1, minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography variant="h3" fontWeight="bold" sx={{ color: color || theme.palette.text.primary }} noWrap>
          {children}
        </Typography>

        {title === 'Accuracy Yesterday' && (
          <Paper variant="outlined" sx={{ mt: 2, p: 1, borderRadius: 1, backgroundColor: 'inherit', height: 20 }}>
            <LinearProgress variant="determinate" value={children as any} sx={{ height: 10, borderRadius: 5, backgroundColor: theme.palette.grey[300], '& .MuiLinearProgress-bar': { backgroundColor: color || theme.palette.primary.main } }} />
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default function BasicOverview({ data }: { data: DailyOverviewDTO | null }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { upload, uploading, error, result } = useUploadSalesData();

  const getTodayDateString = () => new Date().toISOString().slice(0, 10);
  const [templateDate, setTemplateDate] = useState(getTodayDateString());

  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: `Upload failed: ${error.message}`, severity: 'error' });
    } else if (result) {
      setSnackbar({ open: true, message: 'Upload successful!', severity: 'success' });
    }
  }, [error, result]);

  const closeSnackbar = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);

  const handleDownloadTemplate = useCallback(() => {
    downloadSalesTemplate(templateDate)
      .then(({ blob: fileBlob, filename: respFilename }: any) => {
        const url = window.URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = url;
        const fallbackName = `sale_template_${templateDate}.xlsx`;
        link.download = respFilename || fallbackName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSnackbar({ open: true, message: 'Template downloaded successfully', severity: 'success' });
      })
      .catch((err: any) => {
        setSnackbar({ open: true, message: `Error downloading template: ${err.message}`, severity: 'error' });
      });
  }, [templateDate]);

  const getAccuracyColor = (percent: number) => {
    if (percent >= 90) return theme.palette.success.main;
    if (percent >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  if (!data) return null;

  const { forecasted_sales_today, top_5_items_today = [], accuracy_yesterday } = data;
  const maxQuantity = Math.max(...(top_5_items_today.map((item) => item.forecasted_quantity) || []), 1);

  return (
    <>
      <Paper sx={{ maxWidth: 1200, mt: 4, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 8 } }}>
        <PageHeader title="📊 Daily Overview" />

        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <SummaryCard title="Forecasted Menu Items" subtitle="Today" icon={<BarChartIcon />}>{forecasted_sales_today?.forecasted_quantity ?? 0}</SummaryCard>
          </Grid>

          <Grid item xs={12} sm={4}>
            <SummaryCard title="Forecasted Revenue" subtitle="Today" icon={<DownloadIcon />} color={theme.palette.primary.main}>
              ${forecasted_sales_today?.forecasted_revenue?.toFixed(2) ?? '0.00'}
            </SummaryCard>
          </Grid>

          <Grid item xs={12} sm={4}>
            <SummaryCard title="Accuracy Yesterday" subtitle={accuracy_yesterday?.note || 'No additional notes'} color={getAccuracyColor(accuracy_yesterday?.accuracy_percent ?? 0)} icon={<UploadFileIcon />}>
              {(accuracy_yesterday?.accuracy_percent ?? 0).toFixed(2)}
            </SummaryCard>
          </Grid>
        </Grid>

        <Paper elevation={3} sx={{ position: 'static', top: 80, zIndex: 1200, backgroundColor: theme.palette.background.paper, py: 2, px: isMobile ? 2 : 4, mb: 5, borderRadius: 2, boxShadow: theme.shadows[4] }}>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="center" alignItems="center">
            <DateSelector label="Select date for sales template" startDate={new Date(templateDate)} onStartDateChange={(date: Date) => setTemplateDate(date.toISOString().slice(0, 10))} mode="single" disableFuture />

            <Stack direction="row" spacing={2}>
              <Button variant="file" onClick={handleDownloadTemplate} startIcon={<DownloadIcon />}>Download Template</Button>
              <Button variant="file" onClick={() => setUploadModalOpen(true)} requiredPermission="upload_sales" disabled={uploading} startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}>{uploading ? 'Uploading...' : 'Upload Sales Data'}</Button>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" mt={1} align="center">Select the date to download the corresponding sales template. After filling it out, upload your sales data here.</Typography>
        </Paper>

        <Typography variant="h6" fontWeight="medium" mb={2} sx={{ textAlign: 'center' }}>🔝 Top {top_5_items_today?.length || 0} Forecasted Menu Items (Today)</Typography>

        <Grid container spacing={2}>
          {top_5_items_today?.map(({ menu_item_id, name, forecasted_quantity }) => {
            const percent = (forecasted_quantity / maxQuantity) * 100;
            return (
              <Grid item xs={12} sm={6} md={4} key={menu_item_id}>
                <Card elevation={4} sx={{ borderRadius: 2, minHeight: 140, display: 'flex', flexDirection: 'column' }}>
                  <CardHeader title={<Typography variant="subtitle1" fontWeight={600} noWrap>{name}</Typography>} subheader={<Typography variant="caption" color="text.secondary" noWrap>Forecasted Menu Item</Typography>} sx={{ pb: 0 }} />
                  <CardContent sx={{ pt: 1, flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary" mb={1}>Forecasted Quantity: <Box component="span" fontWeight="medium" color="text.primary">{forecasted_quantity}</Box></Typography>
                    <LinearProgress variant="determinate" value={percent} sx={{ height: 10, borderRadius: 5, backgroundColor: theme.palette.grey[300], '& .MuiLinearProgress-bar': { backgroundColor: theme.palette.primary.main } }} />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <SalesUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUpload={upload} />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
