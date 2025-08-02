import React, { useState, useCallback } from "react";
import ModalBase from "../../../components/ModalBase";

const exampleData = [
  { name: "Burger", category: "Main", price: "5.99" },
  { name: "Fries", category: "Sides", price: "2.99" },
  { name: "Soda", category: "Drinks", price: "1.49" },
];

export default function BulkUploadModal({ isOpen, onClose, onUpload }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        await onUpload(file);
        // parent closes modal & shows toast
      }
    },
    [onUpload]
  );

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await onUpload(file);
      // parent closes modal & shows toast
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <ModalBase
      visible={isOpen}
      onClose={onClose}
      title="Upload Menu CSV or XLSX"
    >
      <div className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded p-6 text-center cursor-pointer ${
            dragOver
              ? "border-dark-primary bg-light-primary/20"
              : "border-gray-300"
          }`}
        >
          <p className="mb-2 text-sm text-light-textSecondary dark:text-dark-textSecondary">
            Drag and drop your CSV or XLSX file here, or click to select file
          </p>
          <input
            type="file"
            accept=".csv, .xlsx"
            className="hidden"
            id="file-upload"
            onChange={handleChange}
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 bg-dark-primary text-white rounded cursor-pointer hover:bg-dark-secondary"
          >
            Select File
          </label>
        </div>

        <p className="text-xs text-light-muted dark:text-dark-muted">
          CSV should include the following columns:
        </p>

        <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left">
                name
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left">
                category
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left">
                price
              </th>
            </tr>
          </thead>
          <tbody>
            {exampleData.map((row, i) => (
              <tr
                key={i}
                className={
                  i % 2 === 0
                    ? "bg-white dark:bg-gray-800"
                    : "bg-gray-50 dark:bg-gray-900"
                }
              >
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                  {row.name}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                  {row.category}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                  {row.price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalBase>
  );
}
