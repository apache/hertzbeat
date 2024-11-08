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
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiCommandName;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.AbstractIpmiResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 33.11
 */
public class ReserveSdrRepositoryResponse extends AbstractIpmiResponse {

    public int reserveId;

    @Override
    public void fromResponseData(IpmiPacketContext context, ByteBuffer buffer) {
        byte lsReserveId = buffer.get();
        byte msReserveId = buffer.get();
        this.reserveId = ByteConvertUtils.lsMsByteToInt(lsReserveId, msReserveId);
    }

    @Override
    public IpmiCommandName getCommandName() {
        return IpmiCommandName.ReserveSdrRepository;
    }
}
