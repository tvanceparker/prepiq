import React from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

const FilterButtons = ({
  items,
  selectedItems,
  setSelectedItems,
  label = "Filter Items",
  allLabel = "All Items",
}) => {
  // Helper to check if all items are selected
  const areAllSelected = (items, selectedItems) =>
    items.length > 0 && items.every((item) => selectedItems.includes(item.id));

  // Handle individual toggle (MUI passes array for multiple selection)
  const handleToggle = (event, newSelected) => {
    if (!newSelected) return; // Ignore if null
    setSelectedItems(newSelected);
  };

  // Handle select/deselect all
  const toggleSelectAll = () => {
    if (areAllSelected(items, selectedItems)) {
      setSelectedItems([]); // Deselect all
    } else {
      setSelectedItems(items.map((item) => item.id)); // Select all
    }
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <Typography variant="subtitle1" gutterBottom>
        {label}
      </Typography>
      <ToggleButtonGroup
        value={selectedItems}
        onChange={handleToggle}
        aria-label={`${label} selector`}
        size="small"
        sx={{
          flexWrap: "wrap",
          gap: 1,
          maxHeight: 192,
          overflowY: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          padding: 1,
          backgroundColor: "background.paper",
          boxShadow: 1,
        }}
      >
        {/* All Items button (not part of the ToggleButtonGroup so we handle separately) */}
        <ToggleButton
          value="all"
          aria-pressed={areAllSelected(items, selectedItems)}
          onClick={toggleSelectAll}
          sx={{
            flexShrink: 0,
            bgcolor: areAllSelected(items, selectedItems)
              ? "primary.main"
              : "transparent",
            color: areAllSelected(items, selectedItems)
              ? "primary.contrastText"
              : "text.primary",
            borderColor: areAllSelected(items, selectedItems)
              ? "primary.main"
              : "divider",
            "&:hover": {
              bgcolor: areAllSelected(items, selectedItems)
                ? "primary.dark"
                : "action.hover",
            },
          }}
        >
          {allLabel}
        </ToggleButton>

        {/* Individual items */}
        {items.map(({ id, name }) => {
          const selected = selectedItems.includes(id);
          return (
            <ToggleButton
              key={id}
              value={id}
              aria-pressed={selected}
              sx={{
                flexShrink: 0,
                bgcolor: selected ? "primary.main" : "transparent",
                color: selected ? "primary.contrastText" : "text.primary",
                borderColor: selected ? "primary.main" : "divider",
                "&:hover": {
                  bgcolor: selected ? "primary.dark" : "action.hover",
                },
              }}
            >
              {name}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
};

export default FilterButtons;
