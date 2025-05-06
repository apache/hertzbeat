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

package org.apache.hertzbeat.alert.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

/**
 * uptime-kuma alert content entity
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UptimeKumaExternAlert {

    private Heartbeat heartbeat;

    private Monitor monitor;

    private String msg;

    /**
     * Monitor information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Heartbeat {
        @JsonProperty("monitorID")
        private int monitorId;
        private int status;
        private String time;
        private String msg;
        private boolean important;
        private int duration;
        private String timezone;
        private String timezoneOffset;
        private String localDateTime;
    }

    /**
     * Monitor information
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Monitor {
        private int id;
        private String name;
        private String description;
        private String pathName;
        private String parent;
        @JsonProperty("childrenIDs")
        private List<String> childrenIds;
        private String url;
        private String method;
        private String hostname;
        private String port;
        @JsonProperty("maxretries")
        private int maxRetries;
        private int weight;
        private boolean active;
        private boolean forceInactive;
        private String type;
        private int timeout;
        private int interval;
        private int retryInterval;
        private int resendInterval;
        private String keyword;
        private boolean invertKeyword;
        private boolean expiryNotification;
        private boolean ignoreTls;
        private boolean upsideDown;
        private int packetSize;
        @JsonProperty("maxredirects")
        private int maxRedirects;
        @JsonProperty("accepted_statuscodes")
        private List<String> acceptedStatusCodes;
        private String dnsResolveType;
        private String dnsResolveServer;
        private String dnsLastResult;
        private String dockerContainer;
        private String dockerHost;
        private String proxyId;
        private Map<String, Object> notificationIDList;
        private List<String> tags;
        private boolean maintenance;
        private String mqttTopic;
        private String mqttSuccessMessage;
        private String databaseQuery;
        private String authMethod;
        private String grpcUrl;
        private String grpcProtobuf;
        private String grpcMethod;
        private String grpcServiceName;
        private boolean grpcEnableTls;
        private String radiusCalledStationId;
        private String radiusCallingStationId;
        private String game;
        private boolean gamedigGivenPortOnly;
        private String httpBodyEncoding;
        private String jsonPath;
        private String expectedValue;
        private String kafkaProducerTopic;
        private List<String> kafkaProducerBrokers;
        private boolean kafkaProducerSsl;
        private boolean kafkaProducerAllowAutoTopicCreation;
        private String kafkaProducerMessage;
        private String screenshot;
        private boolean includeSensitiveData;
    }
}
