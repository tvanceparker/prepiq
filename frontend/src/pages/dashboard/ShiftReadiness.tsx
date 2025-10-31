import React, { useState } from "react";

const fakeShifts = [
  {
    id: 1,
    date: "2025-06-08",
    time: "Morning (8AM-2PM)",
    location: "Main Kitchen",
    requiredRoles: ["Chef", "Prep Cook", "Dishwasher", "Manager"],
    scheduled: [
      { id: 101, name: "Alice", role: "Chef" },
      { id: 102, name: "Bob", role: "Prep Cook" },
      { id: 103, name: "Charlie", role: "Dishwasher" },
      // Manager missing here to simulate gap
    ],
  },
  {
    id: 2,
    date: "2025-06-08",
    time: "Evening (3PM-10PM)",
    location: "Main Kitchen",
    requiredRoles: ["Chef", "Prep Cook", "Dishwasher", "Manager"],
    scheduled: [
      { id: 104, name: "Diana", role: "Chef" },
      { id: 105, name: "Eve", role: "Prep Cook" },
      { id: 106, name: "Frank", role: "Dishwasher" },
      { id: 107, name: "Grace", role: "Manager" },
    ],
  },
  {
    id: 3,
    date: "2025-06-09",
    time: "Morning (8AM-2PM)",
    location: "Bar",
    requiredRoles: ["Bartender", "Manager"],
    scheduled: [
      { id: 108, name: "Henry", role: "Bartender" },
      // Manager missing here too
    ],
  },
];

// Helper function to check coverage
function checkShiftCoverage(shift) {
  const scheduledRoles = shift.scheduled.map((e) => e.role);
  const missingRoles = shift.requiredRoles.filter(
    (role) => !scheduledRoles.includes(role)
  );
  if (missingRoles.length === 0) return { status: "full", missingRoles: [] };
  if (missingRoles.length === shift.requiredRoles.length)
    return { status: "empty", missingRoles };
  return { status: "partial", missingRoles };
}

export default function ShiftReadiness() {
  const [dateFilter, setDateFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filteredShifts = fakeShifts.filter((shift) => {
    const matchesDate = dateFilter ? shift.date === dateFilter : true;
    const matchesRole = roleFilter
      ? shift.requiredRoles.includes(roleFilter)
      : true;
    return matchesDate && matchesRole;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "full":
        return (
          <span className="px-3 py-1 rounded-full bg-green-200 text-green-800 font-semibold">
            ✅ Fully Staffed
          </span>
        );
      case "partial":
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 font-semibold">
            ⚠️ Understaffed
          </span>
        );
      case "empty":
        return (
          <span className="px-3 py-1 rounded-full bg-red-200 text-red-800 font-semibold">
            ❌ Missing Roles
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Shift Readiness</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div>
          <label
            className="block mb-1 font-semibold text-gray-700"
            htmlFor="dateFilter"
          >
            Filter by Date
          </label>
          <input
            type="date"
            id="dateFilter"
            className="border rounded p-2"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div>
          <label
            className="block mb-1 font-semibold text-gray-700"
            htmlFor="roleFilter"
          >
            Filter by Role
          </label>
          <select
            id="roleFilter"
            className="border rounded p-2"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="Chef">Chef</option>
            <option value="Prep Cook">Prep Cook</option>
            <option value="Dishwasher">Dishwasher</option>
            <option value="Manager">Manager</option>
            <option value="Bartender">Bartender</option>
          </select>
        </div>
      </div>

      {/* Shift list */}
      {filteredShifts.length === 0 ? (
        <p className="text-gray-600">No shifts match your filter.</p>
      ) : (
        <div className="space-y-6">
          {filteredShifts.map((shift) => {
            const { status, missingRoles } = checkShiftCoverage(shift);

            return (
              <div
                key={shift.id}
                className="border rounded p-4 shadow hover:shadow-lg transition cursor-pointer"
              >
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {shift.date} | {shift.time} | {shift.location}
                    </h2>
                    <p className="text-gray-700 text-sm">
                      Required roles: {shift.requiredRoles.join(", ")}
                    </p>
                  </div>
                  <div>{getStatusBadge(status)}</div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    Scheduled Employees:
                  </h3>
                  {shift.scheduled.length === 0 ? (
                    <p className="text-red-600 italic">No one scheduled yet.</p>
                  ) : (
                    <ul className="list-disc list-inside text-gray-700">
                      {shift.scheduled.map((emp) => (
                        <li key={emp.id}>
                          {emp.name}{" "}
                          <span className="text-sm italic">({emp.role})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {status !== "full" && (
                  <div className="mt-3 text-red-600 font-semibold">
                    Missing roles: {missingRoles.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
