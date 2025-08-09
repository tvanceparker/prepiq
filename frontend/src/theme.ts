import { createTheme } from "@mui/material/styles";

const defaultTheme = createTheme();

const getTheme = (mode: "light" | "dark" = "light") =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: {
              main: "#1976d2",
              light: "#63a4ff",
              dark: "#004ba0",
              contrastText: "#fff",
            },
            secondary: {
              main: "#9c27b0",
              light: "#d05ce3",
              dark: "#6a0080",
              contrastText: "#fff",
            },
            success: {
              main: "#2e7d32",
              light: "#60ad5e",
              dark: "#005005",
              contrastText: "#fff",
            },
            warning: {
              main: "#ed6c02",
              light: "#ff9800",
              dark: "#e65100",
              contrastText: "#000",
            },
            error: {
              main: "#d32f2f",
              light: "#ef5350",
              dark: "#c62828",
              contrastText: "#fff",
            },
            info: {
              main: "#0288d1",
              light: "#03a9f4",
              dark: "#01579b",
              contrastText: "#fff",
            },
            background: {
              default: "#f4f6f8",
              paper: "#fff",
            },
            text: {
              primary: "#222222",
              secondary: "#555555",
            },
          }
        : {
            primary: {
              main: "#90caf9",
              light: "#e3f2fd",
              dark: "#42a5f5",
              contrastText: "#000",
            },
            secondary: {
              main: "#ce93d8",
              light: "#f3e5f5",
              dark: "#ab47bc",
              contrastText: "#000",
            },
            success: {
              main: "#81c784",
              light: "#a5d6a7",
              dark: "#388e3c",
              contrastText: "#000",
            },
            warning: {
              main: "#ffb74d",
              light: "#ffe0b2",
              dark: "#f57c00",
              contrastText: "#000",
            },
            error: {
              main: "#e57373",
              light: "#ffcdd2",
              dark: "#d32f2f",
              contrastText: "#000",
            },
            info: {
              main: "#64b5f6",
              light: "#bbdefb",
              dark: "#1976d2",
              contrastText: "#000",
            },
            background: {
              default: "#121212",
              paper: "#1d1d1d",
            },
            text: {
              primary: "#fff",
              secondary: "#bbb",
            },
          }),
    },

    typography: {
      fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h1: {
        fontWeight: 600,
        fontSize: "3.5rem",
        lineHeight: 1.2,
        letterSpacing: "-0.5px",
      },
      h2: {
        fontWeight: 600,
        fontSize: "2.5rem",
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: "2rem",
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 500,
        fontSize: "1.5rem",
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 500,
        fontSize: "1.25rem",
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 500,
        fontSize: "1.125rem",
        lineHeight: 1.6,
      },
      body1: {
        fontWeight: 400,
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body2: {
        fontWeight: 400,
        fontSize: "0.875rem",
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 500,
        textTransform: "none",
      },
      subtitle1: {
        fontWeight: 400,
        fontSize: "1rem",
        lineHeight: 1.4,
      },
      subtitle2: {
        fontWeight: 400,
        fontSize: "0.875rem",
        lineHeight: 1.4,
      },
    },

    shape: {
      borderRadius: 8,
    },

    spacing: 8,

    shadows:
      mode === "dark"
        ? ([
            "none",
            "0px 1px 2px rgba(0,0,0,0.2), 0px 1px 3px rgba(0,0,0,0.14)",
            "0px 1px 2px rgba(0,0,0,0.2), 0px 1px 3px rgba(0,0,0,0.14)",
            "0px 1px 2px rgba(0,0,0,0.2), 0px 1px 3px rgba(0,0,0,0.14)",
            "0px 2px 4px rgba(0,0,0,0.2)",
            "0px 3px 5px rgba(0,0,0,0.2)",
            "0px 4px 6px rgba(0,0,0,0.2)",
            "0px 5px 7px rgba(0,0,0,0.2)",
            "0px 6px 8px rgba(0,0,0,0.2)",
            "0px 7px 9px rgba(0,0,0,0.2)",
            "0px 8px 10px rgba(0,0,0,0.2)",
            "0px 9px 11px rgba(0,0,0,0.2)",
            "0px 10px 12px rgba(0,0,0,0.2)",
            "0px 11px 13px rgba(0,0,0,0.2)",
            "0px 12px 14px rgba(0,0,0,0.2)",
            "0px 13px 15px rgba(0,0,0,0.2)",
            "0px 14px 16px rgba(0,0,0,0.2)",
            "0px 15px 17px rgba(0,0,0,0.2)",
            "0px 16px 18px rgba(0,0,0,0.2)",
            "0px 17px 19px rgba(0,0,0,0.2)",
            "0px 18px 20px rgba(0,0,0,0.2)",
            "0px 19px 21px rgba(0,0,0,0.2)",
            "0px 20px 22px rgba(0,0,0,0.2)",
            "0px 21px 23px rgba(0,0,0,0.2)",
            "0px 22px 24px rgba(0,0,0,0.2)",
          ] as unknown as typeof defaultTheme.shadows)
        : defaultTheme.shadows,

    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.1s ease-in-out",
            padding: "8px 16px",
            "&:active": {
              transform: "scale(0.97)",
              boxShadow: "none",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            ...(mode === "dark" && {
              backgroundColor: "#1d1d1d",
              boxShadow: "0 4px 8px rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            minHeight: 140,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            ...(mode === "dark" && {
              backgroundColor: "#1d1d1d",
              boxShadow: "0 4px 8px rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }),
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            marginBottom: "16px",
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
            },
            "& .MuiOutlinedInput-input": {
              padding: "12px 16px",
              fontSize: "1rem",
              height: "auto",
              display: "flex",
              alignItems: "center",
            },
            "& .MuiInputLabel-root": {
              fontWeight: 400,
            },
          },
        },
      },

      MuiTypography: {
        styleOverrides: {
          root: {
            marginBottom: "8px",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            backgroundColor: mode === "dark" ? "#1d1d1d" : "#fff",
          },
        },
      },
      MuiGrid: {
        styleOverrides: {
          root: {
            margin: 0,
            padding: 0,
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            fontSize: "1rem",
            fontWeight: 500,
            color: mode === "dark" ? "#90caf9" : "#1976d2",
            textDecoration: "none",
            "&:hover": {
              textDecoration: "underline",
            },
          },
        },
      },
    },
  });

export default getTheme;
