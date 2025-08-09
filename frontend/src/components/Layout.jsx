import React, { useState, useEffect, useRef, useContext } from "react";
import Sidebar from "./Sidebar";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import useAlertCount from "../hooks/useAlertCount";

import {
  Notifications as BellIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Button,
  Drawer,
  Box,
  useTheme,
  Tooltip,
} from "@mui/material";

export default function Layout({ children, tier }) {
  const { theme, setTheme, user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  // Alert count hook
  const { count: alertsCount, loading: alertsLoading } = useAlertCount();

  // Toggle sidebar drawer
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Navigate to alerts feed
  const goToAlertsFeed = () => navigate("/dashboard/alerts");

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const currentY = scrollEl.scrollTop;
      const diff = currentY - lastScrollY;

      if (Math.abs(diff) > 5) {
        setShowHeader(diff < 0);
        setShowFooter(diff < 0);
        setLastScrollY(currentY);
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const formattedDate = dateTime.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = dateTime.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const muiTheme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Sidebar Drawer for mobile */}
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={closeSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: 260,
            bgcolor: "background.paper",
            borderRight: `1px solid ${muiTheme.palette.divider}`,
          },
        }}
      >
        <Sidebar closeSidebar={closeSidebar} tier={tier} />
      </Drawer>

      {/* Persistent sidebar on desktop */}
      <Box
        component="nav"
        sx={{
          width: { sm: 260 },
          flexShrink: { sm: 0 },
          display: { xs: "none", sm: "block" },
          bgcolor: "background.paper",
          borderRight: `1px solid ${muiTheme.palette.divider}`,
          position: "fixed", // fix position so it layers independently
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: muiTheme.zIndex.appBar + 1, // higher than header's z-index
        }}
      >
        <Sidebar tier={tier} />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <AppBar
          position="fixed"
          color="background.paper"
          elevation={showHeader ? 4 : 0}
          sx={{
            height: 80,
            transition: "transform 0.3s ease",
            transform: showHeader ? "translateY(0)" : "translateY(-100%)",
            borderBottom: `1px solid ${muiTheme.palette.divider}`,
            pl: { sm: 32.5 }, // 260px sidebar + padding
          }}
        >
          <Toolbar
            sx={{ height: "100%", px: 3, justifyContent: "space-between" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Sidebar toggle for mobile */}
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={toggleSidebar}
                sx={{ mr: 2, display: { sm: "none" } }}
              >
                <MenuIcon />
              </IconButton>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {formattedDate}
                </Typography>
                <Typography variant="h6" fontWeight="bold" lineHeight={1}>
                  {formattedTime}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                minWidth: 300,
                overflowX: "auto",
              }}
            >
              <Tooltip title="View Alerts & Insights Feed">
                <Button
                  variant="contained"
                  color="error"
                  startIcon={
                    <Badge
                      badgeContent={alertsLoading ? "…" : alertsCount}
                      color="warning"
                    >
                      <BellIcon />
                    </Badge>
                  }
                  onClick={goToAlertsFeed}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Alerts
                </Button>
              </Tooltip>

              <Typography
                variant="body2"
                noWrap
                sx={{ flexShrink: 0, display: { xs: "none", sm: "block" } }}
              >
                Logged in as{" "}
                <strong>{user?.name || user?.username || "Unknown"}</strong>
              </Typography>

              <Tooltip title="Logout">
                <IconButton color="error" onClick={handleLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Scrollable content */}
        <Box
          ref={scrollRef}
          sx={{
            flexGrow: 1,
            pt: "80px",
            pb: "56px",
            px: 3,
            ml: { sm: "260px" },
            overflowY: "auto",
          }}
        >
          {children}
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            height: 56,
            bgcolor: "background.paper",
            borderTop: `1px solid ${muiTheme.palette.divider}`,
            textAlign: "center",
            fontSize: "0.75rem",
            color: "text.secondary",
            lineHeight: 1.5,
            position: "fixed",
            bottom: 0,
            left: { sm: "260px" },
            right: 0,
            zIndex: muiTheme.zIndex.appBar,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.3s ease",
            transform: showFooter ? "translateY(0)" : "translateY(100%)",
          }}
        >
          <span>
            PrepIQ © {new Date().getFullYear()} — Built with ❤️ by Taylor and
            Will
          </span>

          {process.env.NODE_ENV === "development" && (
            <Button
              variant="outlined"
              size="small"
              onClick={toggleTheme}
              sx={{
                position: "absolute",
                right: 16,
                bottom: 8,
              }}
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
