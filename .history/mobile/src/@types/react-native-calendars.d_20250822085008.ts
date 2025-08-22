declare module 'react-native-calendars' {
  import * as React from 'react';
  export interface DayObject {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
  }
  export interface CalendarProps {
    current?: string;
    onDayPress?: (d: DayObject) => void;
    enableSwipeMonths?: boolean;
    [key: string]: any;
  }
  export class Calendar extends React.Component<CalendarProps> {}
  export default Calendar;
}
