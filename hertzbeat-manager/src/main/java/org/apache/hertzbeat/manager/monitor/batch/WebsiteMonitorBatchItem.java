/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.batch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import lombok.Getter;
import lombok.Setter;

/**
 * Durable claim is committed before any native write. Only hashes and an owned result id persist.
 */
@Entity
@Table(name = "hzb_website_batch_item")
@Getter
@Setter
public class WebsiteMonitorBatchItem {
    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(length = 64, nullable = false)
    private String inputHash;

    @Column(length = 32, nullable = false)
    private String state;

    private Long monitorId;

    @Column(length = 64)
    private String reason;

    @Version private Long version;
}
