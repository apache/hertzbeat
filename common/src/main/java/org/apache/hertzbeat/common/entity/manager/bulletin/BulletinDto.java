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


package org.apache.hertzbeat.common.entity.manager.bulletin;

import java.util.List;
import java.util.Map;
import lombok.Data;

/**
 * Bulletin DTO
 */
@Data
public class BulletinDto {

    /**
     * Bulletin name
     */
    private String name;

    /**
     * Monitor type eg: jvm, tomcat
     */
    private String app;


    /**
     * Monitor fields
     */
    private Map<String, List<String>> fields;

    /**
     * Monitor ids
     */
    private List<Long> monitorIds;

}
