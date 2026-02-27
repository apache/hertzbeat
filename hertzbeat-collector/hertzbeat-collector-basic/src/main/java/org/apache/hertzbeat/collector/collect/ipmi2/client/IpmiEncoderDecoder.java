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

package org.apache.hertzbeat.collector.collect.ipmi2.client;

import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.rmcp.RmcpPacket;

/**
 *  IPMI encoder and decoder
 */
public class IpmiEncoderDecoder {

    public static ByteBuffer encode(IpmiPacketContext context, RmcpPacket rmcpPacket) {
        int length = rmcpPacket.getWireLength(context.getIpmiSession());
        ByteBuffer buffer = ByteBuffer.allocate(length);
        rmcpPacket.toWire(context, buffer);
        buffer.flip();
        return buffer;
    }

    public static RmcpPacket decode(IpmiPacketContext context, ByteBuffer buffer) {
        RmcpPacket rmcpPacket = new RmcpPacket();
        rmcpPacket.fromWire(context, buffer);
        return rmcpPacket;
    }
}
