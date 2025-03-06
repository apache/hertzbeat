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

package org.apache.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dao.TicketOrderDao;
import org.apache.hertzbeat.alert.service.TicketOrderService;
import org.apache.hertzbeat.common.constants.TicketConstants;
import org.apache.hertzbeat.common.entity.alerter.TicketOrder;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Ticket Order Service Implementation
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class TicketOrderServiceImpl implements TicketOrderService {

    @Autowired
    private TicketOrderDao ticketOrderDao;
    
    @Autowired
    private MonitorService monitorService;

    @Override
    public void addTicketOrder(TicketOrder ticketOrder) throws RuntimeException {
        if (ticketOrder.getMonitorId() != null && ticketOrder.getMonitorId() > 0) {
            Optional<Monitor> monitorOptional = monitorService.getMonitor(ticketOrder.getMonitorId());
            if (monitorOptional.isEmpty()) {
                throw new IllegalArgumentException("The monitor does not exist");
            }
        }
        ticketOrder.setGmtCreate(Instant.now().toEpochMilli());
        ticketOrder.setGmtUpdate(ticketOrder.getGmtCreate());
        ticketOrderDao.save(ticketOrder);
    }

    @Override
    public void modifyTicketOrder(TicketOrder ticketOrder) throws RuntimeException {
        Optional<TicketOrder> orderOptional = ticketOrderDao.findById(ticketOrder.getId());
        if (orderOptional.isEmpty()) {
            throw new IllegalArgumentException("The ticket order does not exist");
        }
        TicketOrder existOrder = orderOptional.get();
        if (ticketOrder.getStatus() != null) {
            existOrder.setStatus(ticketOrder.getStatus());
        }
        if (ticketOrder.getPriority() != null) {
            existOrder.setPriority(ticketOrder.getPriority());
        }
        if (ticketOrder.getTitle() != null) {
            existOrder.setTitle(ticketOrder.getTitle());
        }
        if (ticketOrder.getContent() != null) {
            existOrder.setContent(ticketOrder.getContent());
        }
        if (ticketOrder.getSolution() != null) {
            existOrder.setSolution(ticketOrder.getSolution());
        }
        existOrder.setGmtUpdate(Instant.now().toEpochMilli());
        ticketOrderDao.save(existOrder);
    }

    @Override
    public void deleteTicketOrders(Set<Long> ticketIds) throws RuntimeException {
        ticketOrderDao.deleteAllById(ticketIds);
    }

    @Override
    public TicketOrder getTicketOrder(long ticketId) throws RuntimeException {
        Optional<TicketOrder> orderOptional = ticketOrderDao.findById(ticketId);
        if (orderOptional.isEmpty()) {
            throw new IllegalArgumentException("The ticket order does not exist");
        }
        return orderOptional.get();
    }

    @Override
    public Page<TicketOrder> getTicketOrders(String status, String search, String sort, String order, int pageIndex, int pageSize) {
        Specification<TicketOrder> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("status"), Byte.valueOf(status)));
            }
            if (search != null && !search.isEmpty()) {
                String searchLike = "%" + search + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(root.get("title"), searchLike),
                        criteriaBuilder.like(root.get("content"), searchLike),
                        criteriaBuilder.like(root.get("assigneeName"), searchLike)
                ));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
        if (sort != null && !sort.isEmpty()) {
            return ticketOrderDao.findAll(specification,
                    PageRequest.of(pageIndex - 1, pageSize,
                            "asc".equals(order) ? org.springframework.data.domain.Sort.Direction.ASC
                                    : org.springframework.data.domain.Sort.Direction.DESC,
                            sort));
        } else {
            return ticketOrderDao.findAll(specification,
                    PageRequest.of(pageIndex - 1, pageSize));
        }
    }

    @Override
    public List<TicketOrder> getTicketOrdersByAssignee(Long assigneeId, Byte status) {
        if (status != null) {
            return ticketOrderDao.findTicketOrdersByAssigneeIdAndStatus(assigneeId, status);
        } else {
            return ticketOrderDao.findTicketOrdersByAssigneeId(assigneeId);
        }
    }

    @Override
    public TicketOrder processAlertToTicket(Long alertId, Long monitorId, String title, String content, Byte priority) {
        // Check if there's already an open ticket for this alert
        if (hasOpenTicket(alertId)) {
            log.info("Alert {} already has an open ticket, skipping ticket creation", alertId);
            return null;
        }
        
        // Find monitor owner/assignee
        Optional<Monitor> monitorOptional = monitorService.getMonitor(monitorId);
        if (monitorOptional.isEmpty()) {
            log.warn("Monitor not found for alert {}, cannot create ticket", alertId);
            return null;
        }
        
        Monitor monitor = monitorOptional.get();
        Long assigneeId = monitor.getCreator() != null ? Long.valueOf(monitor.getCreator()) : null;
        String assigneeName = monitor.getCreator();
        
        if (assigneeId == null) {
            log.warn("Monitor {} has no owner assigned, cannot create ticket for alert {}", monitorId, alertId);
            return null;
        }
        
        // Create new ticket
        TicketOrder ticketOrder = TicketOrder.builder()
                .alertId(alertId)
                .monitorId(monitorId)
                .assigneeId(assigneeId)
                .assigneeName(assigneeName)
                .title(title)
                .content(content)
                .status(TicketConstants.TICKET_STATUS_OPEN)
                .priority(priority)
                .gmtCreate(Instant.now().toEpochMilli())
                .gmtUpdate(Instant.now().toEpochMilli())
                .build();
        
        ticketOrderDao.save(ticketOrder);
        log.info("Created new ticket {} for alert {}, assigned to {}", ticketOrder.getId(), alertId, assigneeName);
        return ticketOrder;
    }

    @Override
    public void updateTicketStatus(Long ticketId, Byte status, String solution) throws RuntimeException {
        Optional<TicketOrder> ticketOrderOptional = ticketOrderDao.findById(ticketId);
        if (ticketOrderOptional.isEmpty()) {
            throw new RuntimeException("The ticket order does not exist: " + ticketId);
        }
        
        TicketOrder ticketOrder = ticketOrderOptional.get();
        ticketOrder.setStatus(status);
        
        if (StringUtils.isNotBlank(solution)) {
            ticketOrder.setSolution(solution);
        }
        
        ticketOrder.setGmtUpdate(Instant.now().toEpochMilli());
        ticketOrderDao.save(ticketOrder);
        log.info("Updated ticket {} status to {}", ticketId, status);
    }

    @Override
    public boolean hasOpenTicket(Long alertId) {
        Optional<TicketOrder> orderOptional = ticketOrderDao.findTicketOrderByAlertIdAndStatusNot(
                alertId, TicketConstants.TICKET_STATUS_CLOSED);
        return orderOptional.isPresent();
    }

    @Override
    public int closeTicketsWhenAlertResolved(Long alertId) {
        List<TicketOrder> openTickets = ticketOrderDao.findTicketOrdersByAlertId(alertId);
        int closedCount = 0;
        
        for (TicketOrder ticket : openTickets) {
            if (ticket.getStatus() != TicketConstants.TICKET_STATUS_CLOSED) {
                ticket.setStatus(TicketConstants.TICKET_STATUS_CLOSED);
                ticket.setGmtUpdate(Instant.now().toEpochMilli());
                if (ticket.getSolution() == null || ticket.getSolution().isEmpty()) {
                    ticket.setSolution("Alert automatically resolved");
                }
                ticketOrderDao.save(ticket);
                closedCount++;
            }
        }
        
        return closedCount;
    }

    /**
     * Delete ticket orders by IDs
     *
     * @param ids ticket order IDs
     */
    @Override
    public void deleteTicketOrders(List<Long> ids) {
        ticketOrderDao.deleteAllById(ids);
    }
} 