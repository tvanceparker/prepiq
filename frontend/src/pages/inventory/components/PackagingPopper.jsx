import React from "react";
import {
  Popper,
  Paper,
  Typography,
  Button,
  Box,
  Stack,
  Grow,
  ClickAwayListener,
} from "@mui/material";
import QuantityChip from "./QuantityChip";

const PackagingPopper = ({
  anchorEl,
  lots,
  batchRecipeId,
  onClose,
  onChipClick,
}) => {
  const open = Boolean(anchorEl);
  const id = open ? "packaging-popper" : undefined;

  return (
    <Popper
      id={id}
      open={open}
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ zIndex: 1300 }}
      transition
    >
      {({ TransitionProps }) => (
        <ClickAwayListener onClickAway={onClose}>
          <Grow {...TransitionProps} timeout={200}>
            {/* The child of Grow MUST be a single DOM element */}
            <Box
              sx={{
                p: 3,
                maxWidth: 420,
                boxShadow: 6,
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
              elevation={4}
              ref={TransitionProps.ref} // forward the ref here
            >
              <Typography variant="h6" mb={2}>
                Packaging Breakdown
              </Typography>
              {lots.length === 0 ? (
                <Typography>No packaging info available</Typography>
              ) : (
                lots.map((lot) => (
                  <Box
                    key={lot.lot_id}
                    sx={{ mb: 3, borderBottom: "1px solid #ddd", pb: 1 }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Lot #{lot.lot_id} -{" "}
                      {batchRecipeId ? "Made on" : "Delivered"}:{" "}
                      {lot.delivery_date}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                      <QuantityChip
                        label="Qty"
                        quantity={lot.quantity}
                        type="added"
                        onClick={(e) => onChipClick(e, lot.lot_id, "added")}
                      />
                      <QuantityChip
                        label="Used"
                        quantity={lot.used_quantity}
                        type="used"
                        onClick={(e) => onChipClick(e, lot.lot_id, "used")}
                      />
                      <QuantityChip
                        label="Wasted"
                        quantity={lot.wasted_quantity}
                        type="wasted"
                        onClick={(e) => onChipClick(e, lot.lot_id, "wasted")}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Remaining: {lot.remaining_quantity} {lot.supplier_unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Approx. Packages Remaining:{" "}
                      {lot.approx_packages_remaining}
                    </Typography>
                  </Box>
                ))
              )}
              <Box textAlign="right" mt={2}>
                <Button size="small" variant="outlined" onClick={onClose}>
                  Close
                </Button>
              </Box>
            </Box>
          </Grow>
        </ClickAwayListener>
      )}
    </Popper>
  );
};

export default PackagingPopper;
