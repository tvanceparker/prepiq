/** @jsxImportSource @emotion/react */
import React, { useEffect, useState } from "react";
import { css, useTheme } from "@emotion/react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

export default function ModalBase({
  visible,
  onClose,
  onExited,
  title,
  onSave,
  onDelete,
  saveDisabled = false,
  confirmDelete,
  setConfirmDelete,
  children,
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(visible);

  useEffect(() => {
    if (visible) setOpen(true);
    else setOpen(false);
  }, [visible]);

  // Call onExited when dialog fully closes
  const handleExited = () => {
    onExited?.();
  };

  // Handle delete button logic with confirmation
  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    } else {
      onDelete?.();
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onExited={handleExited}
      aria-labelledby="modal-title"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        css: css`
          background-color: ${theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : theme.palette.background.default};
          border-radius: 16px;
          border: 1px solid ${theme.palette.divider};
          padding: 24px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: ${theme.shadows[5]};
        `,
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
        },
      }}
    >
      <DialogTitle
        id="modal-title"
        css={css`
          font-weight: 600;
          color: ${theme.palette.text.primary};
        `}
      >
        {title}
      </DialogTitle>

      <DialogContent
        dividers
        css={css`
          margin-bottom: 24px;
          color: ${theme.palette.text.primary};
        `}
      >
        {children}
      </DialogContent>

      <DialogActions
        css={css`
          justify-content: flex-end;
          gap: 12px;
        `}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? theme.palette.action.hover
                  : theme.palette.grey[100],
            },
          }}
        >
          Cancel
        </Button>

        {onDelete && (
          <Button
            onClick={handleDeleteClick}
            variant="contained"
            sx={{
              bgcolor: confirmDelete
                ? theme.palette.error.dark
                : theme.palette.error.main,
              "&:hover": {
                bgcolor: confirmDelete
                  ? theme.palette.error.darker
                  : theme.palette.error.dark,
              },
              color: theme.palette.common.white,
            }}
          >
            {confirmDelete ? "Confirm Delete" : "Delete"}
          </Button>
        )}

        {onSave && (
          <Button
            onClick={onSave}
            disabled={saveDisabled}
            variant="contained"
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": {
                bgcolor: theme.palette.primary.dark,
              },
              "&.Mui-disabled": {
                opacity: 0.5,
                cursor: "not-allowed",
                bgcolor: theme.palette.primary.main,
              },
            }}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
