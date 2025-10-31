// src/interfaces/dashboard.ts
import type { AlertColor } from '@mui/material';

export interface MenuItemDTO {
  menu_item_id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SummaryCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  color: string;
  icon: React.ReactElement;
}

export interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData: any;
  categories?: any[];
}

export interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

export interface DashboardFormState {
  menuItems: MenuItemDTO[];
  loading: boolean;
  error: Error | null;
  addItem: (item: Partial<MenuItemDTO>) => Promise<unknown>;
  editItem: (id: number, data: Partial<MenuItemDTO>) => Promise<unknown>;
  removeItem: (id: number) => Promise<unknown>;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}
