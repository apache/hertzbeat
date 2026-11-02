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

package org.apache.hertzbeat.ai.gateway.tool.application;

import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;

/** In-memory native JSON upload; cannot copy files to a caller-selected path. */
final class AgentInlineImportFile implements MultipartFile {
    private final byte[] bytes;

    AgentInlineImportFile(byte[] bytes) {
        this.bytes = bytes.clone();
    }

    public String getName() {
        return "file";
    }

    public String getOriginalFilename() {
        return "ai-import.json";
    }

    public String getContentType() {
        return "application/json";
    }

    public boolean isEmpty() {
        return bytes.length == 0;
    }

    public long getSize() {
        return bytes.length;
    }

    public byte[] getBytes() {
        return bytes.clone();
    }

    public InputStream getInputStream() {
        return new ByteArrayInputStream(bytes);
    }

    public void transferTo(File destination) throws IOException {
        throw new IOException("Path-based import transfer is unsupported");
    }
}
