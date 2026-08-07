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

package org.apache.hertzbeat.manager.setup.config;

/** Defensive secret-bearing export bytes that never render their content. */
public final class SensitiveExportContent {

    private final byte[] content;

    private SensitiveExportContent(byte[] content) {
        this.content = content.clone();
    }

    public static SensitiveExportContent of(byte[] content) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("Export content must not be empty");
        }
        return new SensitiveExportContent(content);
    }

    public byte[] copy() {
        return content.clone();
    }

    @Override
    public String toString() {
        return "SensitiveExportContent[<redacted>]";
    }
}
