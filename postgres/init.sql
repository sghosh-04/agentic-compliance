-- Create Database tables for Agentic Compliance System

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Compliance_Officer', -- Admin, Compliance_Officer, Auditor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regulations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100) NOT NULL, -- SEBI, RBI, IRDAI, SEC, etc.
    category VARCHAR(100), -- Mutual Funds, Insider Trading, Corporate Governance, etc.
    reference_url VARCHAR(500),
    published_date DATE,
    file_path VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Processing, Processed, Error
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS obligations (
    id SERIAL PRIMARY KEY,
    regulation_id INTEGER NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    section_reference VARCHAR(150),
    category VARCHAR(100),
    compliance_deadline DATE,
    penalty_description TEXT,
    risk_level VARCHAR(50) DEFAULT 'Medium', -- High, Medium, Low
    status VARCHAR(50) DEFAULT 'Active', -- Active, Superceded, Inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_tasks (
    id SERIAL PRIMARY KEY,
    obligation_id INTEGER REFERENCES obligations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In_Progress, Under_Review, Completed
    priority VARCHAR(50) DEFAULT 'Medium', -- High, Medium, Low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES compliance_tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Pending_Review', -- Pending_Review, Approved, Rejected
    comments TEXT
);

CREATE TABLE IF NOT EXISTS gap_analyses (
    id SERIAL PRIMARY KEY,
    regulation_id INTEGER NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    findings TEXT,
    risk_assessment TEXT,
    recommendations TEXT,
    status VARCHAR(50) DEFAULT 'Identified', -- Identified, Mitigated, In_Progress
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    obligation_id INTEGER NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES compliance_tasks(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
