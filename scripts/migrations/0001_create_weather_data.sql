-- scripts/migrations/0001_create_weather_data.sql
-- Idempotent migration to create the weather_data table

CREATE TABLE IF NOT EXISTS weather_data (
  weather_id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  weather_date DATE NOT NULL,
  temperature DECIMAL(6,2) NULL,
  precipitation_mm DECIMAL(6,2) NULL,
  precipitation_type VARCHAR(32) NULL,
  humidity SMALLINT NULL,
  wind_speed DECIMAL(6,2) NULL,
  wind_deg SMALLINT NULL,
  weather_condition VARCHAR(128) NULL,
  source VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_weather_rest_date (restaurant_id, weather_date),
  KEY idx_weather_rest (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
