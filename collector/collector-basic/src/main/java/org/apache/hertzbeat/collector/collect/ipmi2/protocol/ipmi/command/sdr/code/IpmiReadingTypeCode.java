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
 *  See IPMIv2 Section 42.1
 */
public enum IpmiReadingTypeCode implements IpmiCode.Code{
    Unspecified(0x00),
    Threshold(0x01),
    Discrete_1(0x02),
    Discrete_2(0x03),
    Discrete_3(0x04),
    Discrete_4(0x05),
    Discrete_5(0x06),
    Discrete_6(0x07),
    Discrete_7(0x08),
    Discrete_8(0x09),
    Discrete_9(0x0A),
    Discrete_10(0x0B),
    Discrete_11(0x0C),
    Sensor_Specific(0x6F);

    private byte code;

    IpmiReadingTypeCode(int code) {
        this.code = ByteConvertUtils.checkCastByte(code);
    }

    @Override
    public byte getCode() {
        return this.code;
    }
}
