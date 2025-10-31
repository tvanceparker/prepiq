import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Fake data
const roles = ['Waitress', 'Cook', 'Manager', 'Shift Manager'];

const attendanceData = [
  {
    week: 'Week 1',
    punctuality: 95,
    overtimeHours: 4,
    absenteeism: 2,
    avgHours: 38,
  },
  {
    week: 'Week 2',
    punctuality: 90,
    overtimeHours: 6,
    absenteeism: 1,
    avgHours: 40,
  },
  {
    week: 'Week 3',
    punctuality: 92,
    overtimeHours: 5,
    absenteeism: 3,
    avgHours: 39,
  },
  {
    week: 'Week 4',
    punctuality: 94,
    overtimeHours: 4,
    absenteeism: 0,
    avgHours: 41,
  },
];

const topPerformers = [
  {
    name: 'Alice Johnson',
    role: 'Waitress',
    hoursWorked: 42,
    punctuality: '98%',
  },
  { name: 'Bob Smith', role: 'Cook', hoursWorked: 40, punctuality: '95%' },
  { name: 'Carol Lee', role: 'Manager', hoursWorked: 44, punctuality: '99%' },
];

const lateClockIns = [
  { name: 'Dave Wilson', role: 'Cook', lateCount: 3 },
  { name: 'Emily Clark', role: 'Waitress', lateCount: 2 },
];

export default function TeamInsights() {
  const [filterRole, setFilterRole] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredTopPerformers = useMemo(() => {
    if (!filterRole) return topPerformers;
    return topPerformers.filter(p => p.role === filterRole);
  }, [filterRole]);

  const filteredLateClockIns = useMemo(() => {
    if (!filterRole) return lateClockIns;
    return lateClockIns.filter(p => p.role === filterRole);
  }, [filterRole]);

  const lineChartData = {
    labels: attendanceData.map(d => d.week),
    datasets: [
      {
        label: 'Punctuality (%)',
        data: attendanceData.map(d => d.punctuality),
        borderColor: 'rgba(53, 162, 235, 0.8)',
        backgroundColor: 'rgba(53, 162, 235, 0.4)',
        yAxisID: 'y1',
        tension: 0.3,
      },
      {
        label: 'Overtime Hours',
        data: attendanceData.map(d => d.overtimeHours),
        borderColor: 'rgba(255, 99, 132, 0.8)',
        backgroundColor: 'rgba(255, 99, 132, 0.4)',
        yAxisID: 'y2',
        tension: 0.3,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    scales: {
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Punctuality (%)',
        },
      },
      y2: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: 0,
        max: 10,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Overtime Hours',
        },
      },
    },
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">Team Insights</h1>

      <div className="flex flex-wrap gap-6 mb-8 items-center">
        <label>
          <span className="font-semibold block mb-1">Filter by Role:</span>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        {/* Date range pickers */}
        <label>
          <span className="font-semibold block mb-1">Start Date:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
            className="p-2 border rounded"
          />
        </label>

        <label>
          <span className="font-semibold block mb-1">End Date:</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
            className="p-2 border rounded"
          />
        </label>

        <button
          onClick={() => {
            setFilterRole('');
            setDateRange({ start: '', end: '' });
          }}
          className="ml-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Filters
        </button>
      </div>

      <div className="mb-8">
        <Line options={lineChartOptions} data={lineChartData} />
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-100 rounded p-4 shadow">
          <h2 className="text-xl font-semibold mb-3">Top Performers</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b p-2 bg-green-200">Name</th>
                <th className="border-b p-2 bg-green-200">Role</th>
                <th className="border-b p-2 bg-green-200">Hours Worked</th>
                <th className="border-b p-2 bg-green-200">Punctuality</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopPerformers.map(({ name, role, hoursWorked, punctuality }) => (
                <tr key={name} className="hover:bg-green-50">
                  <td className="border-b p-2">{name}</td>
                  <td className="border-b p-2">{role}</td>
                  <td className="border-b p-2">{hoursWorked}</td>
                  <td className="border-b p-2">{punctuality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-yellow-100 rounded p-4 shadow">
          <h2 className="text-xl font-semibold mb-3">Late Clock-Ins</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b p-2 bg-yellow-200">Name</th>
                <th className="border-b p-2 bg-yellow-200">Role</th>
                <th className="border-b p-2 bg-yellow-200">Times Late</th>
              </tr>
            </thead>
            <tbody>
              {filteredLateClockIns.map(({ name, role, lateCount }) => (
                <tr key={name} className="hover:bg-yellow-50">
                  <td className="border-b p-2">{name}</td>
                  <td className="border-b p-2">{role}</td>
                  <td className="border-b p-2">{lateCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
