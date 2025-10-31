import React, { useState, useMemo } from 'react';

const fakeDishProfitData = [
  {
    id: 1,
    name: 'Margherita Pizza',
    category: 'Pizza',
    salesCount: 120,
    salesRevenue: 2400,
    costOfIngredients: 900,
    prepCost: 300,
  },
  {
    id: 2,
    name: 'Caesar Salad',
    category: 'Salads',
    salesCount: 80,
    salesRevenue: 1200,
    costOfIngredients: 600,
    prepCost: 150,
  },
  {
    id: 3,
    name: 'BBQ Wings',
    category: 'Appetizers',
    salesCount: 50,
    salesRevenue: 1000,
    costOfIngredients: 550,
    prepCost: 200,
  },
  {
    id: 4,
    name: 'Veggie Burger',
    category: 'Burgers',
    salesCount: 30,
    salesRevenue: 600,
    costOfIngredients: 420,
    prepCost: 120,
  },
  {
    id: 5,
    name: 'Chocolate Cake',
    category: 'Desserts',
    salesCount: 25,
    salesRevenue: 375,
    costOfIngredients: 225,
    prepCost: 75,
  },
  // Add more dishes as needed
];

// Calculate profit and margin for each dish
const calculateDishProfit = dish => {
  const totalCost = dish.costOfIngredients + dish.prepCost;
  const profit = dish.salesRevenue - totalCost;
  const profitMargin = dish.salesRevenue > 0 ? (profit / dish.salesRevenue) * 100 : 0;
  return { profit, profitMargin };
};

const uniqueCategories = [...new Set(fakeDishProfitData.map(d => d.category))];

function DishProfitability() {
  const [filters, setFilters] = useState({
    category: '',
    minSalesCount: 0,
    searchTerm: '',
  });

  const filteredDishes = useMemo(() => {
    return fakeDishProfitData.filter(dish => {
      const matchesCategory = filters.category ? dish.category === filters.category : true;
      const matchesSales = dish.salesCount >= filters.minSalesCount;
      const matchesSearch =
        filters.searchTerm === '' ||
        dish.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      return matchesCategory && matchesSales && matchesSearch;
    });
  }, [filters]);

  // Aggregate stats
  const totalProfit = filteredDishes
    .reduce((sum, d) => sum + calculateDishProfit(d).profit, 0)
    .toFixed(2);
  const avgMargin =
    filteredDishes.length > 0
      ? (
          filteredDishes.reduce((sum, d) => sum + calculateDishProfit(d).profitMargin, 0) /
          filteredDishes.length
        ).toFixed(1)
      : 0;

  // Handlers
  const handleFilterChange = field => e => {
    const value = field === 'minSalesCount' ? Number(e.target.value) : e.target.value;
    setFilters(f => ({ ...f, [field]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded shadow-md">
      <h1 className="text-3xl font-bold mb-6">Dish Profitability</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <select
          value={filters.category}
          onChange={handleFilterChange('category')}
          className="border rounded px-3 py-2"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          value={filters.minSalesCount}
          onChange={handleFilterChange('minSalesCount')}
          className="border rounded px-3 py-2 w-32"
          placeholder="Min Sales Count"
          aria-label="Minimum sales count"
        />

        <input
          type="text"
          value={filters.searchTerm}
          onChange={handleFilterChange('searchTerm')}
          className="border rounded px-3 py-2 flex-grow min-w-[200px]"
          placeholder="Search dish name..."
          aria-label="Search dish name"
        />
      </div>

      {/* Summary */}
      <div className="mb-6 text-lg font-semibold flex flex-wrap gap-6">
        <div>
          Total Profit: <span className="text-green-600">${totalProfit}</span>
        </div>
        <div>
          Average Profit Margin: <span className="text-green-600">{avgMargin}%</span>
        </div>
        <div>Dishes Analyzed: {filteredDishes.length}</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-gray-300">
        <table className="min-w-full table-auto border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-left">Dish</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Category</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Sales Count</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Revenue ($)</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Cost ($)</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Profit ($)</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Profit Margin (%)</th>
            </tr>
          </thead>
          <tbody>
            {filteredDishes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  No dishes match the criteria.
                </td>
              </tr>
            ) : (
              filteredDishes.map(dish => {
                const { profit, profitMargin } = calculateDishProfit(dish);
                const cost = dish.costOfIngredients + dish.prepCost;
                return (
                  <tr
                    key={dish.id}
                    className={`hover:bg-gray-50 ${
                      profitMargin < 10
                        ? 'bg-red-100'
                        : profitMargin >= 10 && profitMargin < 20
                          ? 'bg-yellow-100'
                          : 'bg-green-100'
                    }`}
                  >
                    <td className="border border-gray-300 px-3 py-1">{dish.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{dish.category}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      {dish.salesCount}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      ${dish.salesRevenue.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      ${cost.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      ${profit.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-right">
                      {profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DishProfitability;
