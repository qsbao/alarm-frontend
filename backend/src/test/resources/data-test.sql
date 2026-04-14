-- ============================================================
-- Test-only seed data (shadows src/main/resources/data.sql)
-- ============================================================

-- Users (27 total — matches test expectations)
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
  ('SENSOR_HUB',   'Sensor Hub',   'SYSTEM'),
  ('user-yamamoto','T. Yamamoto','Litho'),
  ('user-lee',     'D. Lee',     'Etch'),
  ('user-weber',   'F. Weber',   'Facilities'),
  ('user-wong',    'E. Wong',    'Etch'),
  ('user-silva',   'P. Silva',   'Litho'),
  ('user-jones',   'R. Jones',   'Facilities'),
  ('user-brown',   'K. Brown',   'Etch'),
  ('user-davis',   'L. Davis',   'Litho'),
  ('user-miller',  'S. Miller',  'Etch'),
  ('user-wilson',  'T. Wilson',  'Facilities'),
  ('user-moore',   'A. Moore',   'Litho'),
  ('user-taylor',  'B. Taylor',  'Etch'),
  ('user-anderson','C. Anderson','Facilities'),
  ('user-thomas',  'D. Thomas',  'Litho');

-- Alarms (150 total)
-- Core alarms linked to issues (same as production data)
INSERT INTO alarm (id, type, severity, message, alarm_value, unit, alarm_time, recovery_time, eqp_id, chamber_id, product_id, oper_name, owner, department, chart_owner_id, status, risk_level) VALUES
  ('alm-001', 'example-plugin:TempSpike',   'P1', 'Chamber temperature exceeded threshold', 202.69, '°C',    '2026-04-15 00:59:10+00:00', NULL,                       'CVD-04',   'A', 'D1-PVD',  'Lot start',      'H. Tanaka', 'Litho',      'user-rossi',  'Open',  NULL),
  ('alm-002', 'example-plugin:TempSpike',   'P1', 'Chamber pressure below setpoint',        10.78,  'mTorr', '2026-04-28 08:25:56+00:00', NULL,                       'CVD-09',   'C', 'F4-Metro','Endpoint detect', 'M. Chen',   'Etch',       'user-patel',  'Open',  NULL),
  ('alm-003', 'example-plugin:TempSpike',   'P2', 'Process gas flow out of range',          93.04,  'sccm',  '2026-04-21 18:34:24+00:00', NULL,                       'PVD-02',   'D', 'A7-Litho','Idle / standby',  'S. Patel',  'Etch',       'user-kim',    'Open',  NULL),
  ('alm-004', 'example-plugin:ChamberLeak', 'P2', 'Vacuum leak rate above tolerance',       0.33,   'sccm',  '2026-04-10 11:23:53+00:00', NULL,                       'CVD-04',   'A', 'F4-Metro','Endpoint detect', 'K. Müller', 'Facilities', NULL,          'Open',  'LOW_RISK'),
  ('alm-005', 'example-plugin:TempSpike',   'P2', 'DC bias voltage sag detected',           308.83, 'V',     '2026-04-04 11:34:28+00:00', NULL,                       'LITHO-07', 'D', 'C2-CVD',  'Idle / standby',  'L. Rossi',  'Litho',      'user-tanaka', 'Open',  NULL),
  ('alm-006', 'example-plugin:TempSpike',   'P2', 'In-situ particle count spike',           15.97,  'cnt',   '2026-04-19 13:09:46+00:00', NULL,                       'METRO-01', 'C', 'F4-Metro','Recipe step 3',   'J. Smith',  'Facilities', NULL,          'Acked', NULL),
  ('alm-007', 'example-plugin:ChamberLeak', 'P3', 'Turbopump speed deviation',              957.54, 'Hz',    '2026-04-08 12:46:53+00:00', NULL,                       'CVD-04',   'D', 'A7-Litho','Process clean',   'A. Kim',    'Etch',       'user-chen',   'Acked', NULL),
  ('alm-010', 'example-plugin:TempSpike',   'P0', 'Etch endpoint signal drift',             6.22,   '%',     '2026-04-04 08:46:33+00:00', NULL,                       'CVD-04',   'C', 'A7-Litho','Vent cycle',      'S. Patel',  'Etch',       'user-patel',  'Acked', NULL),
  ('alm-011', 'example-plugin:TempSpike',   'P1', 'Chamber temperature exceeded threshold', 269.71, '°C',    '2026-04-12 14:32:39+00:00', '2026-04-12 14:54:39+00:00','PVD-02',   'C', 'A7-Litho','Endpoint detect', 'H. Tanaka', 'Litho',      'user-rossi',  'Open',  'LOW_RISK'),
  ('alm-014', 'example-plugin:ChamberLeak', 'P2', 'Vacuum leak rate above tolerance',       0.37,   'sccm',  '2026-04-25 10:51:31+00:00', '2026-04-25 11:44:31+00:00','CVD-04',   'D', 'A7-Litho','Recipe step 3',   'K. Müller', 'Facilities', 'user-smith',  'Open',  'HIGH_RISK'),
  ('alm-020', 'example-plugin:TempSpike',   'P0', 'Etch endpoint signal drift',             6.14,   '%',     '2026-04-01 13:20:07+00:00', '2026-04-01 14:01:07+00:00','LITHO-07', 'A', 'C2-CVD',  'Idle / standby',  'S. Patel',  'Etch',       'user-patel',  'Acked', NULL);

-- Unlinked alarms for lifecycle / link / unlink / move / merge tests
INSERT INTO alarm (id, type, severity, message, alarm_value, unit, alarm_time, recovery_time, eqp_id, chamber_id, product_id, oper_name, owner, department, chart_owner_id, status, risk_level) VALUES
  ('alm-012', 'example-plugin:TempSpike',   'P2', 'RF power fluctuation',                   45.2,   'W',     '2026-04-06 10:00:00+00:00', NULL,                       'CVD-04',   'B', 'A7-Litho','Lot start',       'M. Chen',   'Etch',       NULL,          'Open',  NULL),
  ('alm-021', 'example-plugin:ChamberLeak', 'P2', 'Gas line pressure drop',                 0.28,   'sccm',  '2026-04-07 11:00:00+00:00', NULL,                       'PVD-02',   'C', 'A7-Litho','Recipe step 3',   'S. Patel',  'Etch',       NULL,          'Open',  NULL),
  ('alm-030', 'example-plugin:TempSpike',   'P1', 'Heater zone imbalance',                  185.3,  '°C',    '2026-04-08 09:00:00+00:00', NULL,                       'CVD-09',   'A', 'A7-Litho','Lot start',       'A. Kim',    'Etch',       NULL,          'Open',  NULL),
  ('alm-031', 'example-plugin:ChamberLeak', 'P2', 'Foreline pressure rise',                 0.45,   'sccm',  '2026-04-09 10:00:00+00:00', '2026-04-09 10:30:00+00:00','CVD-04',   'D', 'A7-Litho','Vent cycle',      'M. Chen',   'Etch',       NULL,          'Open',  NULL),
  ('alm-032', 'example-plugin:TempSpike',   'P1', 'Substrate temperature overshoot',        215.8,  '°C',    '2026-04-10 08:00:00+00:00', NULL,                       'LITHO-07', 'A', 'A7-Litho','Lot start',       'H. Tanaka', 'Litho',      NULL,          'Open',  NULL),
  ('alm-040', 'example-plugin:TempSpike',   'P2', 'Cooling water temperature rise',         28.5,   '°C',    '2026-04-11 07:00:00+00:00', NULL,                       'CVD-04',   'B', 'F4-Metro','Endpoint detect', 'M. Chen',   'Etch',       NULL,          'Open',  NULL),
  ('alm-050', 'example-plugin:ChamberLeak', 'P1', 'Chamber seal degradation',               0.52,   'sccm',  '2026-04-12 09:00:00+00:00', NULL,                       'PVD-02',   'C', 'A7-Litho','Recipe step 3',   'S. Patel',  'Etch',       NULL,          'Open',  NULL),
  ('alm-060', 'example-plugin:TempSpike',   'P2', 'Exhaust temperature spike',              165.4,  '°C',    '2026-04-13 11:00:00+00:00', NULL,                       'CVD-04',   'A', 'A7-Litho','Lot start',       'L. Rossi',  'Litho',      NULL,          'Open',  NULL),
  ('alm-070', 'example-plugin:ChamberLeak', 'P2', 'MFC zero drift',                         0.15,   'sccm',  '2026-04-14 08:00:00+00:00', NULL,                       'CVD-09',   'B', 'B3-Etch', 'Lot start',       'A. Kim',    'Etch',       NULL,          'Open',  NULL),
  ('alm-080', 'example-plugin:TempSpike',   'P3', 'Thermocouple noise',                     3.2,    '°C',    '2026-04-15 07:00:00+00:00', NULL,                       'CVD-04',   'C', 'B3-Etch', 'Recipe step 3',   'S. Patel',  'Etch',       NULL,          'Open',  NULL);

-- Bulk alarms to reach 150 total (21 so far, need 129 more)
-- Generated alarms alm-100 through alm-228
INSERT INTO alarm (id, type, severity, message, alarm_value, unit, alarm_time, eqp_id, chamber_id, product_id, oper_name, owner, department, status) VALUES
  ('alm-100', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 100.0, '°C', '2026-04-01 01:00:00+00:00', 'CVD-04',   'A', 'A7-Litho', 'Lot start',      'H. Tanaka', 'Litho', 'Open'),
  ('alm-101', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 0.1,   'sccm','2026-04-01 02:00:00+00:00', 'PVD-02',   'B', 'B3-Etch',  'Recipe step 3',  'M. Chen',   'Etch',  'Open'),
  ('alm-102', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 200.0, '°C', '2026-04-01 03:00:00+00:00', 'CVD-09',   'C', 'F4-Metro', 'Endpoint detect', 'S. Patel',  'Etch',  'Open'),
  ('alm-103', 'example-plugin:ChamberLeak', 'P2', 'Bulk test alarm', 0.2,   'sccm','2026-04-01 04:00:00+00:00', 'LITHO-07', 'D', 'C2-CVD',  'Idle / standby', 'L. Rossi',  'Litho', 'Open'),
  ('alm-104', 'example-plugin:TempSpike',   'P0', 'Bulk test alarm', 300.0, '°C', '2026-04-01 05:00:00+00:00', 'METRO-01', 'A', 'D1-PVD',  'Vent cycle',     'A. Kim',    'Etch',  'Acked'),
  ('alm-105', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 0.3,   'sccm','2026-04-01 06:00:00+00:00', 'CVD-04',   'B', 'A7-Litho','Process clean',  'K. Müller', 'Facilities','Open'),
  ('alm-106', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 150.0, '°C', '2026-04-01 07:00:00+00:00', 'PVD-02',   'C', 'B3-Etch',  'Lot start',      'J. Smith',  'Facilities','Open'),
  ('alm-107', 'example-plugin:ChamberLeak', 'P1', 'Bulk test alarm', 0.4,   'sccm','2026-04-01 08:00:00+00:00', 'CVD-09',   'D', 'F4-Metro', 'Recipe step 3',  'H. Tanaka', 'Litho', 'Open'),
  ('alm-108', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 180.0, '°C', '2026-04-02 01:00:00+00:00', 'LITHO-07', 'A', 'C2-CVD',  'Endpoint detect', 'M. Chen',   'Etch',  'Open'),
  ('alm-109', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 0.5,   'sccm','2026-04-02 02:00:00+00:00', 'CVD-04',   'B', 'A7-Litho','Idle / standby', 'S. Patel',  'Etch',  'Acked'),
  ('alm-110', 'example-plugin:TempSpike',   'P0', 'Bulk test alarm', 250.0, '°C', '2026-04-02 03:00:00+00:00', 'PVD-02',   'C', 'D1-PVD',  'Vent cycle',     'L. Rossi',  'Litho', 'Open'),
  ('alm-111', 'example-plugin:ChamberLeak', 'P2', 'Bulk test alarm', 0.6,   'sccm','2026-04-02 04:00:00+00:00', 'CVD-09',   'D', 'B3-Etch',  'Process clean',  'A. Kim',    'Etch',  'Open'),
  ('alm-112', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 190.0, '°C', '2026-04-02 05:00:00+00:00', 'METRO-01', 'A', 'F4-Metro', 'Lot start',      'K. Müller', 'Facilities','Open'),
  ('alm-113', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 0.7,   'sccm','2026-04-02 06:00:00+00:00', 'CVD-04',   'B', 'A7-Litho','Recipe step 3',  'J. Smith',  'Facilities','Open'),
  ('alm-114', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 170.0, '°C', '2026-04-02 07:00:00+00:00', 'LITHO-07', 'C', 'C2-CVD',  'Endpoint detect', 'H. Tanaka', 'Litho', 'Acked'),
  ('alm-115', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 0.8,   'sccm','2026-04-02 08:00:00+00:00', 'PVD-02',   'D', 'D1-PVD',  'Idle / standby', 'M. Chen',   'Etch',  'Open'),
  ('alm-116', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 210.0, '°C', '2026-04-03 01:00:00+00:00', 'CVD-04',   'A', 'A7-Litho','Vent cycle',     'S. Patel',  'Etch',  'Open'),
  ('alm-117', 'example-plugin:ChamberLeak', 'P2', 'Bulk test alarm', 0.9,   'sccm','2026-04-03 02:00:00+00:00', 'CVD-09',   'B', 'B3-Etch',  'Process clean',  'L. Rossi',  'Litho', 'Open'),
  ('alm-118', 'example-plugin:TempSpike',   'P3', 'Bulk test alarm', 160.0, '°C', '2026-04-03 03:00:00+00:00', 'METRO-01', 'C', 'F4-Metro', 'Lot start',      'A. Kim',    'Etch',  'Open'),
  ('alm-119', 'example-plugin:ChamberLeak', 'P1', 'Bulk test alarm', 1.0,   'sccm','2026-04-03 04:00:00+00:00', 'CVD-04',   'D', 'C2-CVD',  'Recipe step 3',  'K. Müller', 'Facilities','Acked'),
  ('alm-120', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 195.0, '°C', '2026-04-03 05:00:00+00:00', 'LITHO-07', 'A', 'D1-PVD',  'Endpoint detect', 'J. Smith',  'Facilities','Open'),
  ('alm-121', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 1.1,   'sccm','2026-04-03 06:00:00+00:00', 'PVD-02',   'B', 'A7-Litho','Idle / standby', 'H. Tanaka', 'Litho', 'Open'),
  ('alm-122', 'example-plugin:TempSpike',   'P3', 'Bulk test alarm', 140.0, '°C', '2026-04-03 07:00:00+00:00', 'CVD-09',   'C', 'B3-Etch',  'Vent cycle',     'M. Chen',   'Etch',  'Open'),
  ('alm-123', 'example-plugin:ChamberLeak', 'P1', 'Bulk test alarm', 1.2,   'sccm','2026-04-03 08:00:00+00:00', 'CVD-04',   'D', 'F4-Metro', 'Process clean',  'S. Patel',  'Etch',  'Open'),
  ('alm-124', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 175.0, '°C', '2026-04-04 01:00:00+00:00', 'METRO-01', 'A', 'A7-Litho','Lot start',      'L. Rossi',  'Litho', 'Acked'),
  ('alm-125', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 1.3,   'sccm','2026-04-04 02:00:00+00:00', 'LITHO-07', 'B', 'C2-CVD',  'Recipe step 3',  'A. Kim',    'Etch',  'Open'),
  ('alm-126', 'example-plugin:TempSpike',   'P3', 'Bulk test alarm', 130.0, '°C', '2026-04-04 03:00:00+00:00', 'PVD-02',   'C', 'D1-PVD',  'Endpoint detect', 'K. Müller', 'Facilities','Open'),
  ('alm-127', 'example-plugin:ChamberLeak', 'P1', 'Bulk test alarm', 1.4,   'sccm','2026-04-04 04:00:00+00:00', 'CVD-04',   'D', 'B3-Etch',  'Idle / standby', 'J. Smith',  'Facilities','Open'),
  ('alm-128', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 205.0, '°C', '2026-04-04 05:00:00+00:00', 'CVD-09',   'A', 'F4-Metro', 'Vent cycle',     'H. Tanaka', 'Litho', 'Open'),
  ('alm-129', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 1.5,   'sccm','2026-04-04 06:00:00+00:00', 'CVD-04',   'B', 'A7-Litho','Process clean',  'M. Chen',   'Etch',  'Open'),
  ('alm-130', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 220.0, '°C', '2026-04-05 01:00:00+00:00', 'LITHO-07', 'C', 'C2-CVD',  'Lot start',      'S. Patel',  'Etch',  'Acked'),
  ('alm-131', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 1.6,   'sccm','2026-04-05 02:00:00+00:00', 'PVD-02',   'D', 'D1-PVD',  'Recipe step 3',  'L. Rossi',  'Litho', 'Open'),
  ('alm-132', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 185.0, '°C', '2026-04-05 03:00:00+00:00', 'METRO-01', 'A', 'B3-Etch',  'Endpoint detect', 'A. Kim',    'Etch',  'Open'),
  ('alm-133', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 1.7,   'sccm','2026-04-05 04:00:00+00:00', 'CVD-04',   'B', 'F4-Metro', 'Idle / standby', 'K. Müller', 'Facilities','Open'),
  ('alm-134', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 230.0, '°C', '2026-04-05 05:00:00+00:00', 'CVD-09',   'C', 'A7-Litho','Vent cycle',     'J. Smith',  'Facilities','Open'),
  ('alm-135', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 1.8,   'sccm','2026-04-05 06:00:00+00:00', 'LITHO-07', 'D', 'C2-CVD',  'Process clean',  'H. Tanaka', 'Litho', 'Open'),
  ('alm-136', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 155.0, '°C', '2026-04-05 07:00:00+00:00', 'PVD-02',   'A', 'D1-PVD',  'Lot start',      'M. Chen',   'Etch',  'Open'),
  ('alm-137', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 1.9,   'sccm','2026-04-05 08:00:00+00:00', 'CVD-04',   'B', 'B3-Etch',  'Recipe step 3',  'S. Patel',  'Etch',  'Acked'),
  ('alm-138', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 240.0, '°C', '2026-04-06 01:00:00+00:00', 'METRO-01', 'C', 'F4-Metro', 'Endpoint detect', 'L. Rossi',  'Litho', 'Open'),
  ('alm-139', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 2.0,   'sccm','2026-04-06 02:00:00+00:00', 'CVD-09',   'D', 'A7-Litho','Idle / standby', 'A. Kim',    'Etch',  'Open'),
  ('alm-140', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 165.0, '°C', '2026-04-06 03:00:00+00:00', 'CVD-04',   'A', 'C2-CVD',  'Vent cycle',     'K. Müller', 'Facilities','Open'),
  ('alm-141', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 2.1,   'sccm','2026-04-06 04:00:00+00:00', 'LITHO-07', 'B', 'D1-PVD',  'Process clean',  'J. Smith',  'Facilities','Open'),
  ('alm-142', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 225.0, '°C', '2026-04-06 05:00:00+00:00', 'PVD-02',   'C', 'B3-Etch',  'Lot start',      'H. Tanaka', 'Litho', 'Open'),
  ('alm-143', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 2.2,   'sccm','2026-04-06 06:00:00+00:00', 'CVD-04',   'D', 'F4-Metro', 'Recipe step 3',  'M. Chen',   'Etch',  'Open'),
  ('alm-144', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 178.0, '°C', '2026-04-06 07:00:00+00:00', 'METRO-01', 'A', 'A7-Litho','Endpoint detect', 'S. Patel',  'Etch',  'Acked'),
  ('alm-145', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 2.3,   'sccm','2026-04-06 08:00:00+00:00', 'CVD-09',   'B', 'C2-CVD',  'Idle / standby', 'L. Rossi',  'Litho', 'Open'),
  ('alm-146', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 235.0, '°C', '2026-04-07 01:00:00+00:00', 'LITHO-07', 'C', 'D1-PVD',  'Vent cycle',     'A. Kim',    'Etch',  'Open'),
  ('alm-147', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 2.4,   'sccm','2026-04-07 02:00:00+00:00', 'PVD-02',   'D', 'B3-Etch',  'Process clean',  'K. Müller', 'Facilities','Open'),
  ('alm-148', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 168.0, '°C', '2026-04-07 03:00:00+00:00', 'CVD-04',   'A', 'F4-Metro', 'Lot start',      'J. Smith',  'Facilities','Acked'),
  ('alm-149', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 2.5,   'sccm','2026-04-07 04:00:00+00:00', 'CVD-09',   'B', 'A7-Litho','Recipe step 3',  'H. Tanaka', 'Litho', 'Open'),
  ('alm-150', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 245.0, '°C', '2026-04-07 05:00:00+00:00', 'METRO-01', 'C', 'C2-CVD',  'Endpoint detect', 'M. Chen',   'Etch',  'Open'),
  ('alm-151', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 2.6,   'sccm','2026-04-07 06:00:00+00:00', 'CVD-04',   'D', 'D1-PVD',  'Idle / standby', 'S. Patel',  'Etch',  'Open'),
  ('alm-152', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 188.0, '°C', '2026-04-07 07:00:00+00:00', 'LITHO-07', 'A', 'B3-Etch',  'Vent cycle',     'L. Rossi',  'Litho', 'Open'),
  ('alm-153', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 2.7,   'sccm','2026-04-07 08:00:00+00:00', 'PVD-02',   'B', 'F4-Metro', 'Process clean',  'A. Kim',    'Etch',  'Acked'),
  ('alm-154', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 215.0, '°C', '2026-04-08 01:00:00+00:00', 'CVD-04',   'C', 'A7-Litho','Lot start',      'K. Müller', 'Facilities','Open'),
  ('alm-155', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 2.8,   'sccm','2026-04-08 02:00:00+00:00', 'CVD-09',   'D', 'C2-CVD',  'Recipe step 3',  'J. Smith',  'Facilities','Open'),
  ('alm-156', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 172.0, '°C', '2026-04-08 03:00:00+00:00', 'METRO-01', 'A', 'D1-PVD',  'Endpoint detect', 'H. Tanaka', 'Litho', 'Open'),
  ('alm-157', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 2.9,   'sccm','2026-04-08 04:00:00+00:00', 'LITHO-07', 'B', 'B3-Etch',  'Idle / standby', 'M. Chen',   'Etch',  'Open'),
  ('alm-158', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 228.0, '°C', '2026-04-08 05:00:00+00:00', 'PVD-02',   'C', 'F4-Metro', 'Vent cycle',     'S. Patel',  'Etch',  'Open'),
  ('alm-159', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 3.0,   'sccm','2026-04-08 06:00:00+00:00', 'CVD-04',   'D', 'A7-Litho','Process clean',  'L. Rossi',  'Litho', 'Acked'),
  ('alm-160', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 162.0, '°C', '2026-04-08 07:00:00+00:00', 'CVD-09',   'A', 'C2-CVD',  'Lot start',      'A. Kim',    'Etch',  'Open'),
  ('alm-161', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 3.1,   'sccm','2026-04-08 08:00:00+00:00', 'CVD-04',   'B', 'D1-PVD',  'Recipe step 3',  'K. Müller', 'Facilities','Open'),
  ('alm-162', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 238.0, '°C', '2026-04-09 01:00:00+00:00', 'METRO-01', 'C', 'B3-Etch',  'Endpoint detect', 'J. Smith',  'Facilities','Open'),
  ('alm-163', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 3.2,   'sccm','2026-04-09 02:00:00+00:00', 'LITHO-07', 'D', 'F4-Metro', 'Idle / standby', 'H. Tanaka', 'Litho', 'Open'),
  ('alm-164', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 182.0, '°C', '2026-04-09 03:00:00+00:00', 'PVD-02',   'A', 'A7-Litho','Vent cycle',     'M. Chen',   'Etch',  'Acked'),
  ('alm-165', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 3.3,   'sccm','2026-04-09 04:00:00+00:00', 'CVD-04',   'B', 'C2-CVD',  'Process clean',  'S. Patel',  'Etch',  'Open'),
  ('alm-166', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 222.0, '°C', '2026-04-09 05:00:00+00:00', 'CVD-09',   'C', 'D1-PVD',  'Lot start',      'L. Rossi',  'Litho', 'Open'),
  ('alm-167', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 3.4,   'sccm','2026-04-09 06:00:00+00:00', 'CVD-04',   'D', 'B3-Etch',  'Recipe step 3',  'A. Kim',    'Etch',  'Open'),
  ('alm-168', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 176.0, '°C', '2026-04-09 07:00:00+00:00', 'METRO-01', 'A', 'F4-Metro', 'Endpoint detect', 'K. Müller', 'Facilities','Open'),
  ('alm-169', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 3.5,   'sccm','2026-04-09 08:00:00+00:00', 'LITHO-07', 'B', 'A7-Litho','Idle / standby', 'J. Smith',  'Facilities','Acked'),
  ('alm-170', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 232.0, '°C', '2026-04-10 01:00:00+00:00', 'PVD-02',   'C', 'C2-CVD',  'Vent cycle',     'H. Tanaka', 'Litho', 'Open'),
  ('alm-171', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 3.6,   'sccm','2026-04-10 02:00:00+00:00', 'CVD-04',   'D', 'D1-PVD',  'Process clean',  'M. Chen',   'Etch',  'Open'),
  ('alm-172', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 169.0, '°C', '2026-04-10 03:00:00+00:00', 'CVD-09',   'A', 'B3-Etch',  'Lot start',      'S. Patel',  'Etch',  'Open'),
  ('alm-173', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 3.7,   'sccm','2026-04-10 04:00:00+00:00', 'CVD-04',   'B', 'F4-Metro', 'Recipe step 3',  'L. Rossi',  'Litho', 'Open'),
  ('alm-174', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 242.0, '°C', '2026-04-10 05:00:00+00:00', 'METRO-01', 'C', 'A7-Litho','Endpoint detect', 'A. Kim',    'Etch',  'Open'),
  ('alm-175', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 3.8,   'sccm','2026-04-10 06:00:00+00:00', 'LITHO-07', 'D', 'C2-CVD',  'Idle / standby', 'K. Müller', 'Facilities','Acked'),
  ('alm-176', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 192.0, '°C', '2026-04-10 07:00:00+00:00', 'PVD-02',   'A', 'D1-PVD',  'Vent cycle',     'J. Smith',  'Facilities','Open'),
  ('alm-177', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 3.9,   'sccm','2026-04-10 08:00:00+00:00', 'CVD-04',   'B', 'B3-Etch',  'Process clean',  'H. Tanaka', 'Litho', 'Open'),
  ('alm-178', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 218.0, '°C', '2026-04-11 01:00:00+00:00', 'CVD-09',   'C', 'F4-Metro', 'Lot start',      'M. Chen',   'Etch',  'Open'),
  ('alm-179', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 4.0,   'sccm','2026-04-11 02:00:00+00:00', 'CVD-04',   'D', 'A7-Litho','Recipe step 3',  'S. Patel',  'Etch',  'Open'),
  ('alm-180', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 183.0, '°C', '2026-04-11 03:00:00+00:00', 'METRO-01', 'A', 'C2-CVD',  'Endpoint detect', 'L. Rossi',  'Litho', 'Open'),
  ('alm-181', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 4.1,   'sccm','2026-04-11 04:00:00+00:00', 'LITHO-07', 'B', 'D1-PVD',  'Idle / standby', 'A. Kim',    'Etch',  'Open'),
  ('alm-182', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 236.0, '°C', '2026-04-11 05:00:00+00:00', 'PVD-02',   'C', 'B3-Etch',  'Vent cycle',     'K. Müller', 'Facilities','Acked'),
  ('alm-183', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 4.2,   'sccm','2026-04-11 06:00:00+00:00', 'CVD-04',   'D', 'F4-Metro', 'Process clean',  'J. Smith',  'Facilities','Open'),
  ('alm-184', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 174.0, '°C', '2026-04-11 07:00:00+00:00', 'CVD-09',   'A', 'A7-Litho','Lot start',      'H. Tanaka', 'Litho', 'Open'),
  ('alm-185', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 4.3,   'sccm','2026-04-11 08:00:00+00:00', 'CVD-04',   'B', 'C2-CVD',  'Recipe step 3',  'M. Chen',   'Etch',  'Open'),
  ('alm-186', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 226.0, '°C', '2026-04-12 01:00:00+00:00', 'METRO-01', 'C', 'D1-PVD',  'Endpoint detect', 'S. Patel',  'Etch',  'Open'),
  ('alm-187', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 4.4,   'sccm','2026-04-12 02:00:00+00:00', 'LITHO-07', 'D', 'B3-Etch',  'Idle / standby', 'L. Rossi',  'Litho', 'Open'),
  ('alm-188', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 186.0, '°C', '2026-04-12 03:00:00+00:00', 'PVD-02',   'A', 'F4-Metro', 'Vent cycle',     'A. Kim',    'Etch',  'Acked'),
  ('alm-189', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 4.5,   'sccm','2026-04-12 04:00:00+00:00', 'CVD-04',   'B', 'A7-Litho','Process clean',  'K. Müller', 'Facilities','Open'),
  ('alm-190', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 243.0, '°C', '2026-04-12 05:00:00+00:00', 'CVD-09',   'C', 'C2-CVD',  'Lot start',      'J. Smith',  'Facilities','Open'),
  ('alm-191', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 4.6,   'sccm','2026-04-12 06:00:00+00:00', 'CVD-04',   'D', 'D1-PVD',  'Recipe step 3',  'H. Tanaka', 'Litho', 'Open'),
  ('alm-192', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 179.0, '°C', '2026-04-12 07:00:00+00:00', 'METRO-01', 'A', 'B3-Etch',  'Endpoint detect', 'M. Chen',   'Etch',  'Open'),
  ('alm-193', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 4.7,   'sccm','2026-04-12 08:00:00+00:00', 'LITHO-07', 'B', 'F4-Metro', 'Idle / standby', 'S. Patel',  'Etch',  'Open'),
  ('alm-194', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 231.0, '°C', '2026-04-13 01:00:00+00:00', 'PVD-02',   'C', 'A7-Litho','Vent cycle',     'L. Rossi',  'Litho', 'Acked'),
  ('alm-195', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 4.8,   'sccm','2026-04-13 02:00:00+00:00', 'CVD-04',   'D', 'C2-CVD',  'Process clean',  'A. Kim',    'Etch',  'Open'),
  ('alm-196', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 167.0, '°C', '2026-04-13 03:00:00+00:00', 'CVD-09',   'A', 'D1-PVD',  'Lot start',      'K. Müller', 'Facilities','Open'),
  ('alm-197', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 4.9,   'sccm','2026-04-13 04:00:00+00:00', 'CVD-04',   'B', 'B3-Etch',  'Recipe step 3',  'J. Smith',  'Facilities','Open'),
  ('alm-198', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 241.0, '°C', '2026-04-13 05:00:00+00:00', 'METRO-01', 'C', 'F4-Metro', 'Endpoint detect', 'H. Tanaka', 'Litho', 'Open'),
  ('alm-199', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 5.0,   'sccm','2026-04-13 06:00:00+00:00', 'LITHO-07', 'D', 'A7-Litho','Idle / standby', 'M. Chen',   'Etch',  'Open'),
  ('alm-200', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 191.0, '°C', '2026-04-13 07:00:00+00:00', 'PVD-02',   'A', 'C2-CVD',  'Vent cycle',     'S. Patel',  'Etch',  'Acked'),
  ('alm-201', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 5.1,   'sccm','2026-04-13 08:00:00+00:00', 'CVD-04',   'B', 'D1-PVD',  'Process clean',  'L. Rossi',  'Litho', 'Open'),
  ('alm-202', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 224.0, '°C', '2026-04-14 01:00:00+00:00', 'CVD-09',   'C', 'B3-Etch',  'Lot start',      'A. Kim',    'Etch',  'Open'),
  ('alm-203', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 5.2,   'sccm','2026-04-14 02:00:00+00:00', 'CVD-04',   'D', 'F4-Metro', 'Recipe step 3',  'K. Müller', 'Facilities','Open'),
  ('alm-204', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 181.0, '°C', '2026-04-14 03:00:00+00:00', 'METRO-01', 'A', 'A7-Litho','Endpoint detect', 'J. Smith',  'Facilities','Open'),
  ('alm-205', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 5.3,   'sccm','2026-04-14 04:00:00+00:00', 'LITHO-07', 'B', 'C2-CVD',  'Idle / standby', 'H. Tanaka', 'Litho', 'Acked'),
  ('alm-206', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 237.0, '°C', '2026-04-14 05:00:00+00:00', 'PVD-02',   'C', 'D1-PVD',  'Vent cycle',     'M. Chen',   'Etch',  'Open'),
  ('alm-207', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 5.4,   'sccm','2026-04-14 06:00:00+00:00', 'CVD-04',   'D', 'B3-Etch',  'Process clean',  'S. Patel',  'Etch',  'Open'),
  ('alm-208', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 173.0, '°C', '2026-04-14 07:00:00+00:00', 'CVD-09',   'A', 'F4-Metro', 'Lot start',      'L. Rossi',  'Litho', 'Open'),
  ('alm-209', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 5.5,   'sccm','2026-04-14 08:00:00+00:00', 'CVD-04',   'B', 'A7-Litho','Recipe step 3',  'A. Kim',    'Etch',  'Open'),
  ('alm-210', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 229.0, '°C', '2026-04-15 01:00:00+00:00', 'METRO-01', 'C', 'C2-CVD',  'Endpoint detect', 'K. Müller', 'Facilities','Open'),
  ('alm-211', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 5.6,   'sccm','2026-04-15 02:00:00+00:00', 'LITHO-07', 'D', 'D1-PVD',  'Idle / standby', 'J. Smith',  'Facilities','Acked'),
  ('alm-212', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 187.0, '°C', '2026-04-15 03:00:00+00:00', 'PVD-02',   'A', 'B3-Etch',  'Vent cycle',     'H. Tanaka', 'Litho', 'Open'),
  ('alm-213', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 5.7,   'sccm','2026-04-15 04:00:00+00:00', 'CVD-04',   'B', 'F4-Metro', 'Process clean',  'M. Chen',   'Etch',  'Open'),
  ('alm-214', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 244.0, '°C', '2026-04-15 05:00:00+00:00', 'CVD-09',   'C', 'A7-Litho','Lot start',      'S. Patel',  'Etch',  'Open'),
  ('alm-215', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 5.8,   'sccm','2026-04-15 06:00:00+00:00', 'CVD-04',   'D', 'C2-CVD',  'Recipe step 3',  'L. Rossi',  'Litho', 'Open'),
  ('alm-216', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 177.0, '°C', '2026-04-15 07:00:00+00:00', 'METRO-01', 'A', 'D1-PVD',  'Endpoint detect', 'A. Kim',    'Etch',  'Acked'),
  ('alm-217', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 5.9,   'sccm','2026-04-15 08:00:00+00:00', 'LITHO-07', 'B', 'B3-Etch',  'Idle / standby', 'K. Müller', 'Facilities','Open'),
  ('alm-218', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 233.0, '°C', '2026-04-16 01:00:00+00:00', 'PVD-02',   'C', 'F4-Metro', 'Vent cycle',     'J. Smith',  'Facilities','Open'),
  ('alm-219', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 6.0,   'sccm','2026-04-16 02:00:00+00:00', 'CVD-04',   'D', 'A7-Litho','Process clean',  'H. Tanaka', 'Litho', 'Open'),
  ('alm-220', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 184.0, '°C', '2026-04-16 03:00:00+00:00', 'CVD-09',   'A', 'C2-CVD',  'Lot start',      'M. Chen',   'Etch',  'Open'),
  ('alm-221', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 6.1,   'sccm','2026-04-16 04:00:00+00:00', 'CVD-04',   'B', 'D1-PVD',  'Recipe step 3',  'S. Patel',  'Etch',  'Open'),
  ('alm-222', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 239.0, '°C', '2026-04-16 05:00:00+00:00', 'METRO-01', 'C', 'B3-Etch',  'Endpoint detect', 'L. Rossi',  'Litho', 'Acked'),
  ('alm-223', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 6.2,   'sccm','2026-04-16 06:00:00+00:00', 'LITHO-07', 'D', 'F4-Metro', 'Idle / standby', 'A. Kim',    'Etch',  'Open'),
  ('alm-224', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 171.0, '°C', '2026-04-16 07:00:00+00:00', 'PVD-02',   'A', 'A7-Litho','Vent cycle',     'K. Müller', 'Facilities','Open'),
  ('alm-225', 'example-plugin:ChamberLeak', 'P0', 'Bulk test alarm', 6.3,   'sccm','2026-04-16 08:00:00+00:00', 'CVD-04',   'B', 'C2-CVD',  'Process clean',  'J. Smith',  'Facilities','Open'),
  ('alm-226', 'example-plugin:TempSpike',   'P1', 'Bulk test alarm', 234.0, '°C', '2026-04-17 01:00:00+00:00', 'CVD-09',   'C', 'D1-PVD',  'Lot start',      'H. Tanaka', 'Litho', 'Open'),
  ('alm-227', 'example-plugin:ChamberLeak', 'P3', 'Bulk test alarm', 6.4,   'sccm','2026-04-17 02:00:00+00:00', 'CVD-04',   'D', 'B3-Etch',  'Recipe step 3',  'M. Chen',   'Etch',  'Open'),
  ('alm-228', 'example-plugin:TempSpike',   'P2', 'Bulk test alarm', 189.0, '°C', '2026-04-17 03:00:00+00:00', 'METRO-01', 'A', 'F4-Metro', 'Endpoint detect', 'S. Patel',  'Etch',  'Open');

-- Alarm labels
INSERT INTO alarm_label (alarm_id, label) VALUES
  ('alm-004', 'LotImpacting'),
  ('alm-007', 'NeedsEngReview'),
  ('alm-011', 'UnderObservation'),
  ('alm-100', 'FalsePositive'),
  ('alm-120', 'Recurring');

-- Issues (25 total)
INSERT INTO issue (id, title, issue_date, risk_level, status, issue_time, oper_name, oper_no, module, product, owner_id, department, description) VALUES
  ('iss-001', 'Temperature excursion on LITHO-07',            '2026-04-01T08:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-01T07:45:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-tanaka', 'Litho',      'Repeated temp spikes during exposure step on LITHO-07. Wafer lot at risk.'),
  ('iss-002', 'Pressure drop in ETCH-03 chamber B',           '2026-04-01T09:30:00Z', 'HIGH_RISK',   'Triage',        '2026-04-01T09:15:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-chen',   'Etch',       'Sudden pressure drop detected in chamber B during etch process.'),
  ('iss-003', 'Flow anomaly on CVD-12',                       '2026-04-02T10:00:00Z', 'MIDDLE_RISK', 'Closed',        '2026-04-02T09:30:00Z', 'Deposition',        'OP-3030', 'CVD',   'C2-CVD',    'user-patel',  'Etch',       'Gas flow deviation detected during deposition. Resolved by recalibration.'),
  ('iss-004', 'Chamber leak LITHO-02',                        '2026-04-02T14:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-02T13:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-rossi',  'Litho',      'Helium leak test failed on LITHO-02 chamber. Production halted.'),
  ('iss-005', 'Voltage sag on FACILITIES-PSU-01',             '2026-04-03T06:00:00Z', 'HIGH_RISK',   'Closed',        '2026-04-03T05:45:00Z', 'Power Distribution', NULL,     NULL,    'FAC-Power', 'user-muller', 'Facilities', 'Voltage sag event on main PSU feeding cleanroom zone 3.'),
  ('iss-006', 'Particle count spike LITHO-07 post-maintenance','2026-04-03T11:00:00Z', 'MIDDLE_RISK','Triage',        '2026-04-03T10:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-tanaka', 'Litho',      'Elevated particle counts after scheduled maintenance window.'),
  ('iss-007', 'Vacuum fault ETCH-05',                         '2026-04-04T08:30:00Z', 'HIGH_RISK',   'Investigating', '2026-04-04T08:00:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-kim',    'Etch',       'Vacuum pump fault on ETCH-05 preventing chamber evacuation.'),
  ('iss-008', 'Coolant loop alarm CVD-04',                    '2026-04-04T12:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-04T11:30:00Z', 'Deposition',        'OP-3030', 'CVD',   'C2-CVD',    'user-patel',  'Etch',       'Coolant loop temperature alarm triggered on CVD-04.'),
  ('iss-009', 'Wafer breakage LITHO-07',                      '2026-04-05T07:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-05T06:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-garcia', 'Litho',      'Wafer breakage detected during chuck handling.'),
  ('iss-010', 'Gas cabinet leak ETCH-05',                     '2026-04-05T10:00:00Z', 'HIGH_RISK',   'Triage',        '2026-04-05T09:30:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-lee',    'Etch',       'Gas cabinet leak sensor triggered. Automatic shutoff engaged.'),
  ('iss-011', 'Temperature excursion LITHO-02 during alignment','2026-04-06T09:00:00Z','HIGH_RISK',  'Investigating', '2026-04-06T08:30:00Z', 'Alignment',         'OP-1020', 'LITHO', 'A7-Litho',  'user-garcia', 'Litho',      'Temperature spike during wafer alignment phase on LITHO-02.'),
  ('iss-012', 'RF matching issue CVD-09',                     '2026-04-06T14:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-06T13:30:00Z', 'Deposition',        'OP-3030', 'CVD',   'C2-CVD',    'user-wong',   'Etch',       'RF impedance matching network failing to lock on CVD-09.'),
  ('iss-013', 'Humidity excursion cleanroom zone 2',          '2026-04-07T06:00:00Z', 'MIDDLE_RISK', 'Closed',        '2026-04-07T05:30:00Z', 'Environmental',      NULL,     NULL,    'FAC-Power', 'user-weber',  'Facilities', 'Humidity exceeded 45% RH in cleanroom zone 2.'),
  ('iss-014', 'Chamber seal degradation LITHO-07',            '2026-04-07T14:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-07T13:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-rossi',  'Litho',      'Slow chamber leak detected via He leak test. O-ring replacement scheduled.'),
  ('iss-015', 'Particle count spike ETCH-03 post PM',         '2026-04-08T09:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-08T08:30:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-brown',  'Etch',       'Elevated particles after preventive maintenance on ETCH-03.'),
  ('iss-016', 'Chiller flow reduction LITHO-02',              '2026-04-08T15:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-08T14:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-tanaka', 'Litho',      'Chiller flow rate dropped below threshold on LITHO-02 lens.'),
  ('iss-017', 'MFC drift CVD-04 SiH4 line',                  '2026-04-09T08:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-09T07:30:00Z', 'Deposition',        'OP-3030', 'CVD',   'C2-CVD',    'user-miller', 'Etch',       'SiH4 MFC showing consistent 3% drift from setpoint.'),
  ('iss-018', 'Exhaust system alarm FACILITIES-EXH-02',       '2026-04-09T14:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-09T13:30:00Z', 'Exhaust',           NULL,     NULL,    'FAC-Power', 'user-jones',  'Facilities', 'Exhaust scrubber pressure differential alarm.'),
  ('iss-019', 'Overlay spec LITHO-07 lot 8031',               '2026-04-10T08:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-10T07:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-silva',  'Litho',      'Overlay measurement out of spec on lot 8031.'),
  ('iss-020', 'Endpoint detection failure ETCH-03 lot 7742',  '2026-04-10T15:00:00Z', 'HIGH_RISK',   'Investigating', '2026-04-10T14:30:00Z', 'Etch',              'OP-2020', 'ETCH',  'B3-Etch',   'user-chen',   'Etch',       'Endpoint detection failed to trigger on lot 7742. Over-etch occurred.'),
  ('iss-021', 'Power quality event FAC-UPS-01',               '2026-04-11T06:00:00Z', 'HIGH_RISK',   'Triage',        '2026-04-11T05:30:00Z', 'Power Distribution', NULL,     NULL,    'FAC-Power', 'user-anderson','Facilities','UPS battery test revealed degraded cell.'),
  ('iss-022', 'Focus drift LITHO-07',                         '2026-04-11T10:00:00Z', 'MIDDLE_RISK', 'Investigating', '2026-04-11T09:30:00Z', 'Exposure',          'OP-1010', 'LITHO', 'A7-Litho',  'user-davis',  'Litho',      'Gradual focus drift detected over 20 wafers.'),
  ('iss-023', 'Chamber clean time increase CVD-09',           '2026-04-12T08:00:00Z', 'MIDDLE_RISK', 'Triage',        '2026-04-12T07:30:00Z', 'Deposition',        'OP-3030', 'CVD',   'C2-CVD',    'user-taylor', 'Etch',       'Clean recipe time increased 15% from baseline.'),
  ('iss-024', 'DI water resistivity drop',                    '2026-04-12T12:00:00Z', 'MIDDLE_RISK', 'Closed',        '2026-04-12T11:30:00Z', 'Water Supply',       NULL,     NULL,    'FAC-Power', 'user-wilson', 'Facilities', 'DI water resistivity dropped to 16 MOhm-cm. Filter replaced.'),
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

-- Issue activity (at least 1 per issue = 25, plus extras)
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
  ('iss-008', 'created',    '2026-04-04T12:00:00Z', 'S. Patel',  NULL, NULL),
  ('iss-009', 'created',    '2026-04-05T07:00:00Z', 'R. Garcia', NULL, NULL),
  ('iss-010', 'created',    '2026-04-05T10:00:00Z', 'D. Lee',    NULL, NULL),
  ('iss-011', 'created',    '2026-04-06T09:00:00Z', 'R. Garcia', NULL, NULL),
  ('iss-012', 'created',    '2026-04-06T14:00:00Z', 'E. Wong',   NULL, NULL),
  ('iss-013', 'created',    '2026-04-07T06:00:00Z', 'F. Weber',  NULL, NULL),
  ('iss-014', 'created',    '2026-04-07T14:00:00Z', 'L. Rossi',  NULL, NULL),
  ('iss-015', 'created',    '2026-04-08T09:00:00Z', 'K. Brown',  NULL, NULL),
  ('iss-016', 'created',    '2026-04-08T15:00:00Z', 'H. Tanaka', NULL, NULL),
  ('iss-017', 'created',    '2026-04-09T08:00:00Z', 'S. Miller', NULL, NULL),
  ('iss-018', 'created',    '2026-04-09T14:00:00Z', 'R. Jones',  NULL, NULL),
  ('iss-019', 'created',    '2026-04-10T08:00:00Z', 'P. Silva',  NULL, NULL),
  ('iss-020', 'created',    '2026-04-10T15:00:00Z', 'M. Chen',   NULL, NULL),
  ('iss-021', 'created',    '2026-04-11T06:00:00Z', 'C. Anderson', NULL, NULL),
  ('iss-022', 'created',    '2026-04-11T10:00:00Z', 'L. Davis',  NULL, NULL),
  ('iss-023', 'created',    '2026-04-12T08:00:00Z', 'B. Taylor', NULL, NULL),
  ('iss-024', 'created',    '2026-04-12T12:00:00Z', 'T. Wilson', NULL, NULL),
  ('iss-025', 'created',    '2026-04-12T18:00:00Z', 'B. Hoffman',NULL, NULL);

-- Issue-alarm links (same core links as production)
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

-- Issue relations (blockers)
INSERT INTO issue_relation (from_issue_id, to_issue_id, type, created_by, created_at) VALUES
  ('iss-001', 'iss-004', 'BLOCKER', 'H. Tanaka', '2026-04-02T15:00:00Z');

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
