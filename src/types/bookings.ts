export interface Booking {
  id: string;
  vehicle_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  pickup_time: string;
  return_time: string;
  status: "active" | "completed" | "cancelled";
}
