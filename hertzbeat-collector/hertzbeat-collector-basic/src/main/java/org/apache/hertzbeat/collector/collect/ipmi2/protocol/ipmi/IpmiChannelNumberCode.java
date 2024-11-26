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

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 6.3
 */
public enum IpmiChannelNumberCode implements IpmiCode.Code {
    Primary_IPMB(0x0),
    C1(0x1),
    C2(0x2),
    C3(0x3),
    C4(0x4),
    C5(0x5),
    C6(0x6),
    C7(0x7),
    C8(0x8),
    C9(0x9),
    C10(0xA),
    C11(0xB),
    PRESENT(0xE),
    System_Interface(0xF);

    private final byte code;

    public static final int MASK = 0xF;

    private IpmiChannelNumberCode(int code) {
        this.code = ByteConvertUtils.checkCastByte(code);
    }

    @Override
    public byte getCode() {
        return code;
    }

}
