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

package org.apache.hertzbeat.alert.dao;

import org.apache.hertzbeat.common.entity.alerter.TicketOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

/**
 * Ticket Order DAO Interface
 */
public interface TicketOrderDao extends JpaRepository<TicketOrder, Long>, JpaSpecificationExecutor<TicketOrder> {

    /**
     * Find tickets by alert ID
     * @param alertId Alert ID
     * @return Ticket order list
     */
    List<TicketOrder> findTicketOrdersByAlertId(Long alertId);
    
    /**
     * Find tickets by assignee ID
     * @param assigneeId Assignee ID
     * @return Ticket order list
     */
    List<TicketOrder> findTicketOrdersByAssigneeId(Long assigneeId);
    
    /**
     * Find open tickets by alert ID
     * @param alertId Alert ID
     * @param status Ticket status
     * @return Ticket order optional
     */
    Optional<TicketOrder> findTicketOrderByAlertIdAndStatusNot(Long alertId, Byte status);
    
    /**
     * Find tickets by status
     * @param status Ticket status
     * @return Ticket order list
     */
    List<TicketOrder> findTicketOrdersByStatus(Byte status);
    
    /**
     * Find tickets by monitor ID
     * @param monitorId Monitor ID
     * @return Ticket order list
     */
    List<TicketOrder> findTicketOrdersByMonitorId(Long monitorId);

    /**
     * Find tickets by assignee ID and status
     * @param assigneeId Assignee ID
     * @param status Ticket status
     * @return Ticket order list
     */
    List<TicketOrder> findTicketOrdersByAssigneeIdAndStatus(Long assigneeId, Byte status);
} 