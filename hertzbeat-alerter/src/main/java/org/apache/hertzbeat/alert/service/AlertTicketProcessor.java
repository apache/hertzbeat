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

package org.apache.hertzbeat.alert.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.TicketConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.TicketOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Alert to Ticket Integration Component
 */
@Component
@Slf4j
public class AlertTicketProcessor {

    @Autowired
    private TicketOrderService ticketOrderService;

    /**
     * Process new firing alerts to create tickets
     * @param groupAlert Group alert entity
     */
    public void processNewAlert(GroupAlert groupAlert) {
        if (groupAlert == null || !CommonConstants.ALERT_STATUS_FIRING.equals(groupAlert.getStatus())) {
            return;
        }
        
        try {
            Map<String, String> labels = groupAlert.getLabels();
            if (labels == null || labels.isEmpty()) {
                log.warn("Alert has no labels, cannot create ticket: {}", groupAlert.getId());
                return;
            }
            
            String monitorIdStr = labels.get("monitorId");
            if (StringUtils.isBlank(monitorIdStr)) {
                log.warn("Alert has no monitorId in labels, cannot create ticket: {}", groupAlert.getId());
                return;
            }
            
            Long monitorId = Long.parseLong(monitorIdStr);
            Byte priority = translateAlertPriorityToTicketPriority(groupAlert.getPriority());
            
            String title = String.format("[%s] %s", 
                    getPriorityText(priority), 
                    groupAlert.getFirstAlerts().get(0).getContent());
            
            String content = buildTicketContent(groupAlert);
            
            ticketOrderService.processAlertToTicket(
                    groupAlert.getId(),
                    monitorId,
                    title,
                    content,
                    priority
            );
        } catch (Exception e) {
            log.error("Failed to create ticket for alert: " + groupAlert.getId(), e);
        }
    }
    
    /**
     * Process resolved alerts to close tickets
     * @param groupAlert Group alert entity
     */
    public void processResolvedAlert(GroupAlert groupAlert) {
        if (groupAlert == null || !CommonConstants.ALERT_STATUS_RESOLVED.equals(groupAlert.getStatus())) {
            return;
        }
        
        try {
            int closedCount = ticketOrderService.closeTicketsWhenAlertResolved(groupAlert.getId());
            if (closedCount > 0) {
                log.info("Closed {} tickets for resolved alert {}", closedCount, groupAlert.getId());
            }
        } catch (Exception e) {
            log.error("Failed to close tickets for resolved alert: " + groupAlert.getId(), e);
        }
    }
    
    /**
     * Translate alert priority to ticket priority
     * @param alertPriority Alert priority
     * @return Ticket priority
     */
    private Byte translateAlertPriorityToTicketPriority(Byte alertPriority) {
        if (alertPriority == null) {
            return TicketConstants.TICKET_PRIORITY_MEDIUM;
        }
        
        return switch (alertPriority) {
            case CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY -> TicketConstants.TICKET_PRIORITY_HIGH;
            case CommonConstants.ALERT_PRIORITY_CODE_CRITICAL -> TicketConstants.TICKET_PRIORITY_MEDIUM;
            case CommonConstants.ALERT_PRIORITY_CODE_WARNING -> TicketConstants.TICKET_PRIORITY_LOW;
            default -> TicketConstants.TICKET_PRIORITY_MEDIUM;
        };
    }
    
    /**
     * Get priority text
     * @param priority Ticket priority
     * @return Priority text
     */
    private String getPriorityText(Byte priority) {
        return switch (priority) {
            case TicketConstants.TICKET_PRIORITY_HIGH -> "High";
            case TicketConstants.TICKET_PRIORITY_MEDIUM -> "Medium";
            case TicketConstants.TICKET_PRIORITY_LOW -> "Low";
            default -> "Medium";
        };
    }
    
    /**
     * Build ticket content from alert
     * @param groupAlert Group alert entity
     * @return Formatted ticket content
     */
    private String buildTicketContent(GroupAlert groupAlert) {
        StringBuilder content = new StringBuilder();
        
        // Add main alert information
        content.append("Alert ID: ").append(groupAlert.getId()).append("\n");
        content.append("Status: ").append(groupAlert.getStatus()).append("\n");
        content.append("Priority: ").append(getPriorityText(translateAlertPriorityToTicketPriority(groupAlert.getPriority()))).append("\n\n");
        
        // Add labels
        if (groupAlert.getLabels() != null && !groupAlert.getLabels().isEmpty()) {
            content.append("Labels:\n");
            groupAlert.getLabels().forEach((key, value) -> 
                    content.append("- ").append(key).append(": ").append(value).append("\n"));
            content.append("\n");
        }
        
        // Add annotations
        if (groupAlert.getAnnotations() != null && !groupAlert.getAnnotations().isEmpty()) {
            content.append("Annotations:\n");
            groupAlert.getAnnotations().forEach((key, value) -> 
                    content.append("- ").append(key).append(": ").append(value).append("\n"));
            content.append("\n");
        }
        
        // Add alert details
        if (groupAlert.getFirstAlerts() != null && !groupAlert.getFirstAlerts().isEmpty()) {
            content.append("Alert Details:\n");
            content.append(groupAlert.getFirstAlerts().get(0).getContent()).append("\n\n");
        }
        
        // Add time information
        if (groupAlert.getFirstTime() != null) {
            content.append("First Occurrence: ").append(new java.util.Date(groupAlert.getFirstTime())).append("\n");
        }
        if (groupAlert.getLastTime() != null) {
            content.append("Last Update: ").append(new java.util.Date(groupAlert.getLastTime())).append("\n");
        }
        
        return content.toString();
    }
} 