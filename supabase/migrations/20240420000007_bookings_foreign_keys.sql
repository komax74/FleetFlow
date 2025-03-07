-- Add return location and notes columns
ALTER TABLE bookings ADD COLUMN return_location TEXT;
ALTER TABLE bookings ADD COLUMN return_notes TEXT;