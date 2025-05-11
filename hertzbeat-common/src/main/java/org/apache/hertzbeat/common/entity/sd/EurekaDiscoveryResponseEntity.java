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

package org.apache.hertzbeat.common.entity.sd;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * eureka service discovery entity
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JacksonXmlRootElement(localName = "applications")
public class EurekaDiscoveryResponseEntity {

    @JacksonXmlProperty(localName = "versions__delta")
    private int versionsDelta;

    @JacksonXmlProperty(localName = "apps__hashcode")
    private String appsHashcode;

    @JacksonXmlElementWrapper(useWrapping = false)
    @JacksonXmlProperty(localName = "application")
    private List<Application> applications;

    /**
     * eureka  application entity
     */
    @Data
    public static class Application {

        @JacksonXmlProperty(localName = "name")
        private String name;

        @JacksonXmlElementWrapper(useWrapping = false)
        @JacksonXmlProperty(localName = "instance")
        private List<Instance> instances;
    }

    /**
     * eureka instance entity
     */
    @Data
    public static class Instance {
        @JacksonXmlProperty(localName = "instanceId")
        private String instanceId;

        @JacksonXmlProperty(localName = "hostName")
        private String hostName;

        @JacksonXmlProperty(localName = "app")
        private String app;

        @JacksonXmlProperty(localName = "ipAddr")
        private String ipAddr;

        @JacksonXmlProperty(localName = "status")
        private String status;

        @JacksonXmlProperty(localName = "port")
        private Integer port;

    }
}
