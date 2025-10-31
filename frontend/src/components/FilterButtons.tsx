import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { FilterButtonsProps } from '../interfaces/ui';

const FilterButtons = ({
  items,
  selectedItems,
  setSelectedItems,
  label = 'Filter Items',
  allLabel = 'All Items',
}: FilterButtonsProps): JSX.Element => {
  const areAllSelected = (
    items: Array<{ id: string | number }>,
    selectedItems: Array<string | number>
  ) => items.length > 0 && items.every(item => selectedItems.includes(item.id));

  const handleToggle = (
    _event: React.MouseEvent<HTMLElement>,
    newSelected: Array<string | number>
  ) => {
    if (!newSelected) return;
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (areAllSelected(items, selectedItems)) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
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
          flexWrap: 'wrap',
          gap: 1,
          maxHeight: 192,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          padding: 1,
          backgroundColor: 'background.paper',
          boxShadow: 1,
        }}
      >
        <ToggleButton
          value="all"
          aria-pressed={areAllSelected(items, selectedItems)}
          onClick={toggleSelectAll}
          sx={{
            flexShrink: 0,
            bgcolor: areAllSelected(items, selectedItems) ? 'primary.main' : 'transparent',
            color: areAllSelected(items, selectedItems) ? 'primary.contrastText' : 'text.primary',
            borderColor: areAllSelected(items, selectedItems) ? 'primary.main' : 'divider',
            '&:hover': {
              bgcolor: areAllSelected(items, selectedItems) ? 'primary.dark' : 'action.hover',
            },
          }}
        >
          {allLabel}
        </ToggleButton>

        {items.map(({ id, name }) => {
          const selected = selectedItems.includes(id);
          return (
            <ToggleButton
              key={id}
              value={id}
              aria-pressed={selected}
              sx={{
                flexShrink: 0,
                bgcolor: selected ? 'primary.main' : 'transparent',
                color: selected ? 'primary.contrastText' : 'text.primary',
                borderColor: selected ? 'primary.main' : 'divider',
                '&:hover': {
                  bgcolor: selected ? 'primary.dark' : 'action.hover',
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
