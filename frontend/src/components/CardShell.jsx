import React from "react";

export default function CardShell({
  title,
  subtitle,
  actions,
  children,
  elevation = "md", // e.g. sm, md, lg, xl
  hoverEffect = true,
  lighting = "top-left", // "top-left", "top-right", "bottom-left", "bottom-right"
  className = "",
}) {
  // Map elevation to Tailwind shadow classes with custom layering for 3D effect
  const elevationClasses = {
    sm: "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.1)]",
    md: "shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.06)]",
    lg: "shadow-[0_10px_15px_rgba(0,0,0,0.12),0_4px_6px_rgba(0,0,0,0.08)]",
    xl: "shadow-[0_20px_25px_rgba(0,0,0,0.15),0_10px_10px_rgba(0,0,0,0.1)]",
  };

  // Lighting directional shadows: simulate light source by offsetting shadow colors subtly
  const lightingOffsets = {
    "top-left": "drop-shadow(-2px -2px 6px rgba(255,255,255,0.15))",
    "top-right": "drop-shadow(2px -2px 6px rgba(255,255,255,0.15))",
    "bottom-left": "drop-shadow(-2px 2px 6px rgba(255,255,255,0.15))",
    "bottom-right": "drop-shadow(2px 2px 6px rgba(255,255,255,0.15))",
  };

  // Hover effect: increase elevation and subtle scale
  const hoverClasses = hoverEffect
    ? "hover:scale-[1.02] hover:shadow-[0_25px_50px_rgba(0,0,0,0.25)]"
    : "";

  return (
    <div
      className={`
        relative
        rounded-xl
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        backdrop-blur-md
        p-6
        transition-transform transition-shadow duration-300 ease-in-out
        ${elevationClasses[elevation]} 
        ${hoverClasses}
        ${lightingOffsets[lighting]}
        ${className}
      `}
    >
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
