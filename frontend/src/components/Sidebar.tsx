import React, { useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { sidebarDataByTier } from './data/sidebarData';
import { AuthContext } from '../contexts/AuthContext';
import {
  Box,
  List,
  Button,
  ListItemButton,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useDevice } from '../contexts/DeviceContext';
import { usePOS } from '../pages/pos/hooks/usePOS';
import { useRegistrationModal } from '../contexts/RegistrationModalContext';
import { isDedicatedDevice } from '../hooks/useDeviceDetection';
import type { SidebarProps } from '../interfaces/components';

export default function Sidebar({ tier }: SidebarProps): JSX.Element | null {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { permissions = [] } = useContext(AuthContext) as { permissions: string[] };
  const theme = useTheme();
  const deviceCtx = useDevice();
  const pos = usePOS();
  const registrationModal = useRegistrationModal();

  const dev = (deviceCtx as any)?.device;
  const isReg = (pos as any)?.isRegistered as boolean | undefined;
  const storageKey = dev ? `dismiss_register_${dev.device_id}` : null;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return !!(storageKey && localStorage.getItem(storageKey));
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    try {
      if (storageKey) localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (!tier) return null;
  const sidebarData = (sidebarDataByTier as any)[tier] || [];

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Box
      sx={{
        width: 260,
        height: '100vh',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        p: 2,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, userSelect: 'none', gap: 2, px: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'primary.contrastText',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            boxShadow: theme.shadows[2],
            flexShrink: 0,
            transition: 'background-color 0.3s ease',
          }}
        >
          PIQ
        </Box>
        <Typography
          variant="h6"
          fontWeight="bold"
          noWrap
          sx={{ userSelect: 'none', color: 'text.primary' }}
        >
          PrepIQ
        </Typography>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <List
        component="nav"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          mt: 1,
          bgcolor: 'transparent',
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.primary.light} transparent`,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.primary.light,
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        }}
        disablePadding
      >
        <Box sx={{ height: 8 }} />
        {sidebarData.map((section: any) => {
          const filteredChildren = section.children?.filter(
            (child: any) => !child.permission || permissions.includes(child.permission)
          );
          if (!filteredChildren || filteredChildren.length === 0) return null;
          const isOpen = !!openSections[section.label];

          return (
            <Box key={section.label} sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => toggleSection(section.label)}
                sx={{
                  px: 2,
                  borderRadius: 1,
                  '&:hover': { bgcolor: theme.palette.action.hover },
                  '&.Mui-focusVisible': { bgcolor: theme.palette.action.selected },
                }}
                aria-expanded={isOpen}
                aria-controls={`${section.label}-list`}
              >
                <ListItemText
                  primary={
                    <Typography
                      fontWeight="medium"
                      color="text.primary"
                      sx={{ userSelect: 'none' }}
                    >
                      {section.label}
                    </Typography>
                  }
                />
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={isOpen} timeout="auto" unmountOnExit id={`${section.label}-list`}>
                <List component="div" disablePadding sx={{ pl: 3 }}>
                  {filteredChildren.map((child: any) => (
                    <ListItemButton
                      key={child.path}
                      component={NavLink as any}
                      to={child.path}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        color: 'text.secondary',
                        px: 2,
                        '&.active': {
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          fontWeight: 'bold',
                        },
                        '&:hover': { bgcolor: theme.palette.action.hover, color: 'primary.main' },
                      }}
                    >
                      <ListItemText primary={child.name} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>

      {dev && !isReg && isDedicatedDevice(dev.type) && !dismissed && (
        <Box sx={{ px: 1, py: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              borderRadius: 1,
              bgcolor: 'background.paper',
              boxShadow: theme.shadows[1],
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="600" noWrap>
                Register this device
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Make this a dedicated POS / kitchen display
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() =>
                  registrationModal.openModal({
                    defaultName: dev?.userAgent || '',
                    deviceType: dev?.type,
                  })
                }
                sx={{ borderRadius: 1, textTransform: 'none', minWidth: 88 }}
              >
                Register
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={handleDismiss}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Dismiss
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
