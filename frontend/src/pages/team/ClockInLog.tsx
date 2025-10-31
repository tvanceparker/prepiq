import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import useClockIn from "./hooks/useClockIn";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";

const ClockInLog = () => {
  const { user } = useContext(AuthContext); // Get the logged-in user from context
  const employeeId = user?.employee_id; // Assuming employee_id is stored in user object
  const { shifts, clockEvents, error, clockInOut } = useClockIn(employeeId);
  const [selectedShift, setSelectedShift] = useState(null);

  // Check if the current shift is clocked in or not
  const latestOpenClockIn = clockEvents.find(
    (event) => event.clock_out === null
  );
  const isClockedIn = Boolean(latestOpenClockIn);



  const handleClockInOut = () => {
    clockInOut(!isClockedIn); // true = clock in, false = clock out
  };


  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: "center" }}>
        {error}
      </Typography>
    );
  }

  // Calculate total hours worked
  const calculateTotalHours = () => {
    let totalHours = 0;
    clockEvents.forEach((event) => {
      if (event.clock_in && event.clock_out) {
        const clockInTime = new Date(event.clock_in).getTime();
        const clockOutTime = new Date(event.clock_out).getTime();
        totalHours += (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
      }
    });
    return totalHours.toFixed(2);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Clock In/Out
      </Typography>

      {/* Clock In/Out Button */}
      <Box sx={{ marginBottom: 2 }}>
        <Typography variant="h6" component="span" sx={{ marginRight: 2 }}>
          Status:{" "}
          <Chip
            label={isClockedIn ? "Clocked In" : "Clocked Out"}
            color={isClockedIn ? "success" : "error"}
            size="small"
            sx={{
              backgroundColor: isClockedIn ? "#4caf50" : "#f44336",
              color: "#fff",
            }}
          />
        </Typography>
        <Button
          variant="contained"
          color={isClockedIn ? "error" : "success"}
          onClick={handleClockInOut}
        >
          {isClockedIn ? "Clock Out" : "Clock In"}
        </Button>
      </Box>

      {/* Schedule Table */}
      <Typography variant="h5" gutterBottom>
        Your Schedule
      </Typography>
      <TableContainer component={Paper} sx={{ marginBottom: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Shift Type</TableCell>
              <TableCell>Shift Start</TableCell>
              <TableCell>Shift End</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow
                key={shift.shift_id}
                onClick={() => setSelectedShift(shift)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>{shift.shift_type}</TableCell>
                <TableCell>
                  {new Date(shift.shift_start).toLocaleString()}
                </TableCell>
                <TableCell>
                  {shift.shift_end
                    ? new Date(shift.shift_end).toLocaleString()
                    : "Ongoing"}
                </TableCell>
                <TableCell>
                  {shift.shift_end ? (
                    <Chip label="Completed" color="success" size="small" />
                  ) : (
                    <Chip label="Ongoing" color="warning" size="small" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Total Hours Worked */}
      <Typography variant="h5" gutterBottom>
        Total Hours This Week
      </Typography>
      <TableContainer component={Paper} sx={{ marginBottom: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell>Hours Worked</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day, index) => {
              return (
                <TableRow key={index}>
                  <TableCell>{day}</TableCell>
                  <TableCell>0.00</TableCell>{" "}
                  {/* Placeholder for total hours per day */}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Total Hours Worked for the Week */}
      <Box sx={{ marginTop: 3 }}>
        <Typography variant="h6">
          Total Hours Worked: {calculateTotalHours()} hrs
        </Typography>
      </Box>
    </Box>
  );
};

export default ClockInLog;
