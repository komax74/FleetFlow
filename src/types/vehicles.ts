export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  mileage: number;
  image_url?: string;
  status: "available" | "booked" | "maintenance";
  maintenanceInfo?: {
    startDate: string;
    endDate: string;
    reason: string;
  };
}
