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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging;

import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiChannelNumberCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiCommandName;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.AbstractIpmiResponse;

/**
 *  See IPMIv2 Section 22.13
 */
public class GetChannelAuthenticationCapabilitiesResponse extends AbstractIpmiResponse {

    public IpmiChannelNumberCode channelNumberCode;
    public boolean hasExtendedCapabilities;
    public byte kgStatus;
    public boolean isSupportIpmi20;
    public boolean isSupportIpmi15;

    @Override
    public void fromResponseData(IpmiPacketContext context, ByteBuffer buffer) {
        channelNumberCode = IpmiCode.fromByte(IpmiChannelNumberCode.class, buffer.get());
        byte tmp = buffer.get();
        hasExtendedCapabilities = getBits(tmp, 7, 0x1) == 0x1;
        tmp = buffer.get();
        kgStatus = getBits(tmp, 5, 0x1);
        tmp = buffer.get();
        isSupportIpmi20 = getBits(tmp, 1, 0x1) == 0x1;
        isSupportIpmi15 = getBits(tmp, 0, 0x1) == 0x1;
        ignoreBytes(buffer, 4);
    }

    @Override
    public IpmiCommandName getCommandName() {
        return IpmiCommandName.GetChannelAuthenticationCapabilities;
    }

}
