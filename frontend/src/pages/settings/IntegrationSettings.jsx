import React, { useState } from "react";

const fakeIntegrations = [
  {
    id: 1,
    name: "POS System",
    enabled: true,
    lastSync: "2025-06-06 22:45",
    details: "Square POS integration for sales sync",
  },
  {
    id: 2,
    name: "Supplier API",
    enabled: false,
    lastSync: "N/A",
    details: "Supplier inventory sync via API",
  },
  {
    id: 3,
    name: "Accounting Software",
    enabled: true,
    lastSync: "2025-06-06 20:00",
    details: "QuickBooks integration for financial reporting",
  },
];

export default function IntegrationSettings() {
  const [integrations, setIntegrations] = useState(fakeIntegrations);

  const toggleIntegration = (id) => {
    setIntegrations((prev) =>
      prev.map((intg) =>
        intg.id === id ? { ...intg, enabled: !intg.enabled } : intg
      )
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">Integration Settings</h1>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-3 bg-gray-100">Integration</th>
            <th className="border-b p-3 bg-gray-100">Status</th>
            <th className="border-b p-3 bg-gray-100">Last Sync</th>
            <th className="border-b p-3 bg-gray-100">Details</th>
            <th className="border-b p-3 bg-gray-100">Actions</th>
          </tr>
        </thead>
        <tbody>
          {integrations.map(({ id, name, enabled, lastSync, details }) => (
            <tr key={id} className="hover:bg-gray-200">
              <td className="border-b p-3 font-semibold">{name}</td>
              <td
                className={`border-b p-3 font-semibold ${
                  enabled ? "text-green-600" : "text-red-600"
                }`}
              >
                {enabled ? "Enabled" : "Disabled"}
              </td>
              <td className="border-b p-3">{lastSync}</td>
              <td className="border-b p-3">{details}</td>
              <td className="border-b p-3">
                <button
                  onClick={() => toggleIntegration(id)}
                  className={`px-3 py-1 rounded text-white ${
                    enabled
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {enabled ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
