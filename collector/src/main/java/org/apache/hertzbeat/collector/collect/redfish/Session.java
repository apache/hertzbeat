package org.apache.hertzbeat.collector.collect.redfish;

/**
 * Redfish session
 */
public record Session(String token, String location, String host, Integer port) {}
