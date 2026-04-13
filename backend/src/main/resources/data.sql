-- Users (only those referenced by alarms/issues/workflows)
INSERT INTO users (id, name, department) VALUES
  ('user-tanaka',  'H. Tanaka',  'Litho'),
  ('user-rossi',   'L. Rossi',   'Litho'),
  ('user-garcia',  'R. Garcia',  'Litho'),
  ('user-chen',    'M. Chen',    'Etch'),
  ('user-patel',   'S. Patel',   'Etch'),
  ('user-kim',     'A. Kim',     'Etch'),
  ('user-muller',  'K. Müller',  'Facilities'),
  ('user-smith',   'J. Smith',   'Facilities'),
  ('user-park',    'C. Park',    'Etch'),
  ('user-hoffman', 'B. Hoffman', 'Facilities'),
  ('SPC_SYSTEM',   'SPC System',   'SYSTEM'),
  ('MES_ALERTS',   'MES Alerts',   'SYSTEM'),
  ('SENSOR_HUB',   'Sensor Hub',   'SYSTEM');

-- Alarms (only those linked to issues, covering both types / all severities / both statuses)
INSERT INTO alarm (id, type, severity, message, alarm_value, unit, alarm_time, recovery_time, eqp_id, chamber_id, product_id, oper_name, owner, department, chart_owner_id, status, risk_level) VALUES
  ('alm-001', 'TempSpike',   'P1', 'Chamber temperature exceeded threshold', 202.69, '°C',    '2026-04-15 00:59:10+00:00', NULL,                       'CVD-04',   'A', 'D1-PVD',  'Lot start',      'H. Tanaka', 'Litho',      'user-rossi',  'Open',  NULL),
  ('alm-002', 'TempSpike',   'P1', 'Chamber pressure below setpoint',        10.78,  'mTorr', '2026-04-28 08:25:56+00:00', NULL,                       'CVD-09',   'C', 'F4-Metro','Endpoint detect', 'M. Chen',   'Etch',       'user-patel',  'Open',  NULL),
  ('alm-003', 'TempSpike',   'P2', 'Process gas flow out of range',          93.04,  'sccm',  '2026-04-21 18:34:24+00:00', NULL,                       'PVD-02',   'D', 'A7-Litho','Idle / standby',  'S. Patel',  'Etch',       'user-kim',    'Open',  NULL),
  ('alm-004', 'ChamberLeak', 'P2', 'Vacuum leak rate above tolerance',       0.33,   'sccm',  '2026-04-10 11:23:53+00:00', NULL,                       'CVD-04',   'A', 'F4-Metro','Endpoint detect', 'K. Müller', 'Facilities', NULL,          'Open',  'LOW_RISK'),
  ('alm-005', 'TempSpike',   'P2', 'DC bias voltage sag detected',           308.83, 'V',     '2026-04-04 11:34:28+00:00', NULL,                       'LITHO-07', 'D', 'C2-CVD',  'Idle / standby',  'L. Rossi',  'Litho',      'user-tanaka', 'Open',  NULL),
  ('alm-006', 'TempSpike',   'P2', 'In-situ particle count spike',           15.97,  'cnt',   '2026-04-19 13:09:46+00:00', NULL,                       'METRO-01', 'C', 'F4-Metro','Recipe step 3',   'J. Smith',  'Facilities', NULL,          'Acked', NULL),
  ('alm-007', 'ChamberLeak', 'P3', 'Turbopump speed deviation',              957.54, 'Hz',    '2026-04-08 12:46:53+00:00', NULL,                       'CVD-04',   'D', 'A7-Litho','Process clean',   'A. Kim',    'Etch',       'user-chen',   'Acked', NULL),
  ('alm-010', 'TempSpike',   'P0', 'Etch endpoint signal drift',             6.22,   '%',     '2026-04-04 08:46:33+00:00', NULL,                       'CVD-04',   'C', 'A7-Litho','Vent cycle',      'S. Patel',  'Etch',       'user-patel',  'Acked', NULL),
  ('alm-011', 'TempSpike',   'P1', 'Chamber temperature exceeded threshold', 269.71, '°C',    '2026-04-12 14:32:39+00:00', '2026-04-12 14:54:39+00:00','PVD-02',   'C', 'A7-Litho','Endpoint detect', 'H. Tanaka', 'Litho',      'user-rossi',  'Open',  'LOW_RISK'),
  ('alm-014', 'ChamberLeak', 'P2', 'Vacuum leak rate above tolerance',       0.37,   'sccm',  '2026-04-25 10:51:31+00:00', '2026-04-25 11:44:31+00:00','CVD-04',   'D', 'A7-Litho','Recipe step 3',   'K. Müller', 'Facilities', 'user-smith',  'Open',  'HIGH_RISK'),
  ('alm-020', 'TempSpike',   'P0', 'Etch endpoint signal drift',             6.14,   '%',     '2026-04-01 13:20:07+00:00', '2026-04-01 14:01:07+00:00','LITHO-07', 'A', 'C2-CVD',  'Idle / standby',  'S. Patel',  'Etch',       'user-patel',  'Acked', NULL);

-- Alarm labels
INSERT INTO alarm_label (alarm_id, label) VALUES
  ('alm-004', 'LotImpacting'),
  ('alm-007', 'NeedsEngReview'),
  ('alm-011', 'UnderObservation');

-- Issues
INSERT INTO issue (id, title, issue_date, risk_level, status, issue_time, oper_name, oper_no, module, product, owner_id, department, description) VALUES
  ('iss-001', 'Temperature excursion on LITHO-07',            '2026-04-01T08:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-01T07:45:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-tanaka', 'Litho',      'Repeated temp spikes during exposure step on LITHO-07. Wafer lot at risk.'),
  ('iss-002', 'Pressure drop in ETCH-03 chamber B',           '2026-04-01T09:30:00Z', 'HIGH_RISK',   'Triage',        '2026-04-01T09:15:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-chen',   'Etch',       'Sudden pressure drop detected in chamber B during etch process.'),
  ('iss-003', 'Flow anomaly on CVD-12',                       '2026-04-02T10:00:00Z', 'MIDDLE_RISK', 'Closed',        '2026-04-02T09:30:00Z', 'Deposition',        'OP-3030', 'CVD',   'C2-CVD',    'user-patel',  'Etch',       'Gas flow deviation detected during deposition. Resolved by recalibration.'),
  ('iss-004', 'Chamber leak LITHO-02',                        '2026-04-02T14:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-02T13:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-rossi',  'Litho',      'Helium leak test failed on LITHO-02 chamber. Production halted.'),
  ('iss-005', 'Voltage sag on FACILITIES-PSU-01',             '2026-04-03T06:00:00Z', 'HIGH_RISK',   'Closed',        '2026-04-03T05:45:00Z', 'Power Distribution', NULL,     NULL,    'FAC-Power', 'user-muller', 'Facilities', 'Voltage sag event on main PSU feeding cleanroom zone 3.'),
  ('iss-006', 'Particle count spike LITHO-07 post-maintenance','2026-04-03T11:00:00Z', 'MIDDLE_RISK','Triage',        '2026-04-03T10:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-tanaka', 'Litho',      'Elevated particle counts after scheduled maintenance window.'),
  ('iss-007', 'Vacuum fault ETCH-05',                         '2026-04-04T08:30:00Z', 'HIGH_RISK',   'Investigating', '2026-04-04T08:00:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-kim',    'Etch',       'Vacuum pump fault on ETCH-05 preventing chamber evacuation.'),
  ('iss-011', 'Temperature excursion LITHO-02 during alignment','2026-04-06T09:00:00Z','HIGH_RISK',  'Investigating', '2026-04-06T08:30:00Z', 'Alignment',         'OP-1020', 'LITHO', 'A7-Litho',  'user-garcia', 'Litho',      'Temperature spike during wafer alignment phase on LITHO-02.'),
  ('iss-014', 'Chamber seal degradation LITHO-07',            '2026-04-07T14:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-07T13:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-rossi',  'Litho',      'Slow chamber leak detected via He leak test. O-ring replacement scheduled.'),
  ('iss-020', 'Endpoint detection failure ETCH-03 lot 7742',  '2026-04-10T15:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-10T14:30:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-chen',   'Etch',       'Endpoint detection failed to trigger on lot 7742. Over-etch occurred.'),
  ('iss-025', 'Voltage transient FAC-XFMR-01',                '2026-04-12T18:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-12T17:30:00Z', 'Power Distribution', NULL,     NULL,    'FAC-Power', 'user-hoffman','Facilities', 'Transient voltage event on transformer FAC-XFMR-01 during load switching.');

-- Issue labels
INSERT INTO issue_label (issue_id, label) VALUES
  ('iss-001', 'LotImpacting'),
  ('iss-004', 'LotImpacting'),
  ('iss-004', 'NeedsEngReview'),
  ('iss-007', 'NeedsEngReview'),
  ('iss-011', 'Recurring'),
  ('iss-014', 'Recurring'),
  ('iss-020', 'LotImpacting');

-- Issue activity
INSERT INTO issue_activity (issue_id, type, timestamp, author, text, assigned_to) VALUES
  ('iss-001', 'created',    '2026-04-01T08:00:00Z', 'H. Tanaka', NULL, NULL),
  ('iss-001', 'comment',    '2026-04-01T08:30:00Z', 'H. Tanaka', 'Initial assessment: temp controller may be failing. Requesting PM data.', NULL),
  ('iss-001', 'assignment', '2026-04-01T09:00:00Z', 'T. Yamamoto', NULL, 'user-rossi'),
  ('iss-002', 'created',    '2026-04-01T09:30:00Z', 'M. Chen',   NULL, NULL),
  ('iss-003', 'created',    '2026-04-02T10:00:00Z', 'S. Patel',  NULL, NULL),
  ('iss-003', 'comment',    '2026-04-02T11:00:00Z', 'S. Patel',  'Recalibrated MFC. Flow rates back to nominal.', NULL),
  ('iss-004', 'created',    '2026-04-02T14:00:00Z', 'L. Rossi',  NULL, NULL),
  ('iss-005', 'created',    '2026-04-03T06:00:00Z', 'K. Müller', NULL, NULL),
  ('iss-006', 'created',    '2026-04-03T11:00:00Z', 'H. Tanaka', NULL, NULL),
  ('iss-007', 'created',    '2026-04-04T08:30:00Z', 'A. Kim',    NULL, NULL),
  ('iss-007', 'comment',    '2026-04-04T09:00:00Z', 'A. Kim',    'Pump making unusual noise. Vendor service call placed.', NULL),
  ('iss-011', 'created',    '2026-04-06T09:00:00Z', 'R. Garcia', NULL, NULL),
  ('iss-014', 'created',    '2026-04-07T14:00:00Z', 'L. Rossi',  NULL, NULL),
  ('iss-020', 'created',    '2026-04-10T15:00:00Z', 'M. Chen',   NULL, NULL),
  ('iss-025', 'created',    '2026-04-12T18:00:00Z', 'B. Hoffman',NULL, NULL);

-- Issue-alarm links
INSERT INTO issue_alarm (issue_id, alarm_id, attached_at, attached_by, merged_at, merged_by, merged_to_issue_id) VALUES
  ('iss-001', 'alm-001', '2026-04-01T08:05:00Z', 'H. Tanaka', NULL,                   NULL,         NULL),
  ('iss-001', 'alm-006', '2026-04-01T08:10:00Z', 'H. Tanaka', NULL,                   NULL,         NULL),
  ('iss-002', 'alm-002', '2026-04-01T09:35:00Z', 'M. Chen',   NULL,                   NULL,         NULL),
  ('iss-003', 'alm-003', '2026-04-02T10:05:00Z', 'S. Patel',  NULL,                   NULL,         NULL),
  ('iss-004', 'alm-004', '2026-04-02T14:05:00Z', 'L. Rossi',  NULL,                   NULL,         NULL),
  ('iss-005', 'alm-005', '2026-04-03T06:05:00Z', 'K. Müller', NULL,                   NULL,         NULL),
  ('iss-007', 'alm-007', '2026-04-04T08:35:00Z', 'A. Kim',    NULL,                   NULL,         NULL),
  ('iss-011', 'alm-011', '2026-04-06T09:05:00Z', 'R. Garcia', NULL,                   NULL,         NULL),
  ('iss-014', 'alm-014', '2026-04-07T14:05:00Z', 'L. Rossi',  NULL,                   NULL,         NULL),
  ('iss-020', 'alm-020', '2026-04-10T15:05:00Z', 'M. Chen',   NULL,                   NULL,         NULL),
  -- alm-010 moved from iss-006 → iss-001
  ('iss-006', 'alm-010', '2026-04-03T11:05:00Z', 'H. Tanaka', '2026-04-03T12:00:00Z', 'H. Tanaka',  'iss-001'),
  ('iss-001', 'alm-010', '2026-04-03T12:00:00Z', 'H. Tanaka', NULL,                   NULL,         NULL);

-- Workflows
INSERT INTO workflow_instance (issue_id, definition_id, status) VALUES ('iss-001', 'generic_linear_v1', 'Active');
INSERT INTO workflow_step (instance_id, step_id, status, actor_id, completed_at) VALUES (1, 'chart_owner_comment', 'completed', 'user-tanaka', '2026-04-01T09:00:00Z');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (1, 'resolved', 'ongoing');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (1, 'closed', 'pending');

INSERT INTO workflow_instance (issue_id, definition_id, status) VALUES ('iss-007', 'spc_ooc_branching_v1', 'Active');
INSERT INTO workflow_step (instance_id, step_id, status, actor_id, completed_at) VALUES (2, 'chart_owner_comment', 'completed', 'user-kim', '2026-04-04T09:30:00Z');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'l5_review',          'ongoing');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'l4_review',          'pending');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'pi_comment',         'ongoing');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'attach_report',      'ongoing');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'verify_calibration', 'ongoing');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'meeting',            'pending');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'lot_disposition',    'pending');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'resolved',           'pending');
INSERT INTO workflow_step (instance_id, step_id, status) VALUES (2, 'closed',             'pending');

INSERT INTO workflow_instance (issue_id, definition_id, status, completed_at) VALUES ('iss-003', 'generic_linear_v1', 'Completed', '2026-04-02T12:00:00Z');
INSERT INTO workflow_step (instance_id, step_id, status, actor_id, completed_at) VALUES (3, 'chart_owner_comment', 'completed', 'user-patel', '2026-04-02T10:30:00Z');
INSERT INTO workflow_step (instance_id, step_id, status, actor_id, completed_at) VALUES (3, 'resolved',           'completed', 'user-patel', '2026-04-02T11:30:00Z');
INSERT INTO workflow_step (instance_id, step_id, status, actor_id, completed_at) VALUES (3, 'closed',             'completed', 'user-patel', '2026-04-02T12:00:00Z');
