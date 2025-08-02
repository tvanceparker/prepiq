import { get, post, patch } from "./index.ts";

export const getShiftsForEmployee = (employeeId) => get(`/team/shifts/${employeeId}`);
export const createClockEventForEmployee = (data) => post("/team/clock-events", data);
export const getClockEventsForEmployee = (employeeId) => get(`/team/clock-events/${employeeId}`);
export const updateClockEventForEmployee = (clock_id, data) => {
    return patch(`/team/clock-events/${clock_id}`, data);
};