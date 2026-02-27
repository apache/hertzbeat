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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.AbstractWireable;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiChannelNumberCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiCommandName;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiLun;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.AbstractIpmiResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.code.IpmiEntityIdCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.code.IpmiReadingTypeCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.code.IpmiSensorTypeCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.code.IpmiSensorUnitTypeCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 33.12
 */
public class GetSdrResponse extends AbstractIpmiResponse {

    public int nextRecordId;
    public int recordId;
    public byte recordType;
    public byte recordLength;
    public byte sensorOwnerId;
    public IpmiLun sensorOwnerLun;
    public IpmiChannelNumberCode sensorOwnerChannelNumber;
    public byte sensorNumber;
    public IpmiEntityIdCode entityIdCode;
    public IpmiSensorTypeCode sensorTypeCode;
    public IpmiReadingTypeCode readingTypeCode;
    public byte analogDataFormat;
    public IpmiSensorUnitTypeCode unitTypeCode;
    public byte linear;
    public int m;
    public int b;
    public int k1;
    public int k2;
    public String sensorIdString;


    @Override
    public void fromResponseData(IpmiPacketContext context, ByteBuffer buffer) {
        byte[] recordIdBytes = ByteOrderUtils.readBytes(buffer, 2);
        nextRecordId = ByteConvertUtils.lsMsByteToInt(recordIdBytes[0], recordIdBytes[1]);
        fromSensorRecordHeader(context, buffer);
        int remainingLength = buffer.remaining();
        if (remainingLength == 0) {
            return;
        }
        if (recordType != 0x01) {
            buffer.position(buffer.limit());
            return;
        }
        fromRecordKeyBytes(context, buffer);
        fromFullSensorRecord(context, buffer);
    }

    @Override
    public IpmiCommandName getCommandName() {
        return IpmiCommandName.GetSdr;
    }


    public void fromSensorRecordHeader(IpmiPacketContext context, ByteBuffer buffer) {
        recordId = ByteOrderUtils.readLeChar(buffer);
        ignoreBytes(buffer, 1);
        recordType = buffer.get();
        recordLength = buffer.get();
    }

    public void fromRecordKeyBytes(IpmiPacketContext context, ByteBuffer buffer) {
        sensorOwnerId = buffer.get();
        byte t = buffer.get();
        sensorOwnerLun = IpmiCode.fromByte(IpmiLun.class, AbstractWireable.getBits(t, IpmiLun.MASK));
        sensorOwnerChannelNumber = IpmiCode.fromByte(IpmiChannelNumberCode.class, AbstractWireable.getBits(t, 4, IpmiChannelNumberCode.MASK));
        sensorNumber = buffer.get();
    }

    public void fromFullSensorRecord(IpmiPacketContext context, ByteBuffer buffer) {
        entityIdCode = IpmiCode.fromBuffer(IpmiEntityIdCode.class, buffer);
        ignoreBytes(buffer, 3);
        sensorTypeCode = IpmiCode.fromBuffer(IpmiSensorTypeCode.class, buffer);
        readingTypeCode = IpmiCode.fromBuffer(IpmiReadingTypeCode.class, buffer);
        ignoreBytes(buffer, 6);
        byte t = buffer.get();
        analogDataFormat = AbstractWireable.getBits(t, 6, 0x3);
        unitTypeCode = IpmiCode.fromBuffer(IpmiSensorUnitTypeCode.class, buffer);
        ignoreBytes(buffer, 1);
        linear = buffer.get();
        short mt = buffer.getShort();
        m = ((mt & 0xFF00) >> 8 | (mt & 0xC0) << 2);
        m = ByteConvertUtils.getBitsAsSigned(m, 10);
        short ba = buffer.getShort();
        b = ((ba & 0xFF00) >> 8 | (ba & 0xC0) << 2);
        b = ByteConvertUtils.getBitsAsSigned(b, 10);
        ignoreBytes(buffer, 1);
        byte rb = buffer.get();
        k1 = AbstractWireable.getBits(rb, 0, 0xF);
        k1 = ByteConvertUtils.getBitsAsSigned(k1, 4);
        k2 = AbstractWireable.getBits(rb, 4, 0xF);
        k2 = ByteConvertUtils.getBitsAsSigned(k2, 4);
        ignoreBytes(buffer, 17);
        int length = buffer.get() & 0x1F;
        if (buffer.remaining() < length) {
            length = buffer.remaining();
        }
        byte[] sensorIdBytes = ByteOrderUtils.readBytes(buffer, length);
        sensorIdString = new String(sensorIdBytes, StandardCharsets.US_ASCII);
    }
}
