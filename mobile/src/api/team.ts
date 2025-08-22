import { get, post, patch } from './index';

export const getShiftsForEmployee = (employeeId: string | number) =>
  get(`/team/shifts/${employeeId}`);
export const createClockEventForEmployee = (data: any) => post('/team/clock-events', data);
export const getClockEventsForEmployee = (employeeId: string | number) =>
  get(`/team/clock-events/${employeeId}`);
export const updateClockEventForEmployee = (clock_id: string | number, data: any) =>
  patch(`/team/clock-events/${clock_id}`, data);
