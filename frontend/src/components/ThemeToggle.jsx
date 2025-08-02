// components/ThemeToggle.jsx
import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-1 bg-light-border dark:bg-dark-border text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600"
    >
      {dark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
