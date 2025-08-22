import React, { useContext, useState, ReactNode } from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { ViewStyle } from 'react-native';
import { useApp } from '../state/AppContext';

type Props = {
  mode?: 'contained' | 'outlined' | 'text';
  variant?: string;
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  toggle?: boolean;
  toggleState?: boolean;
  toggleLabels?: [string, string];
  onToggle?: (v: boolean) => void;
  requiredPermission?: string | null;
  hideIfNoPermission?: boolean;
  iconOnly?: boolean;
  contentStyle?: ViewStyle;
};

const variantColorMapping: Record<string, string> = {
  edit: 'primary',
  confirm: 'green',
  delete: 'red',
  cancel: 'gray',
  file: 'gray',
};

export default function MuiButton({
  mode = 'contained',
  variant = 'default',
  children,
  onPress,
  disabled = false,
  toggle = false,
  toggleState,
  toggleLabels = ['On', 'Off'],
  onToggle,
  requiredPermission = null,
  hideIfNoPermission = false,
  iconOnly = false,
  contentStyle,
}: Props) {
  const { token } = useApp();
  const [internalToggle, setInternalToggle] = useState<boolean>(!!toggleState);

  const hasPermission = !requiredPermission || !!token; // simple stub — replace with proper permission check
  if (hideIfNoPermission && !hasPermission) return null;

  const isToggled = toggle
    ? typeof toggleState === 'boolean'
      ? toggleState
      : internalToggle
    : false;

  const handlePress = () => {
    if (disabled || !hasPermission) return;
    if (toggle) {
      const newV = !isToggled;
      if (onToggle) onToggle(newV);
      else setInternalToggle(newV);
    }
    if (onPress) onPress();
  };

  const color = variantColorMapping[variant] || undefined;

  return (
    <PaperButton
      mode={mode as any}
      onPress={handlePress}
      disabled={disabled || !hasPermission}
      contentStyle={contentStyle}
      buttonColor={color}
    >
      {iconOnly ? null : toggle ? toggleLabels[isToggled ? 0 : 1] : children}
    </PaperButton>
  );
}
