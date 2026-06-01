-- TEPS Initial Database Schema

-- Users & Roles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'owner', 'agent', 'admin')),
  full_name VARCHAR(255),
  phone_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  price_period VARCHAR(50) CHECK (price_period IN ('month', 'year', 'one-off')),
  category VARCHAR(50) CHECK (category IN ('Rent', 'Sale', 'Rent-to-Own')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  region VARCHAR(100),
  constituency VARCHAR(100),
  district VARCHAR(100),
  address TEXT,
  gps_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification Checks (The Trust Layer)
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) UNIQUE,
  is_fully_verified BOOLEAN DEFAULT FALSE,
  ownership_verified BOOLEAN DEFAULT FALSE,
  ownership_verified_at TIMESTAMP WITH TIME ZONE,
  gps_verified BOOLEAN DEFAULT FALSE,
  gps_verified_at TIMESTAMP WITH TIME ZONE,
  land_commission_verified BOOLEAN DEFAULT FALSE,
  land_commission_verified_at TIMESTAMP WITH TIME ZONE,
  reference_code VARCHAR(100) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Tickets
CREATE TABLE service_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  issue_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
