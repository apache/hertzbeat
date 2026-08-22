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

package org.apache.hertzbeat.observability.service.impl;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.GZIPInputStream;
import org.apache.hertzbeat.observability.service.OtlpLogIngestionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/** Default OTLP log ingestion service backed by the HertzBeat log fan-out. */
@Service
public class DefaultOtlpLogIngestionService implements OtlpLogIngestionService {

    private static final MediaType PROTOBUF = MediaType.parseMediaType("application/x-protobuf");
    private static final byte[] JSON_RESPONSE = "{}".getBytes(StandardCharsets.UTF_8);
    private static final byte[] PROTOBUF_RESPONSE = ExportLogsServiceResponse.getDefaultInstance().toByteArray();

    private final OtlpLogProtocolAdapter protocolAdapter;

    public DefaultOtlpLogIngestionService(OtlpLogProtocolAdapter protocolAdapter) {
        this.protocolAdapter = protocolAdapter;
    }

    @Override
    public ResponseEntity<byte[]> ingestHttp(byte[] content, HttpHeaders headers) {
        HttpHeaders safeHeaders = headers == null ? HttpHeaders.EMPTY : headers;
        byte[] normalizedContent = maybeDecompress(content, safeHeaders);
        MediaType contentType = safeHeaders.getContentType();
        if (contentType != null && MediaType.APPLICATION_JSON.includes(contentType)) {
            protocolAdapter.ingest(new String(normalizedContent, StandardCharsets.UTF_8));
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(JSON_RESPONSE);
        }
        protocolAdapter.ingestBinary(normalizedContent);
        return ResponseEntity.ok().contentType(PROTOBUF).body(PROTOBUF_RESPONSE);
    }

    @Override
    public byte[] ingestProtobuf(byte[] content) {
        protocolAdapter.ingestBinary(content);
        return PROTOBUF_RESPONSE;
    }

    private byte[] maybeDecompress(byte[] content, HttpHeaders headers) {
        byte[] safeContent = content == null ? new byte[0] : content;
        List<String> encodings = headers.get(HttpHeaders.CONTENT_ENCODING);
        if (encodings == null || encodings.stream().noneMatch(this::containsGzipEncoding)) {
            return safeContent;
        }
        try (GZIPInputStream input = new GZIPInputStream(new ByteArrayInputStream(safeContent));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            input.transferTo(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalArgumentException("Malformed gzip OTLP log payload", exception);
        }
    }

    private boolean containsGzipEncoding(String value) {
        if (value == null) {
            return false;
        }
        for (String encoding : value.split(",")) {
            if ("gzip".equalsIgnoreCase(encoding.trim())) {
                return true;
            }
        }
        return false;
    }
}
