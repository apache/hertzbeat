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

import org.apache.hertzbeat.common.entity.alerter.TicketOrder;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Set;

/**
 * Ticket Order Service Interface
 */
public interface TicketOrderService {

    /**
     * Create a new ticket order
     * @param ticketOrder Ticket order entity
     * @throws RuntimeException Exception during creation
     */
    void addTicketOrder(TicketOrder ticketOrder) throws RuntimeException;

    /**
     * Modify an existing ticket order
     * @param ticketOrder Ticket order entity
     * @throws RuntimeException Exception during modification
     */
    void modifyTicketOrder(TicketOrder ticketOrder) throws RuntimeException;

    /**
     * Delete ticket orders
     * @param ticketIds Ticket order IDs
     * @throws RuntimeException Exception during deletion
     */
    void deleteTicketOrders(Set<Long> ticketIds) throws RuntimeException;

    /**
     * Get ticket order by ID
     * @param ticketId Ticket order ID
     * @return Ticket order entity
     * @throws RuntimeException Exception during query
     */
    TicketOrder getTicketOrder(long ticketId) throws RuntimeException;

    /**
     * Get all ticket orders with pagination
     * @param status Ticket status
     * @param search Search text
     * @param sort Sort field
     * @param order Sort order
     * @param pageIndex Page index
     * @param pageSize Page size
     * @return Paginated ticket orders
     */
    Page<TicketOrder> getTicketOrders(String status, String search, String sort, String order, int pageIndex, int pageSize);

    /**
     * Get ticket orders assigned to user
     * @param assigneeId Assignee ID
     * @param status Ticket status
     * @return List of ticket orders
     */
    List<TicketOrder> getTicketOrdersByAssignee(Long assigneeId, Byte status);
    
    /**
     * Process alert to ticket automatically
     * @param alertId Alert ID
     * @param monitorId Monitor ID
     * @param title Alert title
     * @param content Alert content
     * @param priority Alert priority
     * @return Created ticket order
     */
    TicketOrder processAlertToTicket(Long alertId, Long monitorId, String title, String content, Byte priority);

    /**
     * Update ticket status
     * @param ticketId Ticket ID
     * @param status New status
     * @param solution Solution content
     * @throws RuntimeException Exception during update
     */
    void updateTicketStatus(Long ticketId, Byte status, String solution) throws RuntimeException;

    /**
     * Check if alert has open ticket
     * @param alertId Alert ID
     * @return True if has open ticket
     */
    boolean hasOpenTicket(Long alertId);
    
    /**
     * Close tickets when alert is resolved
     * @param alertId Alert ID
     * @return Number of tickets closed
     */
    int closeTicketsWhenAlertResolved(Long alertId);

    /**
     * Delete ticket orders by IDs
     * @param ids ticket order IDs
     */
    void deleteTicketOrders(List<Long> ids);
} 