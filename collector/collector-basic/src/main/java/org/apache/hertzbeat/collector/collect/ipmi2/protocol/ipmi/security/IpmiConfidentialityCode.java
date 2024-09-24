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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.AesCbc128;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.IpmiConfidentiality;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.None;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.Xrc440;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.Xrc4128;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 13.28.5
 */
public enum IpmiConfidentialityCode implements IpmiCode.Code {
    NONE(0x00, None.class),
    AES_CBC_128(0x01, AesCbc128.class),
    xRC4_128(0x02, Xrc4128.class),
    xRC4_40(0x03, Xrc440.class);

    private final byte code;

    private final Class<? extends IpmiConfidentiality> confidentiality;

    IpmiConfidentialityCode(int code, Class<? extends IpmiConfidentiality> confidentiality) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.confidentiality = confidentiality;
    }

    @Override
    public byte getCode() {
        return code;
    }

    public IpmiConfidentiality newIpmiConfidentiality() {
        if (confidentiality == null) {
            return null;
        }
        try {
            return confidentiality.newInstance();
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }
}
