import React, { useContext } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { AuthContext } from '../contexts/AuthContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useContext(AuthContext) as any;

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton onClick={toggleTheme} color="inherit">
        {theme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
      </IconButton>
    </Tooltip>
  );
}
