-- Global Intelligence Database Schema
CREATE TABLE threat_indicators (
    id SERIAL PRIMARY KEY,
    indicator_type TEXT,
    value TEXT,
    confidence FLOAT,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    source_tenant INT
);

CREATE TABLE threat_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name TEXT,
    indicators TEXT,
    targets TEXT,
    confidence FLOAT,
    first_detected TIMESTAMP,
    last_detected TIMESTAMP
);

CREATE TABLE indicator_history (
    id SERIAL PRIMARY KEY,
    indicator_id INT,
    event TEXT,
    timestamp TIMESTAMP
);
