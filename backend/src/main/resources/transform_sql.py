#!/usr/bin/env python3
"""Transform data.sql to use new alarm schema field names and values."""

import re
from datetime import datetime, timedelta

# Read the original file
with open('data.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Severity mapping
severity_map = {
    "'Critical'": "'P0'",
    "'High'": "'P1'",
    "'Medium'": "'P2'",
    "'Low'": "'P3'",
}

# Alarm type mapping - reduce to 3 types
# Keep spc_ooc, map everything else to TempSpike or ChamberLeak roughly
alarm_type_map = {
    "'PressureDrop'": "'TempSpike'",
    "'FlowAnomaly'": "'TempSpike'",
    "'VoltageSag'": "'TempSpike'",
    "'ParticleCount'": "'TempSpike'",
    "'VacuumFault'": "'ChamberLeak'",
    "'RFMismatch'": "'ChamberLeak'",
    "'GasFlowDeviation'": "'TempSpike'",
    "'EndpointDrift'": "'TempSpike'",
}

# Module mapping based on equipment ID
def get_module(eqp_id):
    if eqp_id.startswith('LITHO'):
        return "'LITHO'"
    elif eqp_id.startswith('ETCH'):
        return "'ETCH'"
    elif eqp_id.startswith('CVD'):
        return "'CVD'"
    elif eqp_id.startswith('PVD'):
        return "'PVD'"
    elif eqp_id.startswith('CMP'):
        return "'CMP'"
    elif eqp_id.startswith('METRO'):
        return "'METROLOGY'"
    elif eqp_id.startswith('IMP'):
        return "'IMPLANT'"
    return "'LITHO'"

# Process each INSERT INTO alarm line
def transform_alarm_line(line):
    if 'INSERT INTO alarm' not in line:
        return line

    # Update column names
    line = line.replace('machine_id', 'eqp_id')
    line = line.replace('product,', 'product_id,')
    line = line.replace('operation,', 'oper_name,')

    # Update severity values
    for old, new in severity_map.items():
        line = line.replace(old, new)

    # Update alarm types
    for old, new in alarm_type_map.items():
        line = line.replace(old, new)

    # Extract the VALUES part
    match = re.search(r"VALUES \('([^']+)', '([^']+)', '([^']+)', (.+?)\);", line)
    if not match:
        return line

    alarm_id = match.group(1)
    alarm_type = match.group(2)
    severity = match.group(3)
    rest = match.group(4)

    # Parse the values
    values = [v.strip() for v in rest.split(',')]
    # Fix first value which got cut by regex
    values = values[1:]  # Remove the duplicate first field

    # Original field count: id, type, severity, message, alarm_value, unit, alarm_time, recovery_time,
    # machine_id, chamber_id, product, operation, owner, department, chart_owner_id, status, human_risk
    # That's 17 fields

    # Need to add: event_time, alarm_date, oper_no, technology_id, product_group_id,
    # process_oper_name, process_oper_no, lot_id, lot_priority, wafer_id, recipe_id,
    # route_id, module, module_owner, pi_owner

    if len(values) < 17:
        return line

    # Extract values
    message = values[0]
    alarm_value = values[1]
    unit = values[2]
    alarm_time = values[3]
    recovery_time = values[4]
    eqp_id = values[5].strip("'")
    chamber_id = values[6]
    product_id = values[7]
    oper_name = values[8]
    owner = values[9]
    department = values[10]
    chart_owner_id = values[11]
    status = values[12]
    risk_level = values[13]
    labels = values[14] if len(values) > 14 else "[]"

    # Generate new fields
    # event_time: alarm_time minus ~5 minutes
    event_time = alarm_time.replace('+00:00', '+00:00')  # Keep same for simplicity

    # alarm_date: extract date from alarm_time
    alarm_date = alarm_time.split()[0].replace("'", "")

    # oper_no: generate from alarm ID
    oper_no = f"'OP-{int(alarm_id.split('-')[1])*100}'"

    # technology_id, product_group_id: generate from product
    tech_num = int(alarm_id.split('-')[1]) % 50 + 1
    technology_id = f"'TECH-{tech_num}'"
    product_group_id = f"'PG-{product_id.strip(\"'\").split(\"-\")[0]}'"

    # process_oper_name = oper_name
    process_oper_name = oper_name

    # process_oper_no = oper_no
    process_oper_no = oper_no

    # lot_id
    lot_id = f"'LOT-{alarm_id.split(\"-\")[1].zfill(3)}'"

    # lot_priority: cycle through 0, 1, 2
    lot_priority = str((int(alarm_id.split('-')[1])) % 3)

    # wafer_id
    wafer_id = f"'WAF-{alarm_id.split(\"-\")[1].zfill(3)}'"

    # recipe_id
    recipe_id = f"'RCP-{alarm_id.split(\"-\")[1].zfill(3)}'"

    # route_id
    route_id = f"'RT-{alarm_id.split(\"-\")[1].zfill(3)}'"

    # module
    module = get_module(eqp_id)

    # module_owner, pi_owner: use existing users based on department
    if 'Litho' in department:
        module_owner = "'user-sato'"
        pi_owner = "'user-sato'"
    elif 'Etch' in department:
        module_owner = "'user-kumar'"
        pi_owner = "'user-kumar'"
    elif 'Facilities' in department:
        module_owner = "'user-fischer'"
        pi_owner = "'user-fischer'"
    else:
        module_owner = "'user-sato'"
        pi_owner = "'user-sato'"

    # Build new VALUES clause
    new_values = [
        f"'{alarm_id}'",
        alarm_type,
        severity,
        message,
        alarm_value,
        unit,
        alarm_time,
        event_time,
        f"'{alarm_date}'",
        recovery_time,
        f"'{eqp_id}'",
        chamber_id,
        product_id,
        oper_name,
        oper_no,
        technology_id,
        product_group_id,
        process_oper_name,
        process_oper_no,
        lot_id,
        lot_priority,
        wafer_id,
        recipe_id,
        route_id,
        module,
        module_owner,
        pi_owner,
        owner,
        department,
        chart_owner_id,
        status,
        risk_level,
    ]

    # Add labels if present
    if labels != "[]" and labels != '':
        new_values.append(labels)

    new_line = f"INSERT INTO alarm (id, type, severity, message, alarm_value, unit, alarm_time, event_time, alarm_date, recovery_time, eqp_id, chamber_id, product_id, oper_name, oper_no, technology_id, product_group_id, process_oper_name, process_oper_no, lot_id, lot_priority, wafer_id, recipe_id, route_id, module, module_owner, pi_owner, owner, department, chart_owner_id, status, risk_level) VALUES ({', '.join(new_values)});"

    return new_line

# Transform lines
lines = content.split('\n')
transformed_lines = []

# Keep header lines unchanged until we hit alarm inserts
in_alarms = False
for line in lines:
    if 'INSERT INTO alarm' in line:
        in_alarms = True
        transformed_lines.append(transform_alarm_line(line))
    elif in_alarms:
        transformed_lines.append(transform_alarm_line(line))
    else:
        transformed_lines.append(line)

# Write transformed content
with open('data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(transformed_lines))

print("Transformed data.sql successfully")
