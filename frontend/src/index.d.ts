// Ensure MUI theme typings include palette extensions used in the app
import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    success: Palette['primary'];
    warning: Palette['primary'];
    error: Palette['primary'];
    info: Palette['primary'];
  }
  interface PaletteOptions {
    success?: PaletteOptions['primary'];
    warning?: PaletteOptions['primary'];
    error?: PaletteOptions['primary'];
    info?: PaletteOptions['primary'];
  }
}
