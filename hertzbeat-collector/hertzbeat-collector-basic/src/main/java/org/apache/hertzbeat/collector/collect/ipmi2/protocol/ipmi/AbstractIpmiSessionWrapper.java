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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi;

import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.AbstractWireable;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiEncapsulation;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayload;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayloadType;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage1;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage2;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage3;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage4;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RmcpPlusOpenSessionRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RmcpPlusOpenSessionResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.rmcp.RmcpMessageClass;

/**
 * Abstract Ipmi Session Wrapper
 */
public abstract class AbstractIpmiSessionWrapper extends AbstractWireable implements IpmiSessionWrapper {
    private int sessionId = 0;
    private int sessionSequenceNumber = 0;
    private IpmiPayload payload;

    @Override
    public int getIpmiSessionId() {
        return sessionId;
    }

    @Override
    public void setIpmiSessionId(int ipmiSessionId) {
        this.sessionId = ipmiSessionId;
    }

    @Override
    public int getIpmiSessionSequenceNumber() {
        return sessionSequenceNumber;
    }

    @Override
    public void setIpmiSessionSequenceNumber(int ipmiSessionSequenceNumber) {
        this.sessionSequenceNumber = ipmiSessionSequenceNumber;
    }

    @Override
    public IpmiPayload getIpmiPayload() {
        return payload;
    }

    @Override
    public void setIpmiPayload(IpmiPayload ipmiPayload) {
        this.payload = ipmiPayload;
    }

    @Override
    public <T> T getEncapsulated(Class<T> type) {
        if (type.isInstance(this)) {
            return type.cast(this);
        }
        return IpmiEncapsulation.getEncapsulated(type, getIpmiPayload());
    }

    @Override
    public RmcpMessageClass getMessageClass() {
        return RmcpMessageClass.IPMI;
    }

    public static IpmiPayload newIpmiPayload(ByteBuffer buffer, IpmiPayloadType type) {
        switch (type) {
            case IPMI: {
                int position = buffer.position();
                byte netFn =  AbstractWireable.getBits(buffer.get(position + 1), 2, IpmiNetworkFunctionCode.MASK);
                IpmiNetworkFunctionCode networkFunctionCode = IpmiCode.fromByte(IpmiNetworkFunctionCode.class, (byte) (netFn & ~1));
                byte commandNameByte = buffer.get(position + 5);
                IpmiCommandName commandName = IpmiCommandName.fromNetFunctionAndCode(networkFunctionCode, commandNameByte);
                boolean isResponse = (netFn & 1) != 0;
                return isResponse ? commandName.newIpmiResponse() : commandName.newIpmiRequest();
            }
            case RMCPOpenSessionRequest:
                return new RmcpPlusOpenSessionRequest();
            case RMCPOpenSessionResponse:
                return new RmcpPlusOpenSessionResponse();
            case RAKPMessage1:
                return new RakpMessage1();
            case RAKPMessage2:
                return new RakpMessage2();
            case RAKPMessage3:
                return new RakpMessage3();
            case RAKPMessage4:
                return new RakpMessage4();
            default:
                throw new UnsupportedOperationException("Unsupported IPMI payload type: " + type);
        }
    }
}
