-- Seed data for Compliance System
-- Default password for all seeded users is 'password123'
-- Hash is generated using bcrypt

INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@compliance.com', '$2b$12$EmyXm02yQeN61cZ8pU3eO.b8.0/52oPqZ.8yv.j1P2Qd9rLhG6M/G', 'Admin'),
('officer', 'officer@compliance.com', '$2b$12$EmyXm02yQeN61cZ8pU3eO.b8.0/52oPqZ.8yv.j1P2Qd9rLhG6M/G', 'Compliance_Officer'),
('auditor', 'auditor@compliance.com', '$2b$12$EmyXm02yQeN61cZ8pU3eO.b8.0/52oPqZ.8yv.j1P2Qd9rLhG6M/G', 'Auditor')
ON CONFLICT DO NOTHING;

-- Seed Regulations
INSERT INTO regulations (title, description, source, category, reference_url, published_date, status, processed_at) VALUES
(
    'SEBI Master Circular for Mutual Funds 2026', 
    'Consolidated guidelines issued by the Securities and Exchange Board of India regarding mutual fund registrations, operations, and portfolio compliance.', 
    'SEBI', 
    'Mutual Funds', 
    'https://www.sebi.gov.in/legal/master-circulars/', 
    '2026-02-15', 
    'Processed',
    CURRENT_TIMESTAMP
),
(
    'RBI Master Direction - Know Your Customer (KYC) Direction, 2016 (Updated 2026)', 
    'Guidelines regarding standard customer identification procedures, transaction monitoring, and risk management compliance for banking institutions.', 
    'RBI', 
    'Anti-Money Laundering', 
    'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx', 
    '2026-04-10', 
    'Processed',
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Seed Obligations
INSERT INTO obligations (regulation_id, title, description, section_reference, category, compliance_deadline, penalty_description, risk_level, status) VALUES
(
    1,
    'Minimum Net Worth Requirement',
    'Asset Management Companies (AMCs) shall maintain a minimum net worth of not less than INR 50 Crore on a continuous basis.',
    'Section 2.1.1',
    'Financial Requirements',
    '2026-12-31',
    'Suspension of mutual fund registration and monetary penalty of up to INR 1 Crore.',
    'High',
    'Active'
),
(
    1,
    'Appointment of Compliance Officer',
    'Every Asset Management Company shall appoint a designated Compliance Officer who shall be responsible for monitoring the compliance of the AMC and its trustees with SEBI regulations.',
    'Section 4.3.2',
    'Governance',
    '2026-08-01',
    'Regulatory warning, audit flag, and administrative penalty.',
    'Medium',
    'Active'
),
(
    2,
    'Periodic Re-KYC Verification',
    'Regulated Entities (REs) must perform periodic updation of KYC information (re-KYC) at least once in every two years for high-risk customers, eight years for medium-risk customers, and ten years for low-risk customers.',
    'Section 38',
    'Customer Onboarding',
    '2026-10-15',
    'Strict regulatory audit remarks and fines up to INR 50 Lakhs.',
    'High',
    'Active'
)
ON CONFLICT DO NOTHING;

-- Seed Compliance Tasks
INSERT INTO compliance_tasks (obligation_id, title, description, assigned_to, due_date, status, priority) VALUES
(
    1,
    'Submit Annual AMC Net Worth Auditor Certificate',
    'Verify that the net worth of the AMC is above INR 50 Crores. Gather certificate from Chartered Accountant and upload.',
    2,
    '2026-12-15',
    'Pending',
    'High'
),
(
    2,
    'Validate Compliance Officer Board Appointment Resolution',
    'Ensure that the Board of Directors has formally approved the Compliance Officer designation. Collect board resolution PDF and upload as proof.',
    2,
    '2026-07-25',
    'In_Progress',
    'Medium'
),
(
    3,
    'Trigger Quarterly Batch Re-KYC Audits',
    'Pull list of all high-risk accounts due for re-KYC. Initiate verification workflows and compile status report.',
    3,
    '2026-09-30',
    'Pending',
    'High'
)
ON CONFLICT DO NOTHING;

-- Seed Gap Analysis
INSERT INTO gap_analyses (regulation_id, findings, risk_assessment, recommendations, status) VALUES
(
    1,
    'Our current AMC net worth is INR 52.4 Crores, which meets the INR 50 Crore obligation. However, the cushion is small (4.8%). Any decline in assets under management could breach the threshold.',
    'Medium Risk. Small buffer could easily trigger non-compliance during market downturns.',
    'Maintain a capital buffer of at least INR 5 Crore above the limit. Board should review capital structure.',
    'In_Progress'
),
(
    2,
    'Periodic re-KYC workflows are run manually. High-risk customers are identified, but re-KYC collection rate is currently at 78%, leaving a 22% compliance gap.',
    'High Risk. Pending re-KYC on high-risk customers represents an AML vulnerability.',
    'Implement automated SMS/Email reminders for re-KYC. Impose temporary debit-freezes on accounts missing the deadline by over 90 days.',
    'Identified'
)
ON CONFLICT DO NOTHING;
