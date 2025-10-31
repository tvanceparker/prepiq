// src/interfaces/components.ts
import type React from 'react';

export type Elevation = 'sm' | 'md' | 'lg' | 'xl';
export type Lighting = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CardShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  elevation?: Elevation;
  hoverEffect?: boolean;
  lighting?: Lighting;
  className?: string;
}

export interface ModalBaseProps {
  visible: boolean;
  onClose: () => void;
  onExited?: () => void;
  title?: React.ReactNode;
  onSave?: () => void;
  onDelete?: () => void;
  saveDisabled?: boolean;
  confirmDelete?: boolean;
  setConfirmDelete?: (v: boolean) => void;
  children?: React.ReactNode;
}

export interface SidebarProps {
  tier: string | null;
}
