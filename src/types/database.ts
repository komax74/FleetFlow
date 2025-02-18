export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          company: string | null;
          role: "admin" | "user";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          company?: string | null;
          role?: "admin" | "user";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          company?: string | null;
          role?: "admin" | "user";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          brand: string;
          model: string;
          license_plate: string;
          mileage: number;
          image_url: string | null;
          status: "available" | "booked" | "maintenance";
          maintenance_start: string | null;
          maintenance_end: string | null;
          maintenance_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          model: string;
          license_plate: string;
          mileage?: number;
          image_url?: string | null;
          status?: "available" | "booked" | "maintenance";
          maintenance_start?: string | null;
          maintenance_end?: string | null;
          maintenance_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          model?: string;
          license_plate?: string;
          mileage?: number;
          image_url?: string | null;
          status?: "available" | "booked" | "maintenance";
          maintenance_start?: string | null;
          maintenance_end?: string | null;
          maintenance_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          pickup_time: string;
          return_time: string;
          status: "active" | "completed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          pickup_time: string;
          return_time: string;
          status?: "active" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string;
          start_date?: string;
          end_date?: string;
          pickup_time?: string;
          return_time?: string;
          status?: "active" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "admin" | "user";
      vehicle_status: "available" | "booked" | "maintenance";
      booking_status: "active" | "completed" | "cancelled";
    };
  };
};
