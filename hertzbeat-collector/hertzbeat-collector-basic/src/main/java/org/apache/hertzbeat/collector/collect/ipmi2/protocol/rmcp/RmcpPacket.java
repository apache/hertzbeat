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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.rmcp;

import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.AbstractWireable;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiEncapsulation;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.Ipmi20Ipv4SessionWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiSessionAuthenticationType;

/**
 * RMCP Packet See ASF 3.2 Remote Management and Control Protocol (RMCP)
 */
public class RmcpPacket extends AbstractWireable implements Packet{

    protected static final int RMCP_HEADER_LENGTH = 4;
    private final RmcpVersion version = RmcpVersion.ASF_RMCP_1_0;
    private byte sequenceNumber = (byte) 0xFF;
    private RmcpMessageClass messageClass;
    private RmcpMessageStatus messageRole = RmcpMessageStatus.REQ;
    private RmcpData data;


    public RmcpVersion getVersion() {
        return version;
    }

    public byte getSequenceNumber() {
        return sequenceNumber;
    }

    public RmcpMessageClass getMessageClass() {
        return messageClass;
    }

    public RmcpPacket withMessageClass(RmcpMessageClass messageClass) {
        this.messageClass = messageClass;
        return this;
    }

    public RmcpMessageStatus getMessageRole() {
        return messageRole;
    }

    @Override
    public RmcpData getData() {
        return data;
    }

    @Override
    public <T extends RmcpData> T getData(Class<T> type) {
        return type.cast(getData());
    }

    @Override
    public Packet withData(RmcpData data) {
        withMessageClass(data.getMessageClass());
        this.data = data;
        return this;
    }

    @Override
    public <T> T getEncapsulated(Class<T> type) {
        if (type.isInstance(this)) {
            return type.cast(this);
        }
        return IpmiEncapsulation.getEncapsulated(type, getData());
    }


    private void toWireHeader(ByteBuffer buffer) {
        buffer.put(getVersion().getCode());
        buffer.put((byte) 0x00);
        buffer.put(getSequenceNumber());
        byte messageClassByte = getMessageClass().getCode();
        messageClassByte = AbstractWireable.setBits(messageClassByte, 7, 0x01, getMessageRole().getCode());
        buffer.put(messageClassByte);
    }

    @Override
    public int getWireLength(IpmiPacketContext context) {
        return RMCP_HEADER_LENGTH + getData().getWireLength(context);
    }

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        toWireHeader(buffer);
        getData().toWire(context, buffer);
    }

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        AbstractWireable.ignoreBytes(buffer, 3);
        messageClass = IpmiCode.fromBufferWithMask(RmcpMessageClass.class, buffer, RmcpMessageClass.MASK);
        int position = buffer.position();
        if (messageClass != RmcpMessageClass.IPMI) {
            throw new UnsupportedOperationException("Unsupported RMCP message class " + messageClass);
        }
        IpmiSessionAuthenticationType type = IpmiCode.fromByte(IpmiSessionAuthenticationType.class, buffer.get(position));
        if (type == IpmiSessionAuthenticationType.RMCPP) {
            data = new Ipmi20Ipv4SessionWrapper();
        } else {
            throw new UnsupportedOperationException("Unsupported IPMI 1.5 version");
        }
        buffer.position(position);
        withData(data);
        data.fromWire(context, buffer);
    }
}
