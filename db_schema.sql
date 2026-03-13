-- attack_events
CREATE TABLE attack_events (
  event_id UUID PRIMARY KEY,
  timestamp TIMESTAMP,
  source_ip VARCHAR(45),
  source_country VARCHAR(64),
  source_city VARCHAR(64),
  source_lat FLOAT,
  source_lon FLOAT,
  target_ip VARCHAR(45),
  target_country VARCHAR(64),
  target_city VARCHAR(64),
  target_lat FLOAT,
  target_lon FLOAT,
  attack_type VARCHAR(64),
  severity VARCHAR(16) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  vector VARCHAR(64),
  industry VARCHAR(64),
  actor VARCHAR(64),
  feed_source VARCHAR(64),
  INDEX idx_timestamp_country (timestamp, source_country)
);

-- email_logs
CREATE TABLE email_logs (
  email_id UUID PRIMARY KEY,
  timestamp TIMESTAMP,
  sender VARCHAR(128),
  recipient VARCHAR(128),
  subject VARCHAR(256),
  status VARCHAR(16) CHECK (status IN ('Sent', 'Delivered', 'Bounced', 'Complaint', 'Suppressed')),
  provider VARCHAR(32),
  retry_count INT,
  message_id VARCHAR(128),
  open_tracking BOOLEAN,
  click_tracking BOOLEAN
);

-- suppression_list
CREATE TABLE suppression_list (
  suppression_id UUID PRIMARY KEY,
  email VARCHAR(128) UNIQUE,
  reason VARCHAR(16) CHECK (reason IN ('Bounce', 'Complaint', 'Unsubscribe', 'Manual')),
  timestamp TIMESTAMP
);

-- unsubscribe_preferences
CREATE TABLE unsubscribe_preferences (
  user_id UUID PRIMARY KEY,
  email VARCHAR(128),
  topic VARCHAR(32),
  status BOOLEAN
);

-- engagement_metrics
CREATE TABLE engagement_metrics (
  metric_id UUID PRIMARY KEY,
  email_id UUID REFERENCES email_logs(email_id),
  open_time TIMESTAMP,
  click_time TIMESTAMP,
  device VARCHAR(64),
  geo_location VARCHAR(128)
);

-- deliverability_stats
CREATE TABLE deliverability_stats (
  stat_id UUID PRIMARY KEY,
  provider VARCHAR(32),
  date DATE,
  sent_count INT,
  delivered_count INT,
  bounce_count INT,
  complaint_count INT,
  spam_score FLOAT
);

-- soc_alerts
CREATE TABLE soc_alerts (
  alert_id UUID PRIMARY KEY,
  timestamp TIMESTAMP,
  severity VARCHAR(16) CHECK (severity IN ('Info', 'Warning', 'Critical')),
  description TEXT,
  related_event_id UUID REFERENCES attack_events(event_id),
  status VARCHAR(16) CHECK (status IN ('Open', 'Investigating', 'Closed'))
);
