import React, { useState, useContext } from "react";
import Button from "@mui/material/Button";
import { AuthContext } from "../contexts/AuthContext";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

// Optional: Map variant to icon (no margin here, margin handled dynamically)
const variantIconMapping = {
  edit: <EditIcon fontSize="small" />,
  delete: <DeleteIcon fontSize="small" />,
  file: <FileDownloadIcon fontSize="small" />,
  confirm: <CheckIcon fontSize="small" />,
  cancel: <CancelIcon fontSize="small" />,
  create: <AddIcon fontSize="small" />,
};

const variantColorMapping = {
  edit: "primary",
  confirm: "success",
  delete: "error",
  cancel: "secondary",
  clearFilter: "secondary",
  file: "secondary",
  default: "inherit",
};

export default function MuiButton({
  muiVariant = "contained", // corresponds to MUI Button variant prop
  variant = "default", // your custom variant to pick icon and color mapping
  children,
  onClick,
  disabled = false,
  type = "button",
  toggle = false,
  toggleState = false,
  toggleLabels = ["On", "Off"],
  toggleVariants = ["confirm", "cancel"],
  onToggle,
  requiredPermission = null,
  hideIfNoPermission = false,
  showIcon = true,
  startIcon,
  iconOnly = false, // new prop to indicate icon-only button
  sx = {},
  ...props
}: any) {
  const { permissions } = useContext(AuthContext);
  const [internalToggle, setInternalToggle] = useState(toggleState);

  const hasPermission =
    !requiredPermission || permissions.includes(requiredPermission);

  if (hideIfNoPermission && !hasPermission) {
    return null;
  }

  const isToggled = toggle
    ? typeof toggleState === "boolean"
      ? toggleState
      : internalToggle
    : false;

  const handleClick = (e) => {
    if (disabled || !hasPermission) return;

    if (toggle) {
      const newToggleState = !isToggled;
      if (onToggle) {
        onToggle(newToggleState);
      } else {
        setInternalToggle(newToggleState);
      }
    }

    if (onClick) onClick(e);
  };

  const color = toggle
    ? variantColorMapping[toggleVariants[isToggled ? 0 : 1]] || "primary"
    : variantColorMapping[variant] || "inherit";

  // Handle icon styling based on iconOnly flag and showIcon flag
  let icon = null;
  if (!toggle && showIcon) {
    if (startIcon) {
      icon = React.cloneElement(startIcon, {
        sx: iconOnly ? {} : { mr: 1 },
      });
    } else if (variantIconMapping[variant]) {
      icon = React.cloneElement(variantIconMapping[variant], {
        sx: iconOnly ? {} : { mr: 1 },
      });
    }
  }

  return (
    <Button
      variant={muiVariant}
      type={type}
      onClick={handleClick}
      disabled={disabled || !hasPermission}
      color={color}
      startIcon={iconOnly ? null : icon}
      sx={{
        textTransform: "none",
        boxShadow: muiVariant === "contained" ? 3 : "none",
        "&:active": {
          transform: "scale(0.97)",
          boxShadow: "none",
        },
        minWidth: iconOnly ? 40 : undefined,
        padding: iconOnly ? "6px" : undefined,
        ...sx,
      }}
      {...props}
    >
      {iconOnly ? icon : toggle ? toggleLabels[isToggled ? 0 : 1] : children}
    </Button>
  );
}


// import Button from "../../../components/Button";

// ✅ Basic button with text only (default variant, default MUI style)
// <Button>Save</Button>

// ✅ Contained button with a custom color/icon using variant mapping
// <Button muiVariant="contained" variant="edit">Edit</Button>

// ✅ Outlined button with icon + text
// <Button muiVariant="outlined" variant="delete">Delete</Button>

 // ✅ Text button with icon only
// <Button muiVariant="text" variant="file" iconOnly />

 // ✅ Button with custom icon passed directly (overrides `variant` mapping)
// import StarIcon from '@mui/icons-material/Star';
// <Button muiVariant="contained" startIcon={<StarIcon />}>Favorite</Button>

// ✅ Toggle button (changes state on click)
// <Button
//   toggle
//   toggleState={true} // initial state
//   toggleLabels={["On", "Off"]}
//   toggleVariants={["confirm", "cancel"]}
// />

// ✅ Toggle-only icon button
// <Button
//   toggle
//   iconOnly
//   toggleLabels={["On", "Off"]}
//   toggleVariants={["confirm", "cancel"]}
// />

// ✅ Button hidden if user lacks permission
// <Button
//   requiredPermission="admin:view"
//   hideIfNoPermission
// >
//   Admin View
// </Button>

// ✅ Disabled button
// <Button disabled variant="edit">Disabled</Button>

// ✅ Button with custom styles
// <Button sx={{ backgroundColor: 'black', color: 'white' }}>
//   Custom Style
// </Button>
