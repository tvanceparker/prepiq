// src/interfaces/table.ts
import type React from 'react';

export interface TableColumn<T = any> {
  key: keyof T & string;
  label: React.ReactNode;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableShellProps<T = any> {
  columns: Array<TableColumn<T>>;
  data: T[];
  defaultSortKey?: (keyof T & string) | null;
  defaultSortOrder?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  maxHeight?: number;
  searchable?: boolean;
  showCheckboxes?: boolean;
}

export interface CheckboxProps {
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
}
