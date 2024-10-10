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
 *  See IPMIv2 Section 43.14
 */
public enum IpmiEntityIdCode implements IpmiCode.Code {

    Unspecified(0x00, "unspecified"),
    Other(0x01, "other"),
    Unknown(0x02, "unknown"),
    Processor(0x03, "processor"),
    Disk_or_DiskBay(0x04, "disk or disk bay"),
    Peripheral_Bay(0x05, "peripheral bay"),
    System_Management_Module(0x06, "system management module"),
    System_Board(0x07, "system board"),
    Memory_Module(0x08, "memory module"),
    Processor_Module(0x09, "processor module"),
    Power_Supply(0x0A, "power supply"),
    Add_in_Card(0x0B, "add-in card"),
    Front_Panel_Board(0x0C, "front panel board"),
    Back_Panel_Board(0x0D, "back panel board"),
    Power_System_Board(0x0E, "power system board"),
    Drive_Backplane(0x0F, "drive backplane"),
    System_Internal_Expansion_Board(0x10, "system internal expansion board"),
    Other_System_Board(0x11, "other system board"),
    Processor_Board(0x12, "processor board"),
    Power_Unit(0x13, "power unit / power domain"),
    Power_Module(0x14, "power module / DC-to-DC converter"),
    Power_Management(0x15, "power management / power distribution board"),
    Chassis_Back_Panel_Board(0x16, "chassis back panel board"),
    System_Chassis(0x17, "system chassis"),
    Sub_Chassis(0x18, "sub-chassis"),
    Other_Chassis_Board(0x19, "other chassis board"),
    Disk_Drive(0x1A, "disk drive"),
    Peripheral_Bay_2(0x1B, "Peripheral Bay"),
    Device_Bay(0x1C, "device bay"),
    Fan(0x1D, "fan / cooling device"),
    Cooling_Unit(0x1E, "cooling unit / cooling domain"),
    Cable_or_Interconnect(0x1F, "cable / interconnect"),
    Memory_Device(0x20, "memory device"),
    System_Management_Software(0x21, "system management software"),
    System_Firmware(0x22, "system firmware (e.g. BIOS / EFI)"),
    Operating_System(0x23, "operating system"),
    System_Bus(0x24, "system bus"),
    Group(0x25, "group"),
    Remote_Management_Communication_Device(0x26, "remote management communication device"),
    External_Environment(0x27, "external environment"),
    Battery(0x28, "battery"),
    Processing_Blade(0x29, "processing blade"),
    Connectivity_Switch(0x2A, "connectivity switch"),
    Processor_Memory_Module(0x2B, "processor memory module"),
    IO_Module(0x2C, "I/O module"),
    Processor_IO_Module(0x2D, "processor I/O module"),
    Management_Controller(0x2E, "management controller"),
    Ipmi_Channel(0x2F, "IPMI channel"),
    PCI_Bus(0x30, "PCI bus"),
    PCI_Express_Bus(0x31, "PCI Express bus"),
    SCSI_Bus_Parallel(0x32, "SCSI bus (parallel)"),
    SATA_SAS_Bus(0x33, "SATA / SAS bus"),
    Processor_Front_Side_Bus(0x34, "processor front-side bus"),
    Real_Time_Clock(0x35, "real-time clock"),
    Air_Inlet(0x37, "air inlet"),
    Air_Inlet_2(0x40, "air inlet"),
    Processor_2(0x41, "processor"),
    System_Board_2(0x042, "system board"),
    ;

    private byte code;

    private String description;

    IpmiEntityIdCode(int code, String description) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.description = description;
    }

    @Override
    public byte getCode() {
        return this.code;
    }

    @Override
    public String getDescription() {
        return this.description;
    }
}
