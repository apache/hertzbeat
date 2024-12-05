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

import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiCommandName;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.AbstractIpmiRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

import java.nio.ByteBuffer;

/**
 *  See IPMIv2 Section 33.12
 */
public class GetSdrRequest extends AbstractIpmiRequest {

    public static byte HEADER_LENGTH = 5;

    public static int RECORD_ID_START = 0x01;

    final int reservationId;

    final int recordId;

    final byte offset;

    final byte byteToRead;

    public GetSdrRequest(int reservationId, int recordId, byte offset, byte byteToRead) {
        this.reservationId = reservationId;
        this.recordId = recordId;
        this.offset = offset;
        this.byteToRead = byteToRead;
    }

    @Override
    public int getDataWireLength(IpmiPacketContext context) {
        return 6;
    }

    @Override
    public void toWireData(IpmiPacketContext context, ByteBuffer buffer) {
        byte[] reservationIdBytes = ByteConvertUtils.intToLsMsByte(reservationId);
        buffer.put(reservationIdBytes[0]);
        buffer.put(reservationIdBytes[1]);
        byte[] recordIdBytes = ByteConvertUtils.intToLsMsByte(recordId);
        buffer.put(recordIdBytes[0]);
        buffer.put(recordIdBytes[1]);
        buffer.put(offset);
        buffer.put(byteToRead);
    }

    @Override
    public IpmiCommandName getCommandName() {
        return IpmiCommandName.GetSdr;
    }
}
