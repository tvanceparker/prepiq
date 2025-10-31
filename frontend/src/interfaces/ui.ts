// src/interfaces/ui.ts
import type React from 'react';
import type { AlertColor } from '@mui/material';

export interface PageHeaderProps {
  title: string;
  sx?: Record<string, any>;
}

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export interface LabelWithTipProps {
  label: React.ReactNode;
  tipContent: React.ReactNode;
  className?: string;
}

export interface FormRowProps {
  label: React.ReactNode;
  type?: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => void;
  name: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  step?: number | string;
  min?: number | string;
  max?: number | string;
  error?: string;
  children?: React.ReactNode;
  toggleLabel?: React.ReactNode;
  toggleChecked?: boolean;
  onToggleChange?: (e: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  toggleClassName?: string;
}

export interface DateSelectorProps {
  label?: string;
  startDate: Date;
  endDate?: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange?: (date: Date) => void;
  mode?: 'range' | 'single';
  direction?: 'forward' | 'backward';
  sx?: Record<string, any>;
  disableFuture?: boolean;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

export interface FilterItem {
  id: string | number;
  name: string;
}

export interface FilterButtonsProps {
  items: FilterItem[];
  selectedItems: Array<string | number>;
  setSelectedItems: (items: Array<string | number>) => void;
  label?: string;
  allLabel?: string;
}

export interface HintBoxProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  link?: {
    href: string;
    label: string;
  };
}

export interface TagInputProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export interface AnimatedCollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export interface InlineField {
  label: string;
  value: React.ReactNode;
}

export interface InlineFieldDisplayProps {
  fields?: InlineField[];
}
