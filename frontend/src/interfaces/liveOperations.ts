export interface CurrentShift {
  clocked_in: number;
  scheduled: number;
  on_break: number;
}

export interface OrderFlow {
  pending: number;
  in_progress: number;
  ready: number;
  completed_today: number;
  avg_prep_time: number;
}

export interface TodaysPace {
  current_sales: number;
  forecast_sales: number;
  percentage: number;
  pace_vs_forecast: 'on_track' | 'ahead' | 'behind';
}

export interface ActiveOrder {
  order_id: number;
  table: string;
  items: number;
  time_elapsed: number;
  status: string;
  server: string;
}

export interface KitchenStatus {
  grill: string;
  fryer: string;
  salad: string;
  dessert: string;
}

export interface UpcomingDelivery {
  supplier: string;
  eta: string;
  items: string;
}

export interface LiveOperationsData {
  current_shift: CurrentShift;
  order_flow: OrderFlow;
  todays_pace: TodaysPace;
  active_orders: ActiveOrder[];
  kitchen_status: KitchenStatus;
  upcoming_deliveries: UpcomingDelivery[];
}
