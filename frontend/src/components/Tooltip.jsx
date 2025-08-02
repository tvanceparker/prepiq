import React from "react";
import MuiTooltip from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";

const StyledTooltip = styled(MuiTooltip)(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    maxWidth: 256,
    fontSize: theme.typography.pxToRem(12),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[1],
    padding: "8px 12px",
    borderRadius: 6,
  },
  [`& .MuiTooltip-arrow`]: {
    color: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[1],
  },
}));

export default function Tooltip({ children, content, className = "" }) {
  return (
    <StyledTooltip
      title={content}
      arrow
      placement="top"
      enterDelay={300}
      leaveDelay={100}
      className={className}
      disableFocusListener={false}
      disableHoverListener={false}
      disableTouchListener={false}
    >
      <span tabIndex={0} style={{ display: "inline-block", cursor: "help" }}>
        {children}
      </span>
    </StyledTooltip>
  );
}
