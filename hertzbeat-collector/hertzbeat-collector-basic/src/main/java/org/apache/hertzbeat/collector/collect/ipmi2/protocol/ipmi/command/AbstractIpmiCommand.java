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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command;

import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiLun;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.AbstractIpmiPayload;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayloadType;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.IntegrityUtils;

/**
 * Abstract IPMI command. See IPMIv2 Section 13.8
 */
public abstract class AbstractIpmiCommand extends AbstractIpmiPayload implements IpmiCommand {
    private static final int SEQUENCE_NUMBER_MASK = 0x3F;
    private byte rsAddress = 0x20;
    private IpmiLun rsLun = IpmiLun.L0;
    private byte rqAddress = (byte) 0x81;
    private IpmiLun rqLun = IpmiLun.L0;
    private byte sequenceNumber;

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.IPMI;
    }

    @Override
    public byte getRsAddress() {
        return rsAddress;
    }

    @Override
    public IpmiLun getRsLun() {
        return rsLun;
    }

    @Override
    public byte getRqAddress() {
        return rqAddress;
    }

    @Override
    public IpmiLun getRqLun() {
        return rqLun;
    }

    @Override
    public void setRqLun(IpmiLun rqLun) {
        this.rqLun = rqLun;
    }

    @Override
    public byte getSequenceNumber() {
        return sequenceNumber;
    }

    @Override
    public void setSequenceNumber(byte sequenceNumber) {
        this.sequenceNumber = (byte) (sequenceNumber & SEQUENCE_NUMBER_MASK);
    }

    @Override
    public int getWireLength(IpmiPacketContext context) {
        return 7 + getDataWireLength(context);
    }

    public abstract int getDataWireLength(IpmiPacketContext context);

    public abstract void toWireData(IpmiPacketContext context, ByteBuffer buffer);

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        int c1 = buffer.position();
        buffer.put(getRsAddress());
        int netFn = getCommandName().getNetworkFunction().getCode(this);
        buffer.put((byte) (netFn << 2 | getRsLun().getValue()));
        byte c1sum = IntegrityUtils.calculateChecksum(buffer, c1);
        buffer.put(c1sum);
        int c2 = buffer.position();
        buffer.put(getRqAddress());
        byte seq = (byte) (getSequenceNumber() & SEQUENCE_NUMBER_MASK);
        buffer.put((byte) (seq << 2 | getRqLun().getValue()));
        buffer.put(getCommandName().getCode());
        toWireData(context, buffer);
        byte c2sum = IntegrityUtils.calculateChecksum(buffer, c2);
        buffer.put(c2sum);
    }

    public abstract void fromWireData(IpmiPacketContext context, ByteBuffer buffer);

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        int c1 = buffer.position();
        rqAddress = buffer.get();
        int tmp = buffer.get();
        rqLun = IpmiCode.fromInt(IpmiLun.class, tmp & IpmiLun.MASK);
        IntegrityUtils.validChecksum(buffer, c1);
        int c2 = buffer.position();
        rsAddress = buffer.get();
        tmp = buffer.get();
        sequenceNumber = (byte) (tmp >>> 2 & SEQUENCE_NUMBER_MASK);
        rsLun = IpmiCode.fromInt(IpmiLun.class, tmp & IpmiLun.MASK);
        buffer.get();
        buffer.limit(buffer.limit() - 1);
        fromWireData(context, buffer);
        buffer.limit(buffer.limit() + 1);
        IntegrityUtils.validChecksum(buffer, c2);
    }

}
