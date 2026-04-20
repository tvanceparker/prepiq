import React, { useState, useEffect, useCallback } from 'react';
import type { AlertColor } from '@mui/material';
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
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';

import { downloadSalesTemplate } from '../../../api/dashboard';
import SalesUploadModal from './SalesUploadModal';
import { useUploadSalesData } from '../hooks/useUploadSalesData';
import DateSelector from '../../../components/DateSelector';
import HintBox from '../../../components/HintBox';
import Button from '../../../components/Button';
import { PageHeader } from '../../../components/PageHeader';

const SummaryCard = ({ title, subtitle, children, color, icon }) => {
  const theme = useTheme();
  return (
    <Card
      elevation={4}
      sx={{
        minHeight: 160, // Make sure all cards have the same min height
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardHeader
        avatar={
          icon &&
          React.cloneElement(icon, {
            sx: {
              color: color || theme.palette.text.primary,
              width: 40, // Adjust icon size
              height: 40, // Adjust icon size
            },
          })
        }
        title={
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ fontSize: '1.2rem', marginBottom: 0 }}
            noWrap
          >
            {title}
          </Typography>
        }
        subheader={
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.875rem', marginBottom: 0 }}
            noWrap
          >
            {subtitle}
          </Typography>
        }
        sx={{
          pb: 0, // No bottom padding
          pt: 2, // Padding top
          pl: 2, // Padding left
          pr: 2, // Padding right
        }}
      />

      <CardContent
        sx={{
          flexGrow: 1,
          pt: 1,
          minHeight: 120, // Fixed min height to align all content consistently
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between', // This ensures consistent alignment of text and bar
        }}
      >
        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{ color: color || theme.palette.text.primary }}
          noWrap
        >
          {children}
        </Typography>

        {/* Display LinearProgress only for Accuracy */}
        {title === 'Accuracy Yesterday' && (
          <Paper
            variant="outlined"
            sx={{
              mt: 2,
              p: 1,
              borderRadius: 1,
              backgroundColor: 'inherit',
              height: 20, // Prevent the progress bar from adding extra heighta
            }}
          >
            <LinearProgress
              variant="determinate"
              value={children}
              sx={{
                height: 10, // Bar height itself
                borderRadius: 5,
                backgroundColor: theme.palette.grey[300],
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color || theme.palette.primary.main,
                },
              }}
            />
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default function BasicOverview({ data }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { upload, uploading, error, result, reset } = useUploadSalesData();

  const getTodayDateString = () => new Date().toISOString().slice(0, 10);
  const [templateDate, setTemplateDate] = useState(getTodayDateString());

  useEffect(() => {
    if (error) {
      if (error.message.includes('409')) {
        return;
      }

      setSnackbar({
        open: true,
        message: `Upload failed: ${error.message}`,
        severity: 'error',
      });
    } else if (result) {
      const hasWarnings = (result.skipped_rows ?? 0) > 0 || (result.row_errors?.length ?? 0) > 0;
      setSnackbar({
        open: true,
        message: result.message || 'Upload successful!',
        severity: hasWarnings ? 'warning' : 'success',
      });
    }
  }, [error, result]);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    reset();
    setUploadModalOpen(true);
  }, [reset]);

  const handleCloseUploadModal = useCallback(() => {
    setUploadModalOpen(false);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    downloadSalesTemplate(templateDate)
      .then(({ blob: fileBlob, filename: respFilename }) => {
        const url = window.URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = url;
        const fallbackName = `sale_template_${templateDate}.xlsx`;
        link.download = respFilename || fallbackName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSnackbar({
          open: true,
          message: 'Template downloaded successfully',
          severity: 'success',
        });
      })
      .catch(err => {
        setSnackbar({
          open: true,
          message: `Error downloading template: ${err.message}`,
          severity: 'error',
        });
      });
  }, [templateDate]);

  const getAccuracyColor = percent => {
    if (percent >= 90) return theme.palette.success.main;
    if (percent >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  if (!data) return null;

  const { forecasted_sales_today, top_5_items_today, accuracy_yesterday } = data;
  const maxQuantity = Math.max(...top_5_items_today.map(item => item.forecasted_quantity), 1);

  return (
    <>
      <Paper
        sx={{
          maxWidth: 1200,
          mt: 4,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 8 },
        }}
      >
        <PageHeader
          eyebrow="Daily operations snapshot"
          title="Daily Overview"
          description="Track forecasted sales, yesterday's accuracy, and manual sales upload tools from one workspace."
          icon={<InsightsOutlinedIcon />}
        />

        {/* Summary Cards */}
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <SummaryCard
              title="Forecasted Menu Items"
              subtitle="Today"
              icon={<BarChartIcon />}
              color="primary"
            >
              {forecasted_sales_today?.forecasted_quantity ?? 0}
            </SummaryCard>
          </Grid>

          <Grid item xs={12} sm={4}>
            <SummaryCard
              title="Forecasted Revenue"
              subtitle="Today"
              icon={<AttachMoneyIcon />}
              color="success"
            >
              ${forecasted_sales_today?.forecasted_revenue?.toFixed(2) ?? '0.00'}
            </SummaryCard>
          </Grid>

          <Grid item xs={12} sm={4}>
            <SummaryCard
              title="Accuracy Yesterday"
              subtitle={accuracy_yesterday?.note || 'No additional notes'}
              icon={<BarChartIcon />}
              color={getAccuracyColor(accuracy_yesterday?.accuracy_percent ?? 0)}
            >
              {(accuracy_yesterday?.accuracy_percent ?? 0).toFixed(2)}%
            </SummaryCard>
          </Grid>
        </Grid>

        {/* Date Selector + Actions */}
        <Paper
          elevation={3}
          sx={{
            position: 'static',
            top: 80,
            zIndex: 1200,
            backgroundColor: theme.palette.background.paper,
            py: 2,
            px: isMobile ? 2 : 4,
            mb: 5,
            borderRadius: 2,
            boxShadow: theme.shadows[4],
          }}
        >
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <DateSelector
              label="Select date for sales template"
              startDate={new Date(templateDate)}
              onStartDateChange={date => setTemplateDate(date.toISOString().slice(0, 10))}
              mode="single"
              disableFuture
            />

            <Stack direction="row" spacing={2}>
              <Button variant="file" onClick={handleDownloadTemplate} startIcon={<DownloadIcon />}>
                Download Template
              </Button>
              <Button
                variant="file"
                onClick={handleOpenUploadModal}
                requiredPermission="upload_sales"
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
              >
                {uploading ? 'Uploading...' : 'Upload Sales Data'}
              </Button>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary" mt={1} align="center">
            Select the date to download the corresponding sales template. After filling it out,
            upload your sales data here.
          </Typography>
        </Paper>

        {/* Top Forecasted Items */}
        <Typography variant="h6" fontWeight="medium" mb={2} sx={{ textAlign: 'center' }}>
          🔝 Top {top_5_items_today?.length || 0} Forecasted Menu Items (Today)
        </Typography>

        <Grid container spacing={2}>
          {top_5_items_today?.map(({ menu_item_id, name, forecasted_quantity }) => {
            const percent = (forecasted_quantity / maxQuantity) * 100;
            return (
              <Grid item xs={12} sm={6} md={4} key={menu_item_id}>
                <Card
                  elevation={4}
                  sx={{
                    borderRadius: 2,
                    minHeight: 140,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardHeader
                    title={
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {name}
                      </Typography>
                    }
                    subheader={
                      <Typography variant="caption" color="text.secondary" noWrap>
                        Forecasted Menu Item
                      </Typography>
                    }
                    sx={{ pb: 0 }}
                  />
                  <CardContent sx={{ pt: 1, flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Forecasted Quantity:{' '}
                      <Box component="span" fontWeight="medium" color="text.primary">
                        {forecasted_quantity}
                      </Box>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: theme.palette.grey[300],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: theme.palette.primary.main,
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Divider sx={{ my: 6 }} />

        {/* Helpful Hints */}
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={6}>
            <HintBox
              title="📈 Explore sales patterns"
              link={{ href: '/sales/patterns', label: 'View Sales Patterns →' }}
            >
              Analyze daily, weekly, and monthly sales trends to improve forecasting.
            </HintBox>
          </Grid>
          <Grid item xs={12} md={6}>
            <HintBox
              title="✅ Check forecast accuracy"
              link={{
                href: '/sales/forecast-accuracy',
                label: 'View Forecast Accuracy →',
              }}
            >
              Review how your forecasts performed and track improvements over time.
            </HintBox>
          </Grid>
        </Grid>
      </Paper>

      <SalesUploadModal
        isOpen={uploadModalOpen}
        onClose={handleCloseUploadModal}
        onUpload={upload}
        onReset={reset}
        result={result}
        uploadError={error}
        uploading={uploading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
