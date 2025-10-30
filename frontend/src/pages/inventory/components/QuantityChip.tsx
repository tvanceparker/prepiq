import React from 'react';
import { Chip } from '@mui/material';

type ChipType = 'added' | 'used' | 'wasted';

const colorMap: Record<ChipType, 'success' | 'error' | 'warning'> = {
  added: 'success',
  used: 'error',
  wasted: 'warning',
};

interface QuantityChipProps {
  label: string;
  quantity: number;
  type: ChipType;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const QuantityChip: React.FC<QuantityChipProps> = ({ label, quantity, type, onClick }) => (
  <Chip
    label={`${label}: ${quantity}`}
    color={colorMap[type]}
    size="small"
    sx={{ marginRight: 1, cursor: 'pointer' }}
    onClick={onClick}
  />
);

export default QuantityChip;
