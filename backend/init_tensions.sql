-- Script to initialize tension and stencil tables
-- Run this in the 'stencil' database

-- Drop existing tables if needed
DROP TABLE IF EXISTS tension;
DROP TABLE IF EXISTS stencil;

-- Create tension table
CREATE TABLE tension(
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME,
  numero INT,
  model VARCHAR(250),
  da DECIMAL(10, 2),
  db DECIMAL(10, 2),
  dc DECIMAL(10, 2),
  dd DECIMAL(10, 2),
  de DECIMAL(10, 2),
  min DECIMAL(10, 2),
  max DECIMAL(10, 2),
  operador VARCHAR(250),
  supervisor VARCHAR(250)
);

-- Create stencil table
CREATE TABLE stencil(
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero INT,
  model VARCHAR(250)
);

-- Optional: Insert sample stencil data for testing
-- INSERT INTO stencil (id, model) VALUES 
--   (1, 'MODELO-001'),
--   (2, 'MODELO-002'),
--   (3, 'MODELO-003');
