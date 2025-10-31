import React, { useState } from "react";

const fakePrepLogs = [
  {
    id: 1,
    batchName: "Chicken Stock Batch",
    quantityPrepped: "10 liters",
    prepDate: "2025-06-05",
    prepBy: "John Doe",
    notes: "Batch came out a bit salty",
  },
  {
    id: 2,
    batchName: "Tomato Sauce Batch",
    quantityPrepped: "8 liters",
    prepDate: "2025-06-06",
    prepBy: "Jane Smith",
    notes: "Perfect consistency",
  },
  {
    id: 3,
    batchName: "Chicken Stock Batch",
    quantityPrepped: "15 liters",
    prepDate: "2025-06-07",
    prepBy: "John Doe",
    notes: "",
  },
];

export default function PrepLogs() {
  const [filterDate, setFilterDate] = useState("");
  const [filterBatch, setFilterBatch] = useState("");

  const filteredLogs = fakePrepLogs.filter((log) => {
    const matchesDate = filterDate ? log.prepDate === filterDate : true;
    const matchesBatch = filterBatch
      ? log.batchName.toLowerCase().includes(filterBatch.toLowerCase())
      : true;
    return matchesDate && matchesBatch;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">Prep Logs</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="date"
          className="border p-2 rounded"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          placeholder="Filter by date"
        />
        <input
          type="text"
          className="border p-2 rounded flex-grow"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          placeholder="Filter by batch name"
        />
      </div>

      {/* Logs Table */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-3 bg-gray-100">Batch Recipe</th>
            <th className="border-b p-3 bg-gray-100">Quantity Prepped</th>
            <th className="border-b p-3 bg-gray-100">Prep Date</th>
            <th className="border-b p-3 bg-gray-100">Prepared By</th>
            <th className="border-b p-3 bg-gray-100">Notes</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-200">
                <td className="border-b p-3">{log.batchName}</td>
                <td className="border-b p-3">{log.quantityPrepped}</td>
                <td className="border-b p-3">{log.prepDate}</td>
                <td className="border-b p-3">{log.prepBy}</td>
                <td className="border-b p-3">{log.notes || "-"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No prep logs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
