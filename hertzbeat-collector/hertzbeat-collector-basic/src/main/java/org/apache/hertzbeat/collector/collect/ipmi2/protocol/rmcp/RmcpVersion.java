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

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 * See ASF 3.2.2.2 RMCP Header
 */
public enum RmcpVersion implements IpmiCode.Code {

    LEGACY0(0),
    LEGACY1(1),
    LEGACY2(2),
    LEGACY3(3),
    LEGACY4(4),
    LEGACY5(5),
    ASF_RMCP_1_0(6);
    final byte code;

    private RmcpVersion(int code) {
        this.code = ByteConvertUtils.checkCastByte(code);
    }

    @Override
    public byte getCode() {
        return code;
    }
}
