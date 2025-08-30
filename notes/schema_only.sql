/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.0.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: prep_iq3
-- ------------------------------------------------------
-- Server version	12.0.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `activity_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`activity_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `activity_logs_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1530 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `alert_type` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `date_created` datetime DEFAULT current_timestamp(),
  `date_resolved` datetime DEFAULT NULL,
  `status` enum('Active','Resolved','Acknowledged') DEFAULT 'Active',
  `is_acknowledged` tinyint(1) DEFAULT 0,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `severity` varchar(50) NOT NULL DEFAULT 'info',
  PRIMARY KEY (`alert_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `alerts_ibfk_2` (`employee_id`),
  CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=226 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `batch_recipe_forecast_breakdown`
--

DROP TABLE IF EXISTS `batch_recipe_forecast_breakdown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_recipe_forecast_breakdown` (
  `batch_breakdown_id` int(11) NOT NULL AUTO_INCREMENT,
  `forecast_id` int(11) NOT NULL,
  `forecast_date` date NOT NULL,
  `batch_recipe_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `source_menu_item_id` int(11) DEFAULT NULL,
  `restaurant_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`batch_breakdown_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `batch_recipe_ingredients`
--

DROP TABLE IF EXISTS `batch_recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_recipe_ingredients` (
  `batch_recipe_id` int(11) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `quantity_used` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`batch_recipe_id`,`ingredient_id`),
  KEY `ingredient_id` (`ingredient_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `batch_recipe_ingredients_ibfk_1` FOREIGN KEY (`batch_recipe_id`) REFERENCES `batch_recipes` (`batch_recipe_id`),
  CONSTRAINT `batch_recipe_ingredients_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  CONSTRAINT `batch_recipe_ingredients_ibfk_3` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `batch_recipes`
--

DROP TABLE IF EXISTS `batch_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_recipes` (
  `batch_recipe_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `yield_quantity` decimal(10,2) DEFAULT NULL,
  `yield_unit` varchar(20) DEFAULT NULL,
  `estimated_prep_time_minutes` int(11) DEFAULT NULL,
  `shelf_life_days` int(11) DEFAULT NULL,
  PRIMARY KEY (`batch_recipe_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `batch_recipes_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clock_events`
--

DROP TABLE IF EXISTS `clock_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clock_events` (
  `clock_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `clock_in` datetime NOT NULL,
  `clock_out` datetime DEFAULT NULL,
  `shift_note` text DEFAULT NULL,
  PRIMARY KEY (`clock_id`),
  KEY `employee_id` (`employee_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `clock_events_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `clock_events_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_forecast_accuracy`
--

DROP TABLE IF EXISTS `daily_forecast_accuracy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_forecast_accuracy` (
  `accuracy_id` int(11) NOT NULL AUTO_INCREMENT,
  `breakdown_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `forecast_date` date NOT NULL,
  `predicted_quantity` int(11) NOT NULL,
  `actual_quantity` int(11) NOT NULL,
  `forecast_error` int(11) NOT NULL,
  `error_percentage` float NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`accuracy_id`),
  KEY `breakdown_id` (`breakdown_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `menu_item_id` (`menu_item_id`),
  CONSTRAINT `daily_forecast_accuracy_ibfk_1` FOREIGN KEY (`breakdown_id`) REFERENCES `forecast_breakdown` (`breakdown_id`),
  CONSTRAINT `daily_forecast_accuracy_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `daily_forecast_accuracy_ibfk_3` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38345 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `employee_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `hire_date` datetime DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `login_code` int(11) NOT NULL,
  `pay_rate` decimal(10,2) DEFAULT NULL,
  `employment_type` varchar(20) DEFAULT 'hourly',
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferences`)),
  `role_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `login_code` (`login_code`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `FK_role_id` (`role_id`),
  CONSTRAINT `FK_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_logs`
--

DROP TABLE IF EXISTS `error_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `level` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `trace` text DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `error_logs_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `error_logs_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `forecast_accuracy`
--

DROP TABLE IF EXISTS `forecast_accuracy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `forecast_accuracy` (
  `accuracy_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `forecast_id` int(11) NOT NULL,
  `forecast_version` int(11) NOT NULL,
  `forecast_period_start` date NOT NULL,
  `forecast_period_end` date NOT NULL,
  `predicted_quantity` float DEFAULT NULL,
  `actual_quantity` int(11) DEFAULT NULL,
  `forecast_error` float DEFAULT NULL,
  `error_percentage` float DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`accuracy_id`),
  KEY `menu_item_id` (`menu_item_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `forecast_id` (`forecast_id`),
  CONSTRAINT `forecast_accuracy_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `forecast_accuracy_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `forecast_accuracy_ibfk_3` FOREIGN KEY (`forecast_id`) REFERENCES `forecasts` (`forecast_id`)
) ENGINE=InnoDB AUTO_INCREMENT=690 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `forecast_breakdown`
--

DROP TABLE IF EXISTS `forecast_breakdown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `forecast_breakdown` (
  `breakdown_id` int(11) NOT NULL AUTO_INCREMENT,
  `forecast_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `forecast_date` date NOT NULL,
  `forecasted_quantity` int(11) NOT NULL,
  `restaurant_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`breakdown_id`),
  KEY `forecast_id` (`forecast_id`),
  KEY `menu_item_id` (`menu_item_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `forecast_breakdown_ibfk_1` FOREIGN KEY (`forecast_id`) REFERENCES `forecasts` (`forecast_id`),
  CONSTRAINT `forecast_breakdown_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `restaurant_id` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=42221 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `forecasts`
--

DROP TABLE IF EXISTS `forecasts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `forecasts` (
  `forecast_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `forecast_period_start` date NOT NULL,
  `forecast_period_end` date NOT NULL,
  `confidence_score` decimal(3,2) DEFAULT NULL,
  `adjusted_quantity` decimal(10,2) DEFAULT NULL,
  `used_in_order_generation` tinyint(1) DEFAULT 0,
  `forecast_version` int(11) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`forecast_id`),
  KEY `menu_item_id` (`menu_item_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `forecasts_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `forecasts_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38030 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ingredient_forecast_breakdown`
--

DROP TABLE IF EXISTS `ingredient_forecast_breakdown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredient_forecast_breakdown` (
  `ingredient_breakdown_id` int(11) NOT NULL AUTO_INCREMENT,
  `forecast_id` int(11) NOT NULL,
  `forecast_date` date NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `restaurant_id` int(11) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `source_type` enum('menu_item','batch_recipe') NOT NULL,
  `source_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`ingredient_breakdown_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ingredient_supplier`
--

DROP TABLE IF EXISTS `ingredient_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredient_supplier` (
  `ingredient_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `cost_per_unit` decimal(10,2) NOT NULL,
  `lead_time_days` int(11) NOT NULL,
  `spoilage_rate` decimal(4,3) DEFAULT NULL,
  `shelf_life_days` int(11) DEFAULT NULL,
  `preferred` tinyint(1) DEFAULT 0,
  `min_order_quantity` int(11) DEFAULT NULL,
  `supplier_priority` int(11) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `pack_size` int(11) DEFAULT NULL,
  `quantity_per_pack_item` decimal(10,2) DEFAULT NULL,
  `ingredient_supplier_id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`ingredient_supplier_id`),
  KEY `ingredient_supplier_ibfk_1` (`restaurant_id`),
  KEY `ingredient_supplier_ibfk_2` (`ingredient_id`),
  KEY `ingredient_supplier_ibfk_3` (`supplier_id`),
  CONSTRAINT `ingredient_supplier_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `ingredient_supplier_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  CONSTRAINT `ingredient_supplier_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `ingredient_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `average_weight_per_unit` decimal(10,2) DEFAULT NULL,
  `abc_class` char(1) DEFAULT NULL COMMENT 'ABC inventory classification (A, B, or C)',
  `max_stock_level` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`ingredient_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `ingredients_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `ingredient_id` int(11) DEFAULT NULL,
  `quantity_on_hand` decimal(10,2) DEFAULT 0.00,
  `min_stock_level` decimal(10,2) DEFAULT 0.00,
  `last_delivery_date` date DEFAULT NULL,
  `spoilage_expected_date` date DEFAULT NULL,
  `shelf_life_days` int(11) DEFAULT NULL,
  `spoilage_rate` decimal(4,3) DEFAULT NULL,
  `last_audit_timestamp` datetime DEFAULT NULL,
  `last_audit_quantity` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) NOT NULL,
  PRIMARY KEY (`inventory_id`),
  KEY `ingredient_id` (`ingredient_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `inventory_ibfk_3` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=501 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_lots`
--

DROP TABLE IF EXISTS `inventory_lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_lots` (
  `lot_id` int(11) NOT NULL AUTO_INCREMENT,
  `inventory_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `delivery_date` date NOT NULL,
  `spoilage_expected_date` date DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `total_received` decimal(10,2) NOT NULL DEFAULT 0.00,
  `ingredient_supplier_id` int(11) DEFAULT NULL,
  `ingredient_id` int(11) DEFAULT NULL,
  `batch_recipe_id` int(11) DEFAULT NULL,
  `status` enum('available','used','expired') DEFAULT 'available',
  PRIMARY KEY (`lot_id`),
  KEY `inventory_id` (`inventory_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `fk_inventory_lots_ingredient_supplier` (`ingredient_supplier_id`),
  CONSTRAINT `fk_inventory_lots_ingredient_supplier` FOREIGN KEY (`ingredient_supplier_id`) REFERENCES `ingredient_supplier` (`ingredient_supplier_id`),
  CONSTRAINT `inventory_lots_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`inventory_id`),
  CONSTRAINT `inventory_lots_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=503 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_usage_log`
--

DROP TABLE IF EXISTS `inventory_usage_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_usage_log` (
  `usage_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `lot_id` int(11) DEFAULT NULL,
  `ingredient_id` int(11) DEFAULT NULL,
  `used_quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `used_date` datetime NOT NULL DEFAULT current_timestamp(),
  `usage_type` enum('sale','waste','spoilage','manual_adjustment','manual_addition','batch_production','batch_fallback') DEFAULT NULL,
  `reference_type` enum('sale','batch','user','lot','waste_report','other') DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`usage_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lead_time_data`
--

DROP TABLE IF EXISTS `lead_time_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lead_time_data` (
  `lead_time_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `lead_time_date` date NOT NULL,
  `lead_time_days` int(11) DEFAULT NULL,
  `lead_time_variance` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`lead_time_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `lead_time_data_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `lead_time_data_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_item_batch_usage`
--

DROP TABLE IF EXISTS `menu_item_batch_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item_batch_usage` (
  `menu_item_id` int(11) NOT NULL,
  `batch_recipe_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `quantity_used` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  KEY `menu_item_id` (`menu_item_id`),
  KEY `batch_recipe_id` (`batch_recipe_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `menu_item_batch_usage_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `menu_item_batch_usage_ibfk_2` FOREIGN KEY (`batch_recipe_id`) REFERENCES `batch_recipes` (`batch_recipe_id`),
  CONSTRAINT `menu_item_batch_usage_ibfk_3` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_item_recipes`
--

DROP TABLE IF EXISTS `menu_item_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item_recipes` (
  `menu_item_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  PRIMARY KEY (`menu_item_id`,`recipe_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `recipe_id` (`recipe_id`),
  CONSTRAINT `menu_item_recipes_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `menu_item_recipes_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `menu_item_recipes_ibfk_3` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `menu_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`menu_item_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_item_modifiers`
--

DROP TABLE IF EXISTS `order_item_modifiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_item_modifiers` (
  `modifier_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_item_id` int(11) NOT NULL,
  `mod_type` enum('remove','add','replace','modifier','cooking_temp','note') NOT NULL,
  `target_type` enum('ingredient','modifier') DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`modifier_id`),
  KEY `order_item_id` (`order_item_id`),
  CONSTRAINT `order_item_modifiers_order_item_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `quantity` decimal(8,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `instructions` varchar(255) DEFAULT NULL,
  `recipe_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recipe_snapshot`)),
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `menu_item_id` (`menu_item_id`),
  CONSTRAINT `order_items_menu_item_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `order_items_order_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `order_timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `order_status` varchar(32) NOT NULL DEFAULT 'open',
  `sales_channel` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `order_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`order_metadata`)),
  PRIMARY KEY (`order_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `orders_employee_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `orders_restaurant_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `payment_timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `method` varchar(50) DEFAULT NULL,
  `provider` varchar(50) DEFAULT NULL,
  `provider_payment_id` varchar(255) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `payment_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payment_metadata`)),
  PRIMARY KEY (`payment_id`),
  KEY `order_id` (`order_id`),
  KEY `payments_restaurant_fk` (`restaurant_id`),
  CONSTRAINT `payments_order_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `payments_restaurant_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `permission_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `restaurant_id` (`restaurant_id`,`name`),
  CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prep_schedule`
--

DROP TABLE IF EXISTS `prep_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `prep_schedule` (
  `prep_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `batch_recipe_id` int(11) DEFAULT NULL,
  `prep_date` date NOT NULL,
  `quantity_needed` decimal(10,2) DEFAULT NULL,
  `quantity_prepped` decimal(10,2) DEFAULT NULL,
  `prep_batch_count` decimal(5,2) DEFAULT NULL,
  `prep_time_minutes_estimated` int(11) DEFAULT NULL,
  `prep_time_minutes_actual` int(11) DEFAULT NULL,
  `assigned_employee_id` int(11) DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed') DEFAULT 'scheduled',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`prep_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `assigned_employee_id` (`assigned_employee_id`),
  KEY `fk_prep_schedule_batch_recipe` (`batch_recipe_id`),
  CONSTRAINT `fk_prep_schedule_batch_recipe` FOREIGN KEY (`batch_recipe_id`) REFERENCES `batch_recipes` (`batch_recipe_id`),
  CONSTRAINT `prep_schedule_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `prep_schedule_ibfk_3` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `order_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `quantity_ordered` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `ingredient_supplier_id` int(11) DEFAULT NULL,
  `total_item_price` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `ingredient_id` (`ingredient_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders` (`order_id`),
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`),
  CONSTRAINT `purchase_order_items_ibfk_3` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `order_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `total_order_price` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`order_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipe_ingredients`
--

DROP TABLE IF EXISTS `recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_ingredients` (
  `recipe_ingredient_id` int(11) NOT NULL AUTO_INCREMENT,
  `recipe_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  `quantity_used` decimal(10,2) NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `ingredient_type` enum('ingredient','batch') NOT NULL DEFAULT 'ingredient',
  `reference_id` int(11) NOT NULL,
  `fallback_ingredient_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`recipe_ingredient_id`),
  KEY `recipe_id` (`recipe_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `recipe_ingredients_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipe_modifiers`
--

DROP TABLE IF EXISTS `recipe_modifiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_modifiers` (
  `modifier_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `adjustment_type` varchar(20) DEFAULT NULL,
  `ingredient_id` int(11) DEFAULT NULL,
  `quantity_adjustment` decimal(10,2) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`modifier_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `recipe_id` (`recipe_id`),
  KEY `ingredient_id` (`ingredient_id`),
  CONSTRAINT `recipe_modifiers_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `recipe_modifiers_ibfk_2` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`),
  CONSTRAINT `recipe_modifiers_ibfk_3` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipes`
--

DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipes` (
  `recipe_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`recipe_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `recipes_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `restaurants`
--

DROP TABLE IF EXISTS `restaurants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurants` (
  `restaurant_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `subscription_tier` enum('basic','pro','master') NOT NULL DEFAULT 'basic',
  `hours_of_operation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`hours_of_operation`)),
  `email` varchar(255) DEFAULT NULL,
  `subscription_status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
  `expiry_date` date DEFAULT NULL,
  `forecast_length` int(10) unsigned NOT NULL DEFAULT 7,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `timezone` varchar(100) DEFAULT NULL,
  `eod_run_when_closed` tinyint(1) NOT NULL DEFAULT 1,
  `eod_run_after_close_mins` int(10) unsigned DEFAULT 60,
  `sales_channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT json_array(_cp850'in-house',_cp850'take-out') CHECK (json_valid(`sales_channels`)),
  `last_eod_run_date` date DEFAULT NULL,
  `settings` longtext DEFAULT '{}',
  `pos_mode` varchar(16) DEFAULT 'full',
  `kitchen_mode` varchar(16) DEFAULT 'full',
  `ui_layout_size` varchar(16) DEFAULT 'auto',
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  PRIMARY KEY (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `restaurant_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_3` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `restaurant_id` (`restaurant_id`,`name`),
  CONSTRAINT `roles_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `sale_timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `menu_item_id` int(11) NOT NULL,
  `quantity_sold` int(11) NOT NULL,
  `sales_channel` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`sale_id`),
  KEY `menu_item_id` (`menu_item_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`menu_item_id`),
  CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15918 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `scheduled_shifts`
--

DROP TABLE IF EXISTS `scheduled_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduled_shifts` (
  `shift_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `shift_start` datetime DEFAULT NULL,
  `shift_end` datetime DEFAULT NULL,
  `shift_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`shift_id`),
  KEY `employee_id` (`employee_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `scheduled_shifts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `scheduled_shifts_ibfk_2` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `spoilage_data`
--

DROP TABLE IF EXISTS `spoilage_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `spoilage_data` (
  `spoilage_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `spoilage_date` date NOT NULL,
  `spoilage_rate` decimal(4,3) DEFAULT NULL,
  `spoiled_quantity` decimal(10,2) DEFAULT NULL,
  `source` enum('auto','manual') DEFAULT 'auto',
  PRIMARY KEY (`spoilage_id`),
  KEY `restaurant_id` (`restaurant_id`),
  KEY `ingredient_id` (`ingredient_id`),
  CONSTRAINT `spoilage_data_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`),
  CONSTRAINT `spoilage_data_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier` (
  `supplier_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT 5.00,
  `website` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `supplier_feedback` text DEFAULT NULL,
  `contract_status` varchar(50) DEFAULT 'Active',
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  PRIMARY KEY (`supplier_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `supplier_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier_preferences`
--

DROP TABLE IF EXISTS `supplier_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_preferences` (
  `restaurant_id` int(11) NOT NULL,
  `weight_cost` decimal(4,3) DEFAULT 0.400,
  `weight_lead_time` decimal(4,3) DEFAULT 0.300,
  `weight_spoilage` decimal(4,3) DEFAULT 0.200,
  `weight_rating` decimal(4,3) DEFAULT 0.100,
  PRIMARY KEY (`restaurant_id`),
  CONSTRAINT `supplier_preferences_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `traffic_data`
--

DROP TABLE IF EXISTS `traffic_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `traffic_data` (
  `traffic_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `traffic_date` date NOT NULL,
  `traffic_condition` varchar(100) DEFAULT NULL,
  `traffic_delay_minutes` int(11) DEFAULT NULL,
  PRIMARY KEY (`traffic_id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `traffic_data_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weather_data`
--

DROP TABLE IF EXISTS `weather_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `weather_data` (
  `weather_id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `weather_date` date NOT NULL,
  `temperature` decimal(6,2) DEFAULT NULL,
  `precipitation_mm` decimal(6,2) DEFAULT NULL,
  `precipitation_type` varchar(32) DEFAULT NULL,
  `humidity` smallint(6) DEFAULT NULL,
  `wind_speed` decimal(6,2) DEFAULT NULL,
  `wind_deg` smallint(6) DEFAULT NULL,
  `weather_condition` varchar(128) DEFAULT NULL,
  `source` varchar(64) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`weather_id`),
  UNIQUE KEY `ux_weather_rest_date` (`restaurant_id`,`weather_date`),
  KEY `idx_weather_rest` (`restaurant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-08-29 15:53:05
