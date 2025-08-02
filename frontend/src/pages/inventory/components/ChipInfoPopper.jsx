import React from "react";
import {
  Popper,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Button,
  Fade,
  ClickAwayListener,
} from "@mui/material";
import {
  useLotInfo,
  useUsedUsageLogs,
  useWastedUsageLogs,
} from "../hooks/useInventoryTable";

const ChipInfoPopper = ({ anchorEl, lotId, type, open, onClose }) => {
  const { lotInfo, loading: loadingLot } = useLotInfo(
    type === "added" ? lotId : null
  );
  const { usedLogs, loading: loadingUsed } = useUsedUsageLogs(
    type === "used" ? lotId : null
  );
  const { wastedLogs, loading: loadingWasted } = useWastedUsageLogs(
    type === "wasted" ? lotId : null
  );

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="right-start"
      style={{ zIndex: 1400 }}
      transition
    >
      {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={onClose}>
        <Fade {...TransitionProps} timeout={200}>
            <Paper
              sx={{
                p: 3,
                maxWidth: 360,
                boxShadow: 6,
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
              elevation={4}
            >
              {type === "added" && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Supplier Info
                  </Typography>
                  {loadingLot ? (
                    <CircularProgress size={24} />
                  ) : lotInfo ? (
                    <>
                      <Typography variant="body2" gutterBottom>
                        <strong>Supplier:</strong>{" "}
                        {lotInfo?.supplier?.supplier_name}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Packs:</strong>{" "}
                        {lotInfo?.supplier?.pack_description}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Cost/Unit:</strong> $
                        {lotInfo?.supplier?.cost_per_unit}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Status:</strong> {lotInfo?.status}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Spoilage Expected:</strong>{" "}
                        {lotInfo?.spoilage_expected_date}
                      </Typography>
                    </>
                  ) : (
                    <Typography>No supplier info available.</Typography>
                  )}
                </Box>
              )}

              {type === "used" && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Used Logs
                  </Typography>
                  {loadingUsed ? (
                    <CircularProgress size={24} />
                  ) : usedLogs.length ? (
                    usedLogs.map((log) => (
                      <Box
                        key={log.usage_id}
                        mb={2}
                        sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}
                      >
                        <Typography variant="body2">
                          <strong>Date:</strong> {log.used_date}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Qty Used:</strong> {log.used_quantity}{" "}
                          {log.unit}
                        </Typography>
                        <Typography variant="body2">
                          <strong>From:</strong> {log.usage_type}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography>No usage logs available.</Typography>
                  )}
                </Box>
              )}

              {type === "wasted" && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Waste Logs
                  </Typography>
                  {loadingWasted ? (
                    <CircularProgress size={24} />
                  ) : wastedLogs.length ? (
                    wastedLogs.map((log) => (
                      <Box
                        key={log.usage_id}
                        mb={2}
                        sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}
                      >
                        <Typography variant="body2">
                          <strong>Date:</strong> {log.used_date}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Qty Wasted:</strong> {log.used_quantity}{" "}
                          {log.unit}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Reason:</strong> {log.usage_type}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography>No waste logs available.</Typography>
                  )}
                </Box>
              )}

              <Box mt={2} textAlign="right">
                <Button size="small" variant="outlined" onClick={onClose}>
                  Close
                </Button>
              </Box>
            </Paper>
        </Fade>
          </ClickAwayListener>
      )}
    </Popper>
  );
};

export default ChipInfoPopper;
