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
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.HmacMd5128;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.HmacSha196;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.HmacSha256128;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.Md5128;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.IpmiIntegrity;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.None;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 13.28.4
 */
public enum IpmiIntegrityCode implements IpmiCode.Code{
    NONE(0x00, None.class),
    HMAC_SHA1_96(0x01, HmacSha196.class),
    HMAC_MD5_128(0x02, HmacMd5128.class),
    MD5_128(0x03, Md5128.class),
    HMAC_SHA256_128(0x04, HmacSha256128.class);

    private final byte code;

    private final Class<? extends IpmiIntegrity> integrity;

    IpmiIntegrityCode(int code, Class<? extends IpmiIntegrity> integrity) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.integrity = integrity;
    }

    @Override
    public byte getCode() {
        return code;
    }

    public IpmiIntegrity newIpmiIntegrity() {
        if (integrity == null) {
            return null;
        }
        try {
            return integrity.newInstance();
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }
}
