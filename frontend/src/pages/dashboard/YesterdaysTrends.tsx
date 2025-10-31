import React from "react";

const fakeData = {
  sales: {
    yesterday: 1540,
    dayBefore: 1360,
  },
  topMenuItems: [
    { id: 1, name: "Grilled Chicken Sandwich", qty: 75 },
    { id: 2, name: "Caesar Salad", qty: 62 },
    { id: 3, name: "Veggie Burger", qty: 58 },
    { id: 4, name: "French Fries", qty: 50 },
    { id: 5, name: "Chocolate Cake", qty: 45 },
  ],
  ingredientUsage: [
    { id: 1, name: "Chicken Breast", used: 30, trend: "up" },
    { id: 2, name: "Romaine Lettuce", used: 20, trend: "down" },
    { id: 3, name: "Potatoes", used: 40, trend: "up" },
    { id: 4, name: "Cheddar Cheese", used: 25, trend: "stable" },
    { id: 5, name: "Chocolate", used: 15, trend: "down" },
  ],
  alerts: [
    {
      id: 1,
      message: "Low stock alert for Romaine Lettuce",
      severity: "warning",
    },
    {
      id: 2,
      message: "Spoilage recorded for fresh fish batch #12",
      severity: "critical",
    },
  ],
  salesTrendWeek: [1200, 1300, 1250, 1400, 1350, 1360, 1540], // last 7 days, yesterday last
};

function formatPercentChange(current, previous) {
  if (previous === 0) return "N/A";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

export default function YesterdaysTrends() {
  const { sales, topMenuItems, ingredientUsage, alerts, salesTrendWeek } =
    fakeData;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Yesterday’s Trends
      </h1>

      {/* Sales Summary */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-blue-700">Total Sales</h2>
          <p className="text-4xl font-bold text-blue-900">
            ${sales.yesterday.toLocaleString()}
          </p>
          <p className="text-blue-600">
            vs Day Before:{" "}
            <span
              className={
                sales.yesterday >= sales.dayBefore
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {formatPercentChange(sales.yesterday, sales.dayBefore)}
            </span>
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-green-700">
            Top Menu Items
          </h2>
          <ul className="mt-2 space-y-1 text-green-900">
            {topMenuItems.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>{item.name}</span>
                <span className="font-semibold">{item.qty}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-yellow-700">
            Ingredient Usage
          </h2>
          <ul className="mt-2 space-y-1 text-yellow-900">
            {ingredientUsage.map((ing) => (
              <li key={ing.id} className="flex justify-between">
                <span>{ing.name}</span>
                <span className="flex items-center space-x-1">
                  <span>{ing.used} units</span>
                  {ing.trend === "up" && (
                    <span className="text-green-600">⬆️</span>
                  )}
                  {ing.trend === "down" && (
                    <span className="text-red-600">⬇️</span>
                  )}
                  {ing.trend === "stable" && (
                    <span className="text-gray-500">—</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Alerts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-red-700">
          Alerts from Yesterday
        </h2>
        {alerts.length === 0 ? (
          <p className="text-gray-600 italic">No alerts reported.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`p-3 rounded ${
                  alert.severity === "critical"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sales trend sparkline */}
      <div>
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          Sales Trend (Last 7 days)
        </h2>
        <svg
          width="100%"
          height="80"
          viewBox="0 0 350 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="bg-gray-50 rounded"
        >
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            points={salesTrendWeek
              .map((val, idx) => `${idx * 50 + 10},${80 - val / 20}`)
              .join(" ")}
          />
          {salesTrendWeek.map((val, idx) => (
            <circle
              key={idx}
              cx={idx * 50 + 10}
              cy={80 - val / 20}
              r="5"
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
