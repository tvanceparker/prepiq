import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Schedule,
  AttachMoney,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getTeamInsights, TeamInsightsData } from '../../api/team';
import * as ReactChartJs2 from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

const { Bar, Pie } = ReactChartJs2 as any;

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const TeamInsights: React.FC = () => {
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: insightsResponse, isLoading } = useQuery({
    queryKey: ['team-insights', startDate, endDate],
    queryFn: () => getTeamInsights({ start_date: startDate, end_date: endDate }),
  });

  const insights: TeamInsightsData | undefined = insightsResponse?.data;

  // Prepare chart data
  const hoursChartData = insights
    ? {
        labels: Object.keys(insights.hours_by_day).sort(),
        datasets: [
          {
            label: 'Hours Worked',
            data: Object.keys(insights.hours_by_day)
              .sort()
              .map(date => insights.hours_by_day[date]),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      }
    : null;

  const shiftsTypeData = insights
    ? {
        labels: Object.keys(insights.shifts_by_type).map(type =>
          type.replace('_', ' ').toUpperCase()
        ),
        datasets: [
          {
            label: 'Shifts by Type',
            data: Object.values(insights.shifts_by_type),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
            ],
            borderWidth: 1,
          },
        ],
      }
    : null;

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          Team Insights & Analytics
        </Typography>

        {/* Date Range Selector */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setStartDate(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
              setEndDate(dayjs().format('YYYY-MM-DD'));
            }}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setStartDate(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
              setEndDate(dayjs().format('YYYY-MM-DD'));
            }}
          >
            Last 30 Days
          </Button>
        </Box>

        {isLoading && <LinearProgress />}

        {!isLoading && insights && (
          <>
            {/* Overview Metrics */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Employees"
                  value={insights.active_employees}
                  subtitle={`${insights.total_employees} total`}
                  icon={<People />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Hours"
                  value={insights.total_hours_worked.toFixed(1)}
                  subtitle={`${insights.avg_hours_per_employee.toFixed(1)} avg per employee`}
                  icon={<Schedule />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Labor Cost"
                  value={`$${insights.total_labor_cost.toFixed(2)}`}
                  subtitle={`$${insights.avg_cost_per_hour.toFixed(2)}/hr avg`}
                  icon={<AttachMoney />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="On-Time Rate"
                  value={`${insights.on_time_rate.toFixed(1)}%`}
                  subtitle={`${insights.late_clock_ins} late clock-ins`}
                  icon={<CheckCircle />}
                  color={insights.on_time_rate >= 90 ? 'success' : 'warning'}
                />
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Hours Worked by Day
                  </Typography>
                  {hoursChartData && <Bar data={hoursChartData} options={{ responsive: true }} />}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Shifts by Type
                  </Typography>
                  {shiftsTypeData && (
                    <Pie
                      data={shiftsTypeData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Top Performers Table */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Top Performers
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell align="right">Hours Worked</TableCell>
                      <TableCell align="right">Shifts</TableCell>
                      <TableCell align="right">Avg Shift Duration</TableCell>
                      <TableCell align="right">On-Time Rate</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {insights.top_performers.map(performer => (
                      <TableRow key={performer.employee_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {performer.employee_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Role: {performer.role}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {performer.total_hours.toFixed(1)}h
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{performer.total_shifts}</TableCell>
                        <TableCell align="right">
                          {performer.avg_shift_duration.toFixed(1)}h
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {performer.on_time_percentage.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={performer.on_time_percentage}
                              sx={{ width: 50, height: 6, borderRadius: 1 }}
                              color={performer.on_time_percentage >= 90 ? 'success' : 'warning'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {performer.on_time_percentage >= 95 ? (
                            <Chip
                              label="Excellent"
                              size="small"
                              color="success"
                              icon={<TrendingUp />}
                            />
                          ) : performer.on_time_percentage >= 85 ? (
                            <Chip label="Good" size="small" color="primary" />
                          ) : (
                            <Chip
                              label="Needs Improvement"
                              size="small"
                              color="warning"
                              icon={<Warning />}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {!isLoading && !insights && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No data available for the selected date range.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TeamInsights;
