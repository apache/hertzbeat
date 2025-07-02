package org.apache.hertzbeat.log.service;

/**
 * Adapter interface for ingesting logs pushed via different protocols
 * (e.g. OTLP, Loki, Filebeat, Vector).
 *
 * Implementations should:
 *   1. Parse raw HTTP payload of their protocol.
 *   2. Convert data to LogEntry.
 *   3. Forward / persist it to downstream pipeline.
 */
public interface LogProtocolAdapter {

    /**
     * Ingest raw log payload pushed from external system.
     *
     * @param content raw request body string
     */
    void ingest(String content);

    /**
     * Identifier of the protocol this adapter supports ("otlp", "vector", etc.)
     */
    String supportSource();
} 