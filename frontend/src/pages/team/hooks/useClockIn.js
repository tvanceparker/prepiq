import { useState, useEffect } from 'react';
import { getClockEvents, createClockEvent, updateClockEvent } from '../../../api/team';

const useClockIn = employeeId => {
  const [shifts, setShifts] = useState([]);
  const [clockEvents, setClockEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employeeId) return;

    const fetchData = async () => {
      try {
        // Remove shifts fetch since we don't have that endpoint
        const clockRes = await getClockEvents(employeeId);
        setShifts([]);
        setClockEvents(clockRes.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch clock events');
      }
    };

    fetchData();
  }, [employeeId]);

  const clockInOut = async clockIn => {
    if (!employeeId) return;

    try {
      if (clockIn) {
        // Clock in: create new event
        await createClockEvent({
          employee_id: employeeId,
          clock_in: new Date().toISOString(),
          shift_note: 'Manual clock in',
        });
      } else {
        // Clock out: find latest open event
        const openEvent = [...clockEvents]
          .filter(e => !e.clock_out)
          .sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in))[0];

        if (!openEvent) {
          setError('No open clock-in found to clock out.');
          return;
        }

        // Patch using the correct clock_id
        await updateClockEvent(openEvent.clock_id, {
          clock_out: new Date().toISOString(),
        });
      }

      // Refresh after update
      const updatedClockEvents = await getClockEvents(employeeId);
      setClockEvents(updatedClockEvents.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Clock-in/out action failed.');
    }
  };

  return { shifts, clockEvents, error, clockInOut };
};

export default useClockIn;
