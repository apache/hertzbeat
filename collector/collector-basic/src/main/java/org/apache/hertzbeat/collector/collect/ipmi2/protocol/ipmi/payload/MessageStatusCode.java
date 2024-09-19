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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 13.24
 */
public enum MessageStatusCode implements IpmiCode.Code {
    NO_ERRORS(0x00, "No errors"),
    INSUFFICIENT_RESOURCE(0x01, "Insufficient resources to create a session"),
    INVALID_SESSION_ID(0x02, "Invalid session ID"),
    INVALID_PAYLOAD_TYPE(0x03, "Invalid payload type"),
    INVALID_AUTHENTICATION_ALGORITHM(0x04, "Invalid authentication algorithm"),
    INVALID_INTEGRITY_ALGORITHM(0x05, "Invalid integrity algorithm"),
    NO_MATCHING_AUTHENTICATION(0x06, "No matching authentication payload"),
    NO_MATCHING_INTEGRITY(0x07, "No matching integrity payload"),
    INACTIVE_SESSION(0x08, "Inactive session ID"),
    INVALID_ROLE(0x09, "Invalid role"),
    UNAUTHORIZED_ROLE(0x0A, "No matching authentication payload"),
    INSUFFICIENT_RESOURCE_FOR_ROLE(0x0B, "Insufficient resources to create asession at the requested role"),
    INVALID_NAME(0x0C, "Invalid name length"),
    UNAUTHORIZED_NAME(0x0D, "Unauthorized name"),
    UNAUTHORIZED_GUID(0x0E, "Unauthorized GUID. (GUID that BMCsubmitted in RAKP Message 2 was notaccepted by remote console)"),
    INVALID_INTEGRITY_CHECK_VALUE(0x0F, "Invalid integrity check value"),
    INVALID_CONFIDENTIALITY_ALGORITHM(0x10, "Invalid confidentiality algorithm"),
    NO_CIPHER_SUITE_MATCH(0x11, "No Cipher Suite match with proposed security algorithms"),
    ILLEGAL_PARAMETER(0x12, "Illegal or unrecognized parameter");

    public static final int MASK = 0xff;
    private final byte code;
    private final String description;

    MessageStatusCode(int code, String description) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.description = description;
    }

    @Override
    public byte getCode() {
        return code;
    }

    @Override
    public String getDescription() {
        return description;
    }
}
