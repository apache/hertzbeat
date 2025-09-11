---
id: idrac  
title: iDRAC Monitoring  
sidebar_label: Server 监控
keywords: [open source monitoring tool, open source server Monitoring, iDRAC Monitoring]
---

# Dell iDRAC Monitoring

HertzBeat uses SNMP Protocol to monitor Dell iDRAC general performance metrics. 

You can click the "New Dell iDRAC" button and configure SNMP parameters to add a monitor or import an existing setup through the "More Actions" menu.

## Prerequisites

1. Ensure that the Dell server with iDRAC is accessible from the HertzBeat collector.
2. Enable SNMP on the iDRAC interface.
3. Configure the appropriate SNMP community string or user credentials based on the SNMP version being used.

## Adding Dell iDRAC Monitor

### Method 1: Adding via UI
1. Navigate to the "Monitor" section in HertzBeat.
2. Click on the "New Monitor" button.
3. Select "Dell iDRAC" from the available monitor types.
4. Fill in the required connection parameters:
   - **Target Host**: IP address or hostname of the Dell iDRAC interface
   - **Port**: SNMP port (default: 161)
   - **SNMP Version**: Choose between SNMPv1, SNMPv2c, or SNMPv3
   - Additional parameters based on the SNMP version:
     - For SNMPv1/v2c: SNMP Community
     - For SNMPv3: Username, Context Name, Authentication Password, Authentication Encryption, Privacy Password, Privacy Encryption
5. Set the collection interval as needed.
6. Click "Add" to create the monitor.

### Method 2: Bulk Import
You can also import multiple Dell iDRAC monitors using the bulk import feature:
1. Navigate to the "Monitor" section.
2. Click on "More Actions" and select "Import".
3. Prepare your import file with the required Dell iDRAC details.
4. Upload the file and follow the prompts to complete the import.

## Collected Metrics

HertzBeat collects various metrics from Dell iDRAC interfaces, including:

### System Information
- Global System Status
- System LCD Status
- Global Storage Status
- System Power State
- System Power Up Time

### Power Supply
- Index
- Name
- Wattage (W)
- Type
- Status

### Cooling Devices
- Index
- Name
- Type
- Reading (RPM)
- Status

### Temperature Sensors
- Index
- Name
- Reading (°C)
- Status

### Voltage Sensors
- Index
- Name
- Reading (V)
- Type
- Status

### Memory Devices
- Index
- Name
- Type
- Size (G)
- Status

### Processors
- Index
- Name
- Speed (MHz)
- Family
- Status

## Troubleshooting

1. **Connection Issues**:
   - Verify that the iDRAC IP address/hostname is correct and accessible.
   - Check that the SNMP port is open and not blocked by a firewall.
   - Confirm that SNMP is enabled on the iDRAC interface.

2. **Authentication Errors**:
   - For SNMPv1/v2c, ensure that the community string is correct.
   - For SNMPv3, verify that the username, authentication password, and privacy password are correct.
   - Check that the authentication and privacy encryption methods match the iDRAC configuration.

3. **No Data Collected**:
   - Verify that the iDRAC firmware supports the OIDs being queried.
   - Check the HertzBeat logs for any error messages related to SNMP collection.

For more information on extending SNMP monitoring, refer to the [SNMP Protocol documentation](https://hertzbeat.apache.org/docs/advanced/extend-snmp).
