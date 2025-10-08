import React, { useState, useEffect, useRef, useContext, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import useAlertCount from '../hooks/useAlertCount';
import type { AuthContextType } from '../interfaces/auth';

import {
  Notifications as BellIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
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
} from '@mui/material';

interface LayoutProps {
  children: ReactNode;
  tier: string | null;
}

export default function Layout({ children, tier }: LayoutProps): JSX.Element {
  const { theme, setTheme, user, logout } = useContext(AuthContext) as AuthContextType;
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const { count: alertsCount, loading: alertsLoading } = useAlertCount();

  const toggleSidebar = (): void => setSidebarOpen(prev => !prev);
  const closeSidebar = (): void => setSidebarOpen(false);

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  const goToAlertsFeed = (): void => navigate('/dashboard/alerts');

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = (): void => {
      const currentY = scrollEl.scrollTop;
      const diff = currentY - lastScrollY;

      if (Math.abs(diff) > 5) {
        const shouldShow = diff < 0;
        setShowHeader(shouldShow);
        setShowFooter(shouldShow);
        setLastScrollY(currentY);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll);
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const toggleTheme = (): void => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const formattedDate = dateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = dateTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const muiTheme = useTheme();
  const nameCandidate = typeof user?.name === 'string' ? user.name : undefined;
  const usernameCandidate = (() => {
    if (!user) return undefined;
    const maybeUsername = (user as Record<string, unknown>).username;
    return typeof maybeUsername === 'string' ? maybeUsername : undefined;
  })();
  const displayName = nameCandidate?.trim() || usernameCandidate?.trim() || 'Unknown';

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={closeSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: 260,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            boxShadow: 'none',
            borderRight: `1px solid ${muiTheme.palette.divider}`,
          },
        }}
      >
        <Sidebar tier={tier} />
      </Drawer>

      <Box
        component="nav"
        sx={{
          width: { sm: 260 },
          flexShrink: { sm: 0 },
          display: { xs: 'none', sm: 'block' },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRight: `1px solid ${muiTheme.palette.divider}`,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: muiTheme.zIndex.appBar + 1,
        }}
      >
        <Sidebar tier={tier} />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <AppBar
          position="fixed"
          elevation={showHeader ? 4 : 0}
          sx={{
            height: 80,
            transition: 'transform 0.3s ease',
            transform: showHeader ? 'translateY(0)' : 'translateY(-100%)',
            borderBottom: `1px solid ${muiTheme.palette.divider}`,
            pl: { sm: 32.5 },
            color: 'text.primary',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          }}
        >
          <Toolbar sx={{ height: '100%', px: 3, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={toggleSidebar}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>

              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ color: 'text.secondary' }}>
                  {formattedDate}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  lineHeight={1}
                  sx={{ color: 'text.primary' }}
                >
                  {formattedTime}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 300,
                overflowX: 'auto',
              }}
            >
              <Tooltip title="View Alerts & Insights Feed">
                <Button
                  variant="contained"
                  color="error"
                  startIcon={
                    <Badge badgeContent={alertsLoading ? '…' : alertsCount} color="warning">
                      <BellIcon />
                    </Badge>
                  }
                  onClick={goToAlertsFeed}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Alerts
                </Button>
              </Tooltip>

              <Typography
                variant="body2"
                component="span"
                noWrap
                sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' }, color: 'text.primary' }}
              >
                {'Logged in as '}
                <Box component="strong" display="inline" fontWeight="bold">
                  {displayName}
                </Box>
              </Typography>

              <Tooltip title="Logout">
                <IconButton color="error" onClick={handleLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          ref={scrollRef}
          sx={{
            flexGrow: 1,
            pt: '80px',
            pb: '56px',
            px: 3,
            ml: { sm: '260px' },
            overflowY: 'auto',
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>

        <Box
          component="footer"
          sx={{
            height: 56,
            bgcolor: 'background.paper',
            borderTop: `1px solid ${muiTheme.palette.divider}`,
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'text.secondary',
            lineHeight: 1.5,
            position: 'fixed',
            bottom: 0,
            left: { sm: '260px' },
            right: 0,
            zIndex: muiTheme.zIndex.appBar,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s ease',
            transform: showFooter ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <span>PrepIQ © {new Date().getFullYear()} — Built with ❤️ by Taylor and Will</span>

          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outlined"
              size="small"
              onClick={toggleTheme}
              sx={{
                position: 'absolute',
                right: 16,
                bottom: 8,
              }}
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
