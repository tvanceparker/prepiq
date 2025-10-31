import React, { useState } from "react";

const fakeAlerts = [
  {
    id: 1,
    level: "Critical",
    message: "Database connection lost",
    date: "2025-06-06 14:22",
    resolved: false,
  },
  {
    id: 2,
    level: "Warning",
    message: "Inventory sync delayed by 15 mins",
    date: "2025-06-06 13:00",
    resolved: true,
  },
  {
    id: 3,
    level: "Info",
    message: "New system update available",
    date: "2025-06-05 09:15",
    resolved: false,
  },
];

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState(fakeAlerts);

  const toggleResolved = (id) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, resolved: !alert.resolved } : alert
      )
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">System Alerts</h1>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-3 bg-gray-100">Level</th>
            <th className="border-b p-3 bg-gray-100">Message</th>
            <th className="border-b p-3 bg-gray-100">Date</th>
            <th className="border-b p-3 bg-gray-100">Resolved</th>
            <th className="border-b p-3 bg-gray-100">Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(({ id, level, message, date, resolved }) => (
            <tr key={id} className="hover:bg-gray-200">
              <td
                className={`border-b p-3 font-semibold ${
                  level === "Critical"
                    ? "text-red-600"
                    : level === "Warning"
                    ? "text-yellow-600"
                    : "text-blue-600"
                }`}
              >
                {level}
              </td>
              <td className="border-b p-3">{message}</td>
              <td className="border-b p-3">{date}</td>
              <td className="border-b p-3 text-center">
                {resolved ? "✔️" : "❌"}
              </td>
              <td className="border-b p-3 text-center">
                <button
                  onClick={() => toggleResolved(id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {resolved ? "Mark Unresolved" : "Mark Resolved"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
