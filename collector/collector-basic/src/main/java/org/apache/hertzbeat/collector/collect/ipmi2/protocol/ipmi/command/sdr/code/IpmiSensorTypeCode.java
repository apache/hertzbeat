/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.code;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 42.2
 */
public enum IpmiSensorTypeCode implements IpmiCode.Code {
    Reserved(0x00, "Reserved"),
    Temperature(0x01, "Temperature"),
    Voltage(0x02, "Voltage"),
    Current(0x03, "Current"),
    Fan(0x04, "Fan"),
    Physical_Security(0x05, "Physical Security"),
    Platform_Security(0x06, "Platform Security Violation Attempt"),
    Processor(0x07, "Processor"),
    Power_Supply(0x08, "Power Supply"),
    Power_Unit(0x09, "Power Unit"),
    Cooling_Device(0x0A, "Cooling Device"),
    Other(0x0B, "Other Units-based Sensor"),
    Memory(0x0C, "Memory"),
    Drive_Slot_Bay(0x0D, "Drive Slot"),
    POST_Memory_Resize(0x0E, "POST Memory Resize"),
    System_Firmwares(0x0F, "System Firmwares Progress"),
    Event_Logging_Disabled(0x10, "Event Logging Disabled"),
    Watchdog1(0x11, "Watchdog 1"),
    System_Event(0x12, "System Event"),
    Critical_Interrupt(0x13, "Critical Interrupt"),
    Button(0x14, "Button / Switch"),
    Module_Board(0x15, "Module / Board"),
    Microcontroller(0x16, "Microcontroller / Coprocessor"),
    Add_in_Card(0x17, "Add-in Card"),
    Chassis(0x18, "Chassis"),
    Chip_Set(0x19, "Chip Set"),
    Other_FRU(0x1A, "Other FRU"),
    Cable_Interconnect(0x1B, "Cable / Interconnect"),
    Terminator(0x1C, "Terminator"),
    System_Boot_Initiated(0x1D, "System Boot / Restart Initiated"),
    Boot_Error(0x1E, "Boot Error"),
    OS_Boot(0x1F, "Base OS Boot / Installation Status"),
    OS_Critical_Stop(0x20, "OS Stop / Shutdown"),
    Slot_Connector(0x21, "Slot / Connector"),
    System_ACPI_Power_State(0x22, "System ACPI Power State"),
    Watchdog2(0x23, "Watchdog 2"),
    Platform_Alert(0x24, "Platform Alert"),
    Entity_Presence(0x25, "Entity Presence"),
    Monitor_ASIC(0x26, "Monitor ASIC / IC"),
    LAN(0x27, "LAN"),
    Management_Subsystem_Health(0x28, "Management Subsystem Health"),
    Battery(0x29, "Battery"),
    Session_Audit(0x2A, "Session Audit"),
    Version_Change(0x2B, "Version Change"),
    FRU_State(0x2C, "FRU State");

    private byte code;

    private String description;

    IpmiSensorTypeCode(int code, String description) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.description = description;
    }

    @Override
    public byte getCode() {
        return code;
    }

    @Override
    public String getDescription() {
        return description;
    }


}
