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

package org.apache.hertzbeat.common.entity.alerter;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Alert Ticket Order Entity
 */
@Entity
@Table(name = "hzb_ticket_order")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Ticket Order Entity")
public class TicketOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY, generator = "generator")
    @Schema(title = "Ticket Order ID")
    private Long id;

    @Schema(title = "Associated Alert ID")
    private Long alertId;
    
    @Schema(title = "Associated Monitor ID")
    private Long monitorId;

    @Schema(title = "Assignee User ID")
    private Long assigneeId;
    
    @Schema(title = "Assignee Username")
    private String assigneeName;

    @Schema(title = "Ticket Title")
    private String title;

    @Schema(title = "Ticket Content")
    @Column(length = 1024)
    private String content;

    @Schema(title = "Ticket Status: 0-Open, 1-In Progress, 2-Resolved, 3-Closed")
    private Byte status;

    @Schema(title = "Solution Content")
    @Column(length = 1024)
    private String solution;

    @Schema(title = "Priority: 0-High, 1-Medium, 2-Low")
    private Byte priority;

    @Schema(title = "Creation Time")
    private Long gmtCreate;

    @Schema(title = "Modification Time")
    private Long gmtUpdate;
} 