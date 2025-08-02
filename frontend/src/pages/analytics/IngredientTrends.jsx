import React, { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Fake ingredient cost data (weekly average cost over 12 weeks)
const fakeIngredientCosts = [
  {
    id: 1,
    name: "Tomatoes",
    category: "Vegetables",
    supplier: "Supplier A",
    weeklyCosts: [
      1.2, 1.3, 1.35, 1.4, 1.38, 1.45, 1.5, 1.55, 1.52, 1.6, 1.58, 1.65,
    ],
  },
  {
    id: 2,
    name: "Chicken Breast",
    category: "Meat",
    supplier: "Supplier B",
    weeklyCosts: [
      3.5, 3.55, 3.6, 3.55, 3.7, 3.75, 3.8, 3.85, 3.9, 3.95, 4.0, 4.05,
    ],
  },
  {
    id: 3,
    name: "Mozzarella Cheese",
    category: "Dairy",
    supplier: "Supplier C",
    weeklyCosts: [
      2.1, 2.05, 2.0, 1.95, 2.0, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35,
    ],
  },
  {
    id: 4,
    name: "Basil",
    category: "Herbs",
    supplier: "Supplier D",
    weeklyCosts: [
      0.8, 0.82, 0.83, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25,
    ],
  },
];

// Utility function to calculate percent change from first to last value
const percentChange = (arr) => {
  if (arr.length < 2) return 0;
  return ((arr[arr.length - 1] - arr[0]) / arr[0]) * 100;
};

const categories = [...new Set(fakeIngredientCosts.map((i) => i.category))];
const suppliers = [...new Set(fakeIngredientCosts.map((i) => i.supplier))];

function IngredientTrends() {
  const [filters, setFilters] = useState({
    category: "",
    supplier: "",
  });
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);

  const filteredIngredients = useMemo(() => {
    return fakeIngredientCosts.filter((ingredient) => {
      const matchesCategory = filters.category
        ? ingredient.category === filters.category
        : true;
      const matchesSupplier = filters.supplier
        ? ingredient.supplier === filters.supplier
        : true;
      return matchesCategory && matchesSupplier;
    });
  }, [filters]);

  const selectedIngredient =
    filteredIngredients.find((i) => i.id === selectedIngredientId) || null;

  // Prepare chart data for selected ingredient
  const chartData = selectedIngredient
    ? {
        labels: Array.from(
          { length: selectedIngredient.weeklyCosts.length },
          (_, i) => `Wk ${i + 1}`
        ),
        datasets: [
          {
            label: selectedIngredient.name,
            data: selectedIngredient.weeklyCosts,
            borderColor: "#3b82f6", // Tailwind blue-500
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      }
    : null;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded shadow-md">
      <h1 className="text-3xl font-bold mb-6">Ingredient Cost Trends</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <select
          value={filters.category}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value }))
          }
          className="border rounded px-3 py-2"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filters.supplier}
          onChange={(e) =>
            setFilters((f) => ({ ...f, supplier: e.target.value }))
          }
          className="border rounded px-3 py-2"
          aria-label="Filter by supplier"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((sup) => (
            <option key={sup} value={sup}>
              {sup}
            </option>
          ))}
        </select>
      </div>

      {/* Ingredients list with trends */}
      <div className="overflow-x-auto rounded border border-gray-300 mb-6">
        <table className="min-w-full table-auto border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Ingredient
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Category
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left">
                Supplier
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right">
                Latest Cost ($)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-right">
                % Change (12 wks)
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center">
                View Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No ingredients match the criteria.
                </td>
              </tr>
            ) : (
              filteredIngredients.map((ingredient) => {
                const change = percentChange(ingredient.weeklyCosts);
                return (
                  <tr
                    key={ingredient.id}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="border border-gray-300 px-3 py-1">
                      {ingredient.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-1">
                      {ingredient.category}
                    </td>
                    <td className="border border-gray-300 px-3 py-1">
                      {ingredient.supplier}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      $
                      {ingredient.weeklyCosts[
                        ingredient.weeklyCosts.length - 1
                      ].toFixed(2)}
                    </td>
                    <td
                      className={`border border-gray-300 px-3 py-1 text-right ${
                        change > 10
                          ? "text-red-600"
                          : change < -10
                          ? "text-green-600"
                          : ""
                      }`}
                    >
                      {change.toFixed(1)}%
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-center">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setSelectedIngredientId(ingredient.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      {selectedIngredient && (
        <div className="border border-gray-300 rounded p-4">
          <h2 className="text-xl font-semibold mb-2">
            {selectedIngredient.name} Cost Trend (Last 12 weeks)
          </h2>
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: { display: false },
              },
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: { callback: (val) => `$${val}` },
                },
              },
            }}
            height={200}
          />
        </div>
      )}
    </div>
  );
}

export default IngredientTrends;
