/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Stable opaque revision derived only from authoritative definition state. */
public final class MonitorDefinitionRevision {

    private MonitorDefinitionRevision() {
    }

    public static String from(MonitorDefinitionSource source) {
        String material = MonitorDefinitionIdentity.normalize(source.job().getApp()) + '\0'
                + origin(source).value() + '\0'
                + source.builtin() + '\0'
                + source.custom() + '\0'
                + source.definition();
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(material.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable");
        }
    }

    public static MonitorDefinitionOrigin origin(MonitorDefinitionSource source) {
        if (source.builtin() && source.custom()) {
            return MonitorDefinitionOrigin.OVERRIDE;
        }
        return source.custom() ? MonitorDefinitionOrigin.CUSTOM : MonitorDefinitionOrigin.BUILTIN;
    }
}
