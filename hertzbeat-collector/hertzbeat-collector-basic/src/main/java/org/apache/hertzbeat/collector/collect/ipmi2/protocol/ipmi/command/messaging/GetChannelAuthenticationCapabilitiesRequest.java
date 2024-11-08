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
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiChannelNumberCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiChannelPrivilegeLevel;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiCommandName;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.AbstractIpmiRequest;

/**
 *  See IPMIv2 Section 22.13
 */
public class GetChannelAuthenticationCapabilitiesRequest extends AbstractIpmiRequest {

    public IpmiChannelNumberCode channelNumberCode = IpmiChannelNumberCode.PRESENT;
    public IpmiChannelPrivilegeLevel channelPrivilegeLevel = IpmiChannelPrivilegeLevel.Administrator;
    public int isIpmi20 = 0x1;

    @Override
    public int getDataWireLength(IpmiPacketContext context) {
        return 2;
    }

    @Override
    public void toWireData(IpmiPacketContext context, ByteBuffer buffer) {
        byte b = 0;
        b = setBits(b, 7, 0x1, isIpmi20);
        b = setBits(b, 0, IpmiChannelNumberCode.MASK, channelNumberCode.getCode());
        buffer.put(b);
        buffer.put(channelPrivilegeLevel.getCode());
    }

    @Override
    public IpmiCommandName getCommandName() {
        return IpmiCommandName.GetChannelAuthenticationCapabilities;
    }
}
