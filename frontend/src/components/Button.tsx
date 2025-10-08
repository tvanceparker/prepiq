import React, { useState, useContext, useMemo, useCallback } from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../interfaces/auth';

type StylableIconElement = React.ReactElement<{ sx?: SxProps<Theme> }>;
type VariantWithIcon = 'edit' | 'delete' | 'file' | 'confirm' | 'cancel' | 'create';

const variantIconMapping: Record<VariantWithIcon, StylableIconElement> = {
  edit: <EditIcon fontSize="small" />,
  delete: <DeleteIcon fontSize="small" />,
  file: <FileDownloadIcon fontSize="small" />,
  confirm: <CheckIcon fontSize="small" />,
  cancel: <CancelIcon fontSize="small" />,
  create: <AddIcon fontSize="small" />,
};

export type CustomVariant =
  | VariantWithIcon
  | 'clearFilter'
  | 'default'
  | 'clear'
  | 'contained'
  | 'outlined'
  | 'text';

const variantColorMapping: Record<CustomVariant | 'default', MuiButtonProps['color']> = {
  edit: 'primary',
  confirm: 'success',
  delete: 'error',
  cancel: 'secondary',
  clearFilter: 'secondary',
  file: 'secondary',
  create: 'primary',
  clear: 'inherit',
  contained: 'primary',
  outlined: 'primary',
  text: 'inherit',
  default: 'inherit',
};

export interface ButtonProps
  extends Omit<MuiButtonProps, 'variant' | 'startIcon' | 'onClick' | 'size'> {
  muiVariant?: MuiButtonProps['variant'];
  variant?: CustomVariant;
  toggle?: boolean;
  toggleState?: boolean;
  toggleLabels?: [string, string];
  toggleVariants?: [CustomVariant, CustomVariant];
  onToggle?: (state: boolean) => void;
  requiredPermission?: string | null;
  hideIfNoPermission?: boolean;
  showIcon?: boolean;
  iconOnly?: boolean;
  startIcon?: React.ReactNode;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  color?: MuiButtonProps['color'];
  size?: MuiButtonProps['size'] | 'sm' | 'md' | 'lg';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const DEFAULT_TOGGLE_LABELS: [string, string] = ['On', 'Off'];
const DEFAULT_TOGGLE_VARIANTS: [CustomVariant, CustomVariant] = ['confirm', 'cancel'];

export default function Button({
  muiVariant,
  variant = 'default',
  children,
  onClick,
  disabled = false,
  type = 'button',
  toggle = false,
  toggleState = false,
  toggleLabels = DEFAULT_TOGGLE_LABELS,
  toggleVariants = DEFAULT_TOGGLE_VARIANTS,
  onToggle,
  requiredPermission = null,
  hideIfNoPermission = false,
  showIcon = true,
  startIcon,
  iconOnly = false,
  sx,
  color: colorOverride,
  size,
  ...props
}: ButtonProps): JSX.Element | null {
  const auth = useContext(AuthContext) as AuthContextType | null;
  const permissions = auth?.permissions ?? [];
  const [internalToggle, setInternalToggle] = useState<boolean>(toggleState);

  const hasPermission = !requiredPermission || permissions.includes(requiredPermission);
  const shouldHide = hideIfNoPermission && !hasPermission;

  const effectiveToggleState = toggle
    ? typeof toggleState === 'boolean'
      ? toggleState
      : internalToggle
    : false;

  const resolvedMuiVariant = useMemo<MuiButtonProps['variant']>(() => {
    if (muiVariant) return muiVariant;
    if (variant === 'clear') return 'text';
    if (variant === 'contained' || variant === 'outlined' || variant === 'text') {
      return variant;
    }
    return 'contained';
  }, [muiVariant, variant]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || !hasPermission) return;

      if (toggle) {
        if (typeof toggleState === 'boolean') {
          onToggle?.(!toggleState);
        } else {
          setInternalToggle(prev => {
            const next = !prev;
            onToggle?.(next);
            return next;
          });
        }
      }

      onClick?.(event);
    },
    [disabled, hasPermission, onClick, onToggle, toggle, toggleState]
  );

  const computedColor = useMemo(() => {
    if (toggle) {
      const variantKey = toggleVariants[effectiveToggleState ? 0 : 1];
      return variantColorMapping[variantKey] || 'primary';
    }
    return variantColorMapping[variant] || 'inherit';
  }, [effectiveToggleState, toggle, toggleVariants, variant]);

  const color = colorOverride ?? computedColor;

  const normalizedSize = useMemo<MuiButtonProps['size'] | undefined>(() => {
    if (!size) return undefined;
    if (size === 'sm') return 'small';
    if (size === 'md') return 'medium';
    if (size === 'lg') return 'large';
    return size;
  }, [size]);

  const iconElement = useMemo<React.ReactNode>(() => {
    if (toggle || !showIcon) return null;

    if (startIcon) {
      return startIcon;
    }

    return variantIconMapping[variant as VariantWithIcon] ?? null;
  }, [showIcon, startIcon, toggle, variant]);

  const mergedSx = useMemo<SxProps<Theme>>(() => {
    const base: SxProps<Theme> = {
      textTransform: 'none',
      boxShadow: resolvedMuiVariant === 'contained' ? 3 : 'none',
      '&:active': {
        transform: 'scale(0.97)',
        boxShadow: 'none',
      },
      minWidth: iconOnly ? 40 : undefined,
      padding: iconOnly ? '6px' : undefined,
    };

    if (!sx) return base;
    return Array.isArray(sx) ? [base, ...sx] : [base, sx];
  }, [iconOnly, resolvedMuiVariant, sx]);

  const label = iconOnly
    ? iconElement
    : toggle
      ? toggleLabels[effectiveToggleState ? 0 : 1]
      : children;

  if (shouldHide) {
    return null;
  }

  return (
    <MuiButton
      variant={resolvedMuiVariant}
      type={type}
      onClick={handleClick}
      disabled={disabled || !hasPermission}
      color={color}
      startIcon={iconOnly ? null : iconElement}
      size={normalizedSize}
      sx={mergedSx}
      {...props}
    >
      {label}
    </MuiButton>
  );
}
