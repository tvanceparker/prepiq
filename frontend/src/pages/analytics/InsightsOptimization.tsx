import React, { useState, useMemo } from "react";

const fakeInsights = [
  {
    id: 1,
    type: "Waste",
    message:
      "Tomatoes waste has increased by 20% in the last week compared to average. Consider reviewing prep quantities or storage conditions.",
    action: "Review prep schedule or improve storage for tomatoes.",
    severity: "warning",
    timestamp: "2025-06-01T09:00:00Z",
  },
  {
    id: 2,
    type: "Profit",
    message:
      "Grilled Chicken Breast shows the highest profit margin this month at 45%. Promote this dish more to boost revenue.",
    action: "Add Grilled Chicken Breast to specials or marketing campaigns.",
    severity: "success",
    timestamp: "2025-06-02T14:20:00Z",
  },
  {
    id: 3,
    type: "Inventory",
    message:
      "Basil inventory is below reorder point. Supplier lead time is 5 days. Place a purchase order soon to avoid stockout.",
    action: "Create a purchase order for Basil immediately.",
    severity: "critical",
    timestamp: "2025-06-03T08:15:00Z",
  },
  {
    id: 4,
    type: "Forecast",
    message:
      "Forecast accuracy for Dairy products dropped by 15% last week. Consider reviewing forecast model parameters for this category.",
    action: "Check and retrain forecasting model for Dairy ingredients.",
    severity: "warning",
    timestamp: "2025-06-02T18:30:00Z",
  },
  {
    id: 5,
    type: "Profit",
    message:
      "Ingredient cost for Mozzarella Cheese increased 12% in last month, affecting profit margins negatively.",
    action: "Negotiate with suppliers or adjust menu pricing accordingly.",
    severity: "warning",
    timestamp: "2025-05-31T12:45:00Z",
  },
  {
    id: 6,
    type: "Waste",
    message:
      "Leftover prepared batches of Caesar Dressing have been discarded 3 times in last 2 weeks. Adjust batch size to reduce waste.",
    action: "Reduce Caesar Dressing batch sizes by 15%.",
    severity: "info",
    timestamp: "2025-06-01T11:10:00Z",
  },
  {
    id: 7,
    type: "Inventory",
    message:
      "Supplier B offers a volume discount on Chicken Breast if ordering over 100 lbs. Consider bulk orders to save costs.",
    action: "Review purchase order volumes for Chicken Breast.",
    severity: "info",
    timestamp: "2025-06-03T10:00:00Z",
  },
  {
    id: 8,
    type: "Forecast",
    message:
      "Weekend sales peak expected this Saturday based on traffic data. Prepare increased ingredient stock accordingly.",
    action: "Adjust prep schedule and inventory for weekend peak.",
    severity: "success",
    timestamp: "2025-06-04T07:00:00Z",
  },
];

const insightTypes = ["All", "Waste", "Profit", "Inventory", "Forecast"];

function InsightsOptimization() {
  const [filter, setFilter] = useState("All");
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Filter insights by type and remove dismissed ones
  const visibleInsights = useMemo(() => {
    return fakeInsights.filter(
      (insight) =>
        (filter === "All" || insight.type === filter) &&
        !dismissedIds.has(insight.id)
    );
  }, [filter, dismissedIds]);

  // Mark insight as dismissed
  const dismissInsight = (id) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  // Format date nicely
  const formatDate = (isoStr) => new Date(isoStr).toLocaleString();

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Insights & Optimization</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {insightTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded ${
              filter === type
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Insight cards */}
      {visibleInsights.length === 0 ? (
        <p className="text-center text-gray-500">No insights to display.</p>
      ) : (
        <div className="space-y-5">
          {visibleInsights.map(
            ({ id, type, message, action, severity, timestamp }) => {
              const severityColors = {
                critical: "bg-red-100 border-red-500 text-red-700",
                warning: "bg-yellow-100 border-yellow-500 text-yellow-700",
                success: "bg-green-100 border-green-500 text-green-700",
                info: "bg-blue-100 border-blue-500 text-blue-700",
              };
              return (
                <div
                  key={id}
                  className={`border-l-4 p-4 rounded shadow-sm ${
                    severityColors[severity] || ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h2 className="font-semibold text-lg">{type} Insight</h2>
                    <button
                      onClick={() => dismissInsight(id)}
                      aria-label="Dismiss insight"
                      className="text-gray-400 hover:text-gray-700"
                    >
                      &times;
                    </button>
                  </div>
                  <p className="mb-2">{message}</p>
                  <p className="italic text-sm mb-2">
                    Suggested action: {action}
                  </p>
                  <p className="text-xs text-gray-500">
                    Generated: {formatDate(timestamp)}
                  </p>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

export default InsightsOptimization;
