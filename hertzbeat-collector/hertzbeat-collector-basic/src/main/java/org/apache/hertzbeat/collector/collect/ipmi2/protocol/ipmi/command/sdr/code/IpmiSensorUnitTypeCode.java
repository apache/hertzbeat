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
 *  See IPMIv2 Section 43.17
 */
public enum IpmiSensorUnitTypeCode implements IpmiCode.Code {
    Unspecified(0x00, "Unspecified"),
    Degrees_Celsius(0x01, "Degrees C"),
    Degrees_Fahrenheit(0x02, "Degrees F"),
    Degrees_Kelvin(0x03, "Degrees K"),
    Volts(0x04, "Volts"),
    Amps(0x05, "Amps"),
    Watts(0x06, "Watts"),
    Joules(0x07, "Joules"),
    Coulombs(0x08, "Coulombs"),
    VA(0x09, "VA"),
    Nits(0x0A, "Nits"),
    Lumen(0x0B, "Lumen"),
    Lux(0x0C, "Lux"),
    Candela(0x0D, "Candela"),
    kPa(0x0E, "kPa"),
    PSI(0x0F, "PSI"),
    Newton(0x10, "Newton"),
    CFM(0x11, "CFM"),
    RPM(0x12, "RPM"),
    Hz(0x13, "Hz"),
    Microsecond(0x14, "Microsecond"),
    Millisecond(0x15, "Millisecond"),
    Second(0x16, "Second"),
    Minute(0x17, "Minute"),
    Hour(0x18, "Hour"),
    Day(0x19, "Day"),
    Week(0x1A, "Week"),
    Mil(0x1B, "Mil"),
    Inches(0x1C, "Inches"),
    Feet(0x1D, "Feet"),
    Cu_Inch(0x1E, "Cu in"),
    Cu_Feet(0x1F, "Cu feet"),
    Mm(0x20, "mm"),
    Cm(0x21, "cm"),
    Meter(0x22, "m"),
    Cu_Cm(0x23, "Cu cm"),
    Cu_Meter(0x24, "Cu m"),
    Liters(0x25, "Liters"),
    Fluid_Ounce(0x26, "Fluid ounce"),
    Radians(0x27, "Radians"),
    Steradians(0x28, "Steradians"),
    Revolutions(0x29, "Revolutions"),
    Cycles(0x2A, "Cycles"),
    Gravities(0x2B, "Gravities"),
    Ounce(0x2C, "Ounce"),
    Pound(0x2D, "Pound"),
    Ft_Lb(0x2E, "Ft-lb"),
    Oz_Inch(0x2F, "Oz-in"),
    Gauss(0x30, "Gauss"),
    Gilberts(0x31, "Gilberts"),
    Henry(0x32, "Henry"),
    Millihenry(0x33, "Millihenry"),
    Farad(0x34, "Farad"),
    Microfarad(0x35, "Microfarad"),
    Ohms(0x36, "Ohms"),
    Siemens(0x37, "Siemens"),
    Mole(0x38, "Mole"),
    Becquerel(0x39, "Becquerel"),
    PPM(0x3A, "PPM"),
    Reserved(0x3B, "Reserved"),
    Decibels(0x3C, "Decibels"),
    DbA(0x3D, "DbA"),
    DbC(0x3E, "DbC"),
    Gray(0x3F, "Gray"),
    Sievert(0x40, "Sievert"),
    Color_Temp_Deg_K(0x41, "Color temp deg K"),
    Bit(0x42, "Bit"),
    Kilobit(0x43, "Kilobit"),
    Megabit(0x44, "Megabit"),
    Gigabit(0x45, "Gigabit"),
    Byte(0x46, "Byte"),
    Kilobyte(0x47, "Kilobyte"),
    Megabyte(0x48, "Megabyte"),
    Gigabyte(0x49, "Gigabyte"),
    Word(0x4A, "Word"),
    Dword(0x4B, "Dword"),
    Qword(0x4C, "Qword"),
    Line(0x4D, "Line"),
    Hit(0x4E, "Hit"),
    Miss(0x4F, "Miss"),
    Retry(0x50, "Retry"),
    Reset(0x51, "Reset"),
    Overflow(0x52, "Overflow"),
    Underrun(0x53, "Underrun"),
    Collision(0x54, "Collision"),
    Packets(0x55, "Packets"),
    Messages(0x56, "Messages"),
    Characters(0x57, "Characters"),
    Error(0x58, "Error"),
    Correctable_Error(0x59, "Correctable error"),
    Uncorrectable_Error(0x5A, "Uncorrectable error"),
    Fatal_Error(0x5B, "Fatal error"),
    Grams(0x5C, "Grams");

    private byte code;

    private String description;

    IpmiSensorUnitTypeCode(int code, String description) {
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
