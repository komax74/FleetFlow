export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  mileage: number;
  image_url?: string;
  status: "available" | "booked" | "maintenance";
  maintenance_start?: string;
  maintenance_end?: string;
  maintenance_reason?: string;
  created_at?: string;
  updated_at?: string;
}
