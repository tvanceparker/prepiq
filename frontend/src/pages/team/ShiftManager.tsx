import React, { useState, useMemo } from "react";

const shifts = [
  {
    id: 1,
    date: "2025-06-10",
    shift: "Morning",
    employees: ["Alice Johnson", "Bob Smith"],
    roles: ["Waitress", "Cook"],
  },
  {
    id: 2,
    date: "2025-06-10",
    shift: "Evening",
    employees: ["Carol Lee"],
    roles: ["Manager"],
  },
  {
    id: 3,
    date: "2025-06-11",
    shift: "Morning",
    employees: ["Bob Smith"],
    roles: ["Cook"],
  },
  {
    id: 4,
    date: "2025-06-11",
    shift: "Evening",
    employees: ["Alice Johnson", "Carol Lee"],
    roles: ["Waitress", "Manager"],
  },
  {
    id: 5,
    date: "2025-06-12",
    shift: "Morning",
    employees: ["Bob Smith"],
    roles: ["Cook"],
  },
];

const roles = ["Waitress", "Cook", "Manager", "Shift Manager"];

export default function ShiftManager() {
  const [filterDate, setFilterDate] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const matchDate = filterDate ? shift.date === filterDate : true;
      const matchRole = filterRole ? shift.roles.includes(filterRole) : true;
      return matchDate && matchRole;
    });
  }, [filterDate, filterRole]);

  // Summary info
  const totalShifts = filteredShifts.length;
  const totalEmployees = new Set(filteredShifts.flatMap((s) => s.employees))
    .size;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">Shift Manager</h1>

      <div className="flex flex-wrap gap-6 mb-8 items-center">
        <label className="block">
          <span className="font-semibold">Filter by Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="mt-1 p-2 border rounded"
          />
        </label>

        <label className="block">
          <span className="font-semibold">Filter by Role:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="mt-1 p-2 border rounded"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => {
            setFilterDate("");
            setFilterRole("");
          }}
          className="ml-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Filters
        </button>
      </div>

      <div className="mb-8 flex gap-6">
        <div className="flex-1 bg-blue-100 p-4 rounded shadow text-center">
          <p className="text-2xl font-bold">{totalShifts}</p>
          <p>Shifts</p>
        </div>
        <div className="flex-1 bg-green-100 p-4 rounded shadow text-center">
          <p className="text-2xl font-bold">{totalEmployees}</p>
          <p>Employees Scheduled</p>
        </div>
      </div>

      {filteredShifts.length === 0 ? (
        <p className="text-center text-gray-500">
          No shifts found for the selected filters.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b p-2 bg-gray-100">Date</th>
              <th className="border-b p-2 bg-gray-100">Shift</th>
              <th className="border-b p-2 bg-gray-100">Employees</th>
              <th className="border-b p-2 bg-gray-100">Roles</th>
              <th className="border-b p-2 bg-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.map(({ id, date, shift, employees, roles }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="border-b p-2">{date}</td>
                <td className="border-b p-2">{shift}</td>
                <td className="border-b p-2">{employees.join(", ")}</td>
                <td className="border-b p-2">{roles.join(", ")}</td>
                <td className="border-b p-2">
                  <button
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    onClick={() => alert(`Request shift swap for shift ${id}`)}
                  >
                    Request Swap
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
