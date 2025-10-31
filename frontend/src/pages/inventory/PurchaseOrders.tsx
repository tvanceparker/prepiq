import React, { useState } from "react";

const suppliers = [
  { id: 1, name: "Fresh Farms" },
  { id: 2, name: "Dairy Best" },
  { id: 3, name: "Organic Goods" },
];

const fakePurchaseOrders = [
  {
    id: 101,
    poNumber: "PO-20250601-01",
    supplierId: 1,
    supplierName: "Fresh Farms",
    orderDate: "2025-06-01",
    status: "Pending",
    items: [
      {
        id: 1,
        ingredient: "Tomato",
        quantity: 200,
        unit: "lbs",
        unitPrice: 0.8,
      },
      {
        id: 2,
        ingredient: "Lettuce",
        quantity: 50,
        unit: "lbs",
        unitPrice: 1.2,
      },
    ],
  },
  {
    id: 102,
    poNumber: "PO-20250603-02",
    supplierId: 2,
    supplierName: "Dairy Best",
    orderDate: "2025-06-03",
    status: "Delivered",
    items: [
      {
        id: 3,
        ingredient: "Mozzarella Cheese",
        quantity: 50,
        unit: "lbs",
        unitPrice: 4.5,
      },
      {
        id: 4,
        ingredient: "Parmesan",
        quantity: 30,
        unit: "lbs",
        unitPrice: 5.0,
      },
    ],
  },
];

function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState(fakePurchaseOrders);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showNewPOForm, setShowNewPOForm] = useState(false);

  // Total cost for a PO
  function calculateTotalCost(items) {
    return items
      .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
      .toFixed(2);
  }

  // Handlers for selecting and closing PO details
  const openDetails = (po) => setSelectedPO(po);
  const closeDetails = () => setSelectedPO(null);

  // Add a new purchase order (simplified form)
  const [newPO, setNewPO] = useState({
    supplierId: suppliers[0].id,
    orderDate: new Date().toISOString().slice(0, 10),
    items: [{ id: 1, ingredient: "", quantity: 0, unit: "", unitPrice: 0 }],
  });

  function handleNewPOChange(field, value) {
    setNewPO({ ...newPO, [field]: value });
  }

  function handleNewItemChange(index, field, value) {
    const newItems = [...newPO.items];
    newItems[index][field] =
      field === "quantity" || field === "unitPrice" ? Number(value) : value;
    setNewPO({ ...newPO, items: newItems });
  }

  function addNewItem() {
    setNewPO({
      ...newPO,
      items: [
        ...newPO.items,
        { id: Date.now(), ingredient: "", quantity: 0, unit: "", unitPrice: 0 },
      ],
    });
  }

  function removeNewItem(index) {
    const newItems = [...newPO.items];
    newItems.splice(index, 1);
    setNewPO({ ...newPO, items: newItems });
  }

  function submitNewPO() {
    const supplierName =
      suppliers.find((s) => s.id === newPO.supplierId)?.name || "";
    const newOrder = {
      id: Date.now(),
      poNumber: `PO-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`,
      supplierId: newPO.supplierId,
      supplierName,
      orderDate: newPO.orderDate,
      status: "Pending",
      items: newPO.items.filter((i) => i.ingredient && i.quantity > 0),
    };
    setPurchaseOrders([newOrder, ...purchaseOrders]);
    setShowNewPOForm(false);
    setNewPO({
      supplierId: suppliers[0].id,
      orderDate: new Date().toISOString().slice(0, 10),
      items: [{ id: 1, ingredient: "", quantity: 0, unit: "", unitPrice: 0 }],
    });
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
        <button
          onClick={() => setShowNewPOForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
        >
          + New Purchase Order
        </button>
      </div>

      {/* New PO Form */}
      {showNewPOForm && (
        <div className="mb-6 p-6 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">
            Create New Purchase Order
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <label className="block">
              Supplier:
              <select
                value={newPO.supplierId}
                onChange={(e) =>
                  handleNewPOChange("supplierId", Number(e.target.value))
                }
                className="mt-1 block w-full border rounded px-3 py-2"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Order Date:
              <input
                type="date"
                value={newPO.orderDate}
                onChange={(e) => handleNewPOChange("orderDate", e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2"
              />
            </label>
          </div>

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-2">Ingredients</h3>
            {newPO.items.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-6 gap-2 items-center mb-2"
              >
                <input
                  type="text"
                  placeholder="Ingredient Name"
                  value={item.ingredient}
                  onChange={(e) =>
                    handleNewItemChange(idx, "ingredient", e.target.value)
                  }
                  className="col-span-2 border rounded px-2 py-1"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) =>
                    handleNewItemChange(idx, "quantity", e.target.value)
                  }
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Unit (lbs, kg, etc.)"
                  value={item.unit}
                  onChange={(e) =>
                    handleNewItemChange(idx, "unit", e.target.value)
                  }
                  className="border rounded px-2 py-1"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleNewItemChange(idx, "unitPrice", e.target.value)
                  }
                  className="border rounded px-2 py-1"
                />
                <button
                  onClick={() => removeNewItem(idx)}
                  className="text-red-600 hover:text-red-800 font-bold"
                  title="Remove ingredient"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              onClick={addNewItem}
              className="mt-2 text-indigo-600 hover:underline"
            >
              + Add Ingredient
            </button>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowNewPOForm(false)}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={submitNewPO}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Create PO
            </button>
          </div>
        </div>
      )}

      {/* Purchase Orders List */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">
                PO Number
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Supplier
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Order Date
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Status
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right">
                Total Cost ($)
              </th>
              <th className="border border-gray-300 px-4 py-2 text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr
                key={po.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => openDetails(po)}
              >
                <td className="border border-gray-300 px-4 py-2">
                  {po.poNumber}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {po.supplierName}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {po.orderDate}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {po.status}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {calculateTotalCost(po.items)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Edit feature coming soon!");
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PO Details Modal */}
      {selectedPO && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50"
          onClick={closeDetails}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full p-6 overflow-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">
              Purchase Order Details - {selectedPO.poNumber}
            </h2>
            <p className="mb-2">
              <strong>Supplier:</strong> {selectedPO.supplierName}
            </p>
            <p className="mb-4">
              <strong>Order Date:</strong> {selectedPO.orderDate}
            </p>

            <table className="min-w-full table-auto border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Ingredient
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Quantity
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Unit
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Unit Price ($)
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Total ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedPO.items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.ingredient}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {item.unit}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={4}
                    className="border border-gray-300 px-3 py-2 font-bold text-right"
                  >
                    Total Cost:
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-bold text-right">
                    {calculateTotalCost(selectedPO.items)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={closeDetails}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrdersPage;
