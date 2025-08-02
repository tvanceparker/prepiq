import React, { useState, useMemo } from "react";

const stockMovementsData = [
  {
    id: 1,
    date: "2025-06-01",
    type: "Purchase Order",
    poNumber: "PO-20250601-01",
    ingredient: "Tomato",
    quantity: 200,
    unit: "lbs",
    sourceOrDestination: "Fresh Farms",
    notes: "Regular weekly order",
  },
  {
    id: 2,
    date: "2025-06-02",
    type: "Usage - Prep",
    poNumber: null,
    ingredient: "Tomato",
    quantity: -50,
    unit: "lbs",
    sourceOrDestination: "Prep Kitchen",
    notes: "Batch recipe #45",
  },
  {
    id: 3,
    date: "2025-06-02",
    type: "Usage - Sales",
    poNumber: null,
    ingredient: "Tomato",
    quantity: -70,
    unit: "lbs",
    sourceOrDestination: "Front of House",
    notes: "Menu item sales",
  },
  {
    id: 4,
    date: "2025-06-03",
    type: "Waste",
    poNumber: null,
    ingredient: "Tomato",
    quantity: -5,
    unit: "lbs",
    sourceOrDestination: "Storage",
    notes: "Spoilage",
  },
  {
    id: 5,
    date: "2025-06-04",
    type: "Purchase Order",
    poNumber: "PO-20250604-02",
    ingredient: "Mozzarella Cheese",
    quantity: 50,
    unit: "lbs",
    sourceOrDestination: "Dairy Best",
    notes: "Emergency restock",
  },
  {
    id: 6,
    date: "2025-06-05",
    type: "Usage - Prep",
    poNumber: null,
    ingredient: "Mozzarella Cheese",
    quantity: -30,
    unit: "lbs",
    sourceOrDestination: "Prep Kitchen",
    notes: "Pizza batch",
  },
  // Add more entries here...
];

const typeColors = {
  "Purchase Order": "bg-green-100 text-green-700",
  "Usage - Prep": "bg-yellow-100 text-yellow-700",
  "Usage - Sales": "bg-blue-100 text-blue-700",
  Waste: "bg-red-100 text-red-700",
};

function StockMovementsPage() {
  const [filterIngredient, setFilterIngredient] = useState("");
  const [filterPoNumber, setFilterPoNumber] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Filtering logic
  const filteredData = useMemo(() => {
    return stockMovementsData.filter((entry) => {
      const matchesIngredient = filterIngredient
        ? entry.ingredient
            .toLowerCase()
            .includes(filterIngredient.toLowerCase())
        : true;
      const matchesPoNumber = filterPoNumber
        ? entry.poNumber?.toLowerCase().includes(filterPoNumber.toLowerCase())
        : true;
      const matchesDateFrom = filterDateFrom
        ? new Date(entry.date) >= new Date(filterDateFrom)
        : true;
      const matchesDateTo = filterDateTo
        ? new Date(entry.date) <= new Date(filterDateTo)
        : true;
      return (
        matchesIngredient && matchesPoNumber && matchesDateFrom && matchesDateTo
      );
    });
  }, [filterIngredient, filterPoNumber, filterDateFrom, filterDateTo]);

  // Running balance calculation per ingredient (simplified for demo)
  // For a real app you'd want a better approach, maybe backend-precalculated
  function calculateRunningBalance(ingredient) {
    let balance = 0;
    return filteredData
      .filter((e) => e.ingredient === ingredient)
      .map((entry) => {
        balance += entry.quantity;
        return { ...entry, runningBalance: balance };
      });
  }

  // Group entries by ingredient to display running balance
  const groupedByIngredient = useMemo(() => {
    const groups = {};
    filteredData.forEach((entry) => {
      if (!groups[entry.ingredient]) {
        groups[entry.ingredient] = [];
      }
      groups[entry.ingredient].push(entry);
    });
    return groups;
  }, [filteredData]);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Stock Movements</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Filter by Ingredient"
          value={filterIngredient}
          onChange={(e) => setFilterIngredient(e.target.value)}
          className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          placeholder="Filter by PO Number"
          value={filterPoNumber}
          onChange={(e) => setFilterPoNumber(e.target.value)}
          className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          placeholder="From Date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          placeholder="To Date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Movement tables per ingredient */}
      {Object.entries(groupedByIngredient).map(([ingredient, entries]) => {
        let runningBalance = 0;
        return (
          <div key={ingredient} className="mb-8">
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-300 pb-1">
              {ingredient}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                      Date
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                      Movement Type
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                      PO Number
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-700">
                      Quantity
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                      Source / Destination
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                      Notes
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-right font-medium text-gray-700">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    runningBalance += entry.quantity;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              typeColors[entry.type] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {entry.poNumber || "-"}
                        </td>
                        <td
                          className={`border border-gray-300 px-4 py-2 text-right font-semibold ${
                            entry.quantity < 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {entry.quantity}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {entry.sourceOrDestination}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {entry.notes}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                          {runningBalance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StockMovementsPage;
