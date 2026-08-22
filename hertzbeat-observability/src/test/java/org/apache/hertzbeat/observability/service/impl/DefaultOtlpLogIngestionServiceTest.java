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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@ExtendWith(MockitoExtension.class)
class DefaultOtlpLogIngestionServiceTest {

    @Mock
    private OtlpLogProtocolAdapter protocolAdapter;

    private DefaultOtlpLogIngestionService service;

    @BeforeEach
    void setUp() {
        service = new DefaultOtlpLogIngestionService(protocolAdapter);
    }

    @Test
    void shouldIngestJsonAndReturnJsonOtlpResponse() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        var response = service.ingestHttp("{}".getBytes(StandardCharsets.UTF_8), headers);

        verify(protocolAdapter).ingest("{}");
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getBody()).isEqualTo("{}".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void shouldIngestProtobufAndReturnProtobufOtlpResponse() {
        byte[] request = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/x-protobuf"));

        var response = service.ingestHttp(request, headers);

        verify(protocolAdapter).ingestBinary(request);
        assertThat(response.getHeaders().getContentType())
                .isEqualTo(MediaType.parseMediaType("application/x-protobuf"));
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void shouldDecompressCommaSeparatedGzipContentEncoding() throws Exception {
        byte[] request = ExportLogsServiceRequest.getDefaultInstance().toByteArray();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        headers.add(HttpHeaders.CONTENT_ENCODING, "identity, gzip");

        service.ingestHttp(gzip(request), headers);

        verify(protocolAdapter).ingestBinary(request);
    }

    @Test
    void shouldRejectMalformedGzipBeforeFanOut() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        headers.set(HttpHeaders.CONTENT_ENCODING, "gzip");

        assertThatThrownBy(() -> service.ingestHttp(new byte[] {1, 2, 3}, headers))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Malformed gzip OTLP log payload");
    }

    private byte[] gzip(byte[] content) throws Exception {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             GZIPOutputStream gzip = new GZIPOutputStream(output)) {
            gzip.write(content);
            gzip.finish();
            return output.toByteArray();
        }
    }
}
