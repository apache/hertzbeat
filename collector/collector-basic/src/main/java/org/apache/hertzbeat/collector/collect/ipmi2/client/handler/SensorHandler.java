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

package org.apache.hertzbeat.collector.collect.ipmi2.client.handler;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.client.UdpConnection;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSdrRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSdrResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSensorReadingRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSensorReadingResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.ReserveSdrRepositoryRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.ReserveSdrRepositoryResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.code.IpmiReadingTypeCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 *  SensorHandler
 */
@Slf4j
public class SensorHandler implements IpmiHandler {

    @Override
    public void handler(IpmiSession session, UdpConnection connection, CollectRep.MetricsData.Builder builder, Metrics metrics) throws IOException {
        ReserveSdrRepositoryResponse response = connection.get(session, new ReserveSdrRepositoryRequest(), ReserveSdrRepositoryResponse.class);
        int reserveId = response.reserveId;
        int recordId = GetSdrRequest.RECORD_ID_START;
        while (true) {
            if (recordId == 0xFFFF) {
                break;
            }
            GetSdrRequest headRequest = new GetSdrRequest(reserveId, recordId, (byte) 0, GetSdrRequest.HEADER_LENGTH);
            GetSdrResponse getSdrHeadResponse = connection.get(session, headRequest, GetSdrResponse.class);
            if (getSdrHeadResponse.recordType != 0x01) {
                recordId = getSdrHeadResponse.nextRecordId;
                continue;
            }
            Map<String, String> parseValue = new HashMap<>();
            GetSdrRequest request = new GetSdrRequest(reserveId, recordId, (byte) 0, (byte) (getSdrHeadResponse.recordLength + 5));
            recordId = getSdrHeadResponse.nextRecordId;
            GetSdrResponse getSdrBodyResponse = connection.get(session, request, GetSdrResponse.class);
            if (isReadable(getSdrBodyResponse)) {
                byte sensorNum = getSdrBodyResponse.sensorNumber;
                GetSensorReadingRequest readingRequest = new GetSensorReadingRequest(sensorNum);
                readingRequest.setRqLun(getSdrBodyResponse.sensorOwnerLun);
                try {
                    GetSensorReadingResponse getSensorReadingResponse = connection.get(session, readingRequest, GetSensorReadingResponse.class);
                    double sensorReading = calcSensorValue(getSdrBodyResponse, getSensorReadingResponse.sensorReading);
                    parseValue.put("sensor_reading", String.format("%.3f", sensorReading) + " " + getSdrBodyResponse.unitTypeCode.getDescription());
                } catch (Exception e) {
                    log.error("get sensor reading error", e);
                }
            }
            parseValue.put("sensor_id", getSdrBodyResponse.sensorIdString);
            parseValue.put("entity_id", getSdrBodyResponse.entityIdCode.getDescription());
            parseValue.put("sensor_type", getSdrBodyResponse.sensorTypeCode.getDescription());
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (Metrics.Field field : metrics.getFields()) {
                if (!parseValue.containsKey(field.getField())) {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    continue;
                }
                valueRowBuilder.addColumns(parseValue.get(field.getField()));
            }
            builder.addValues(valueRowBuilder.build());
        }
    }

    public boolean isReadable(GetSdrResponse response) {
        if (response.recordType != 0x01) {
            return false;
        }
        if (response.readingTypeCode != IpmiReadingTypeCode.Threshold) {
            return false;
        }
        if (response.analogDataFormat == 0x03) {
            return false;
        }
        return true;
    }

    public double calcSensorValue(GetSdrResponse response, int raw) {
        switch (response.analogDataFormat) {
            case 0x00 -> raw = raw & 0xFF;
            case 0x01 -> {
                int signbit = raw & 0x80;
                if (signbit != 0) {
                    raw = ~raw & 0x7F;
                    raw = -raw;
                }
            }
            case 0x02 -> raw = ByteConvertUtils.getBitsAsSigned(raw, 8);
            default -> {
                return 0.0;
            }
        }
        double value = (response.m * raw + response.b * Math.pow(10, response.k1)) * Math.pow(10, response.k2);
        switch (response.linear) {
            case 0x01 -> value = Math.log(value);
            case 0x02 -> value = Math.log10(value);
            case 0x03 -> value = Math.log(value) / Math.log(2);
            case 0x04 -> value = Math.exp(value);
            case 0x05 -> value = Math.pow(10, value);
            case 0x06 -> value = Math.pow(2, value);
            case 0x07 -> value = Math.pow(value, -1.0);
            case 0x08 -> value = Math.pow(value, 2.0);
            case 0x09 -> value = Math.pow(value, 3.0);
            case 0x0A -> value = Math.sqrt(value);
            case 0x0B -> value = Math.cbrt(value);
            default -> {
            }
        }
        return value;
    }
}
