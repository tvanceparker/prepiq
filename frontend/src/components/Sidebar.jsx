import React, { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import { sidebarDataByTier } from "./data/sidebarData";
import { AuthContext } from "../contexts/AuthContext";

import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

export default function Sidebar({ tier }) {
  const [openSections, setOpenSections] = useState({});
  const { permissions = [] } = useContext(AuthContext);
  const theme = useTheme();

  if (!tier) return null;

  const sidebarData = sidebarDataByTier[tier] || [];

  const toggleSection = (label) => {
    setOpenSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <Box
      sx={{
        width: 260,
        height: "100vh",
        bgcolor: "background.paper",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${theme.palette.divider}`,
        p: 2,
        boxSizing: "border-box",
      }}
    >
      {/* Branding */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 3,
          userSelect: "none",
          gap: 2,
          px: 1,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: "primary.main",
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "primary.contrastText",
            fontWeight: "bold",
            fontSize: "1.25rem",
            boxShadow: theme.shadows[2],
            flexShrink: 0,
            transition: "background-color 0.3s ease",
          }}
        >
          PIQ
        </Box>
        <Typography
          variant="h6"
          fontWeight="bold"
          noWrap
          sx={{ userSelect: "none", color: "text.primary" }}
        >
          PrepIQ
        </Typography>
      </Box>

      <Divider sx={{ mb: 1 }} />

      {/* Sidebar Sections */}
      <List
        component="nav"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          mt: 1,
          // Custom scrollbar for webkit browsers
          scrollbarWidth: "thin",
          scrollbarColor: `${theme.palette.primary.light} transparent`,
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.primary.light,
            borderRadius: 3,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
        }}
        disablePadding
      >
        {sidebarData.map((section) => {
          const filteredChildren = section.children?.filter(
            (child) =>
              !child.permission || permissions.includes(child.permission)
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
                  "&:hover": { bgcolor: theme.palette.action.hover },
                  "&.Mui-focusVisible": {
                    bgcolor: theme.palette.action.selected,
                  },
                }}
                aria-expanded={isOpen}
                aria-controls={`${section.label}-list`}
              >
                <ListItemText
                  primary={
                    <Typography
                      fontWeight="medium"
                      color="text.primary"
                      sx={{ userSelect: "none" }}
                    >
                      {section.label}
                    </Typography>
                  }
                />
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse
                in={isOpen}
                timeout="auto"
                unmountOnExit
                id={`${section.label}-list`}
              >
                <List component="div" disablePadding sx={{ pl: 3 }}>
                  {filteredChildren.map((child) => (
                    <ListItemButton
                      key={child.path}
                      component={NavLink}
                      to={child.path}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        color: "text.secondary",
                        px: 2,
                        "&.active": {
                          bgcolor: "primary.light",
                          color: "primary.main",
                          fontWeight: "bold",
                        },
                        "&:hover": {
                          bgcolor: theme.palette.action.hover,
                          color: "primary.main",
                        },
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
    </Box>
  );
}
