import { useState, useEffect } from "react";
import {
    getShiftsForEmployee,
    getClockEventsForEmployee,
    createClockEventForEmployee,
    updateClockEventForEmployee,
} from "../../../api/team";

const useClockIn = (employeeId) => {
    const [shifts, setShifts] = useState([]);
    const [clockEvents, setClockEvents] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!employeeId) return;

        const fetchData = async () => {
            try {
                const shiftRes = await getShiftsForEmployee(employeeId);
                const clockRes = await getClockEventsForEmployee(employeeId);
                setShifts(shiftRes.data || []);
                setClockEvents(clockRes.data || []);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch shifts or clock events");
            }
        };

        fetchData();
    }, [employeeId]);

    const clockInOut = async (clockIn) => {
        if (!employeeId) return;

        try {
            if (clockIn) {
                // Clock in: create new event
                await createClockEventForEmployee({
                    employee_id: employeeId,
                    clock_in: new Date().toISOString(),
                    shift_note: "Manual clock in",
                });

            } else {
                // Clock out: find latest open event
                const openEvent = [...clockEvents]
                    .filter(e => !e.clock_out)
                    .sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in))[0];

                if (!openEvent) {
                    setError("No open clock-in found to clock out.");
                    return;
                }

                // Patch using the correct clock_id
                await updateClockEventForEmployee(openEvent.clock_id, {
                    clock_out: new Date().toISOString(),
                });
            }

            // Refresh after update
            const updatedClockEvents = await getClockEventsForEmployee(employeeId);
            setClockEvents(updatedClockEvents.data || []);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Clock-in/out action failed.");
        }
    };

    return { shifts, clockEvents, error, clockInOut };
};

export default useClockIn;
