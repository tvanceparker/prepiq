import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const fakeWasteData = [
  {
    id: 1,
    type: 'Ingredient',
    item: 'Tomatoes',
    quantity: 5, // pounds
    cost: 15,
    reason: 'Prep leftovers',
    date: '2025-06-01',
  },
  {
    id: 2,
    type: 'Spoilage',
    item: 'Lettuce',
    quantity: 3,
    cost: 9,
    reason: 'Expired inventory lot',
    date: '2025-06-02',
  },
  {
    id: 3,
    type: 'Prep Batch',
    item: 'Caesar Dressing',
    quantity: 1,
    cost: 4,
    reason: 'Batch leftover discarded',
    date: '2025-06-02',
  },
  {
    id: 4,
    type: 'Ingredient',
    item: 'Chicken Breast',
    quantity: 4,
    cost: 40,
    reason: 'Over portioned',
    date: '2025-06-03',
  },
  {
    id: 5,
    type: 'Spoilage',
    item: 'Mozzarella Cheese',
    quantity: 2,
    cost: 20,
    reason: 'Expired inventory lot',
    date: '2025-06-04',
  },
  {
    id: 6,
    type: 'Prep Batch',
    item: 'Tomato Sauce',
    quantity: 1.5,
    cost: 6,
    reason: 'Batch spoiled',
    date: '2025-06-05',
  },
  {
    id: 7,
    type: 'Ingredient',
    item: 'Basil',
    quantity: 0.5,
    cost: 3,
    reason: 'Wilted',
    date: '2025-06-06',
  },
  {
    id: 8,
    type: 'Prep Batch',
    item: 'Gravy',
    quantity: 0.7,
    cost: 2.8,
    reason: 'Leftover discarded',
    date: '2025-06-06',
  },
];

const wasteTypes = ['All', 'Ingredient', 'Prep Batch', 'Spoilage'];

function WasteDashboard() {
  const [filterType, setFilterType] = useState('All');
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-07');

  // Filter waste by type and date range
  const filteredWaste = useMemo(() => {
    return fakeWasteData.filter(w => {
      const dateOk =
        new Date(w.date) >= new Date(startDate) && new Date(w.date) <= new Date(endDate);
      const typeOk = filterType === 'All' || w.type === filterType;
      return dateOk && typeOk;
    });
  }, [filterType, startDate, endDate]);

  // Aggregate totals
  const totalQuantity = filteredWaste.reduce((acc, w) => acc + w.quantity, 0);
  const totalCost = filteredWaste.reduce((acc, w) => acc + w.cost, 0);

  // Prepare data for waste trend chart by date
  const datesInRange = [];
  let d = new Date(startDate);
  const e = new Date(endDate);
  while (d <= e) {
    datesInRange.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }

  const wasteByDate = datesInRange.map(date => {
    return filteredWaste.filter(w => w.date === date).reduce((acc, w) => acc + w.quantity, 0);
  });

  const chartData = {
    labels: datesInRange,
    datasets: [
      {
        label: 'Waste Quantity (lbs)',
        data: wasteByDate,
        fill: false,
        borderColor: '#3b82f6',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Waste Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <label className="flex flex-col">
          <span className="text-sm font-semibold">Waste Type</span>
          <select
            className="border rounded px-3 py-1"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            {wasteTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-semibold">Start Date</span>
          <input
            type="date"
            className="border rounded px-3 py-1"
            value={startDate}
            max={endDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-semibold">End Date</span>
          <input
            type="date"
            className="border rounded px-3 py-1"
            value={endDate}
            min={startDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>
      </div>

      {/* Summary cards */}
      <div className="flex gap-6 mb-8">
        <div className="flex-1 p-4 bg-red-100 rounded shadow">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Total Waste (lbs)</h2>
          <p className="text-3xl font-bold text-red-800">{totalQuantity.toFixed(1)}</p>
        </div>
        <div className="flex-1 p-4 bg-red-100 rounded shadow">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Total Waste Cost ($)</h2>
          <p className="text-3xl font-bold text-red-800">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Waste trend chart */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Waste Trend (Quantity over time)</h2>
        <Line data={chartData} />
      </div>

      {/* Waste entries table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Waste Details</h2>
        <div className="overflow-x-auto border rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-red-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-red-700">Date</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-red-700">Type</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-red-700">Item</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-red-700">
                  Quantity (lbs)
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-red-700">
                  Cost ($)
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-red-700">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-200">
              {filteredWaste.map(({ id, date, type, item, quantity, cost, reason }) => (
                <tr key={id} className="hover:bg-red-50">
                  <td className="px-4 py-2 whitespace-nowrap">{date}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{type}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">{quantity.toFixed(1)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">${cost.toFixed(2)}</td>
                  <td className="px-4 py-2">{reason}</td>
                </tr>
              ))}
              {filteredWaste.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    No waste records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default WasteDashboard;
