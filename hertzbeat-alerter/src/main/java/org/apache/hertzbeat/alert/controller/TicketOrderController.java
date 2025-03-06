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

package org.apache.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.alert.service.TicketOrderService;
import org.apache.hertzbeat.common.constants.TicketConstants;
import org.apache.hertzbeat.common.entity.alerter.TicketOrder;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Ticket Order API
 */
@Tag(name = "Ticket Order API")
@RestController
@RequestMapping(path = "/api/ticket")
public class TicketOrderController {

    @Autowired
    private TicketOrderService ticketOrderService;

    @PostMapping
    @Operation(summary = "Create New Ticket", description = "Create a new ticket order")
    public ResponseEntity<Message<Void>> addTicketOrder(@RequestBody TicketOrder ticketOrder) {
        ticketOrderService.addTicketOrder(ticketOrder);
        return ResponseEntity.ok(Message.success());
    }

    @PutMapping
    @Operation(summary = "Update Ticket", description = "Update an existing ticket order")
    public ResponseEntity<Message<Void>> modifyTicketOrder(@RequestBody TicketOrder ticketOrder) {
        ticketOrderService.modifyTicketOrder(ticketOrder);
        return ResponseEntity.ok(Message.success());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Ticket Detail", description = "Get ticket order detail by ID")
    public ResponseEntity<Message<TicketOrder>> getTicketOrder(
            @Parameter(description = "Ticket ID") @PathVariable("id") Long id) {
        TicketOrder ticketOrder = ticketOrderService.getTicketOrder(id);
        return ResponseEntity.ok(Message.success(ticketOrder));
    }

    @GetMapping
    @Operation(summary = "Get Ticket List", description = "Get ticket order list with pagination")
    public ResponseEntity<Message<Page<TicketOrder>>> getTicketOrders(
            @Parameter(description = "Status") @RequestParam(required = false) String status,
            @Parameter(description = "Search") @RequestParam(required = false) String search,
            @Parameter(description = "Sort Field") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort Order") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "Page Number") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Page Size") @RequestParam(defaultValue = "8") int pageSize) {
        Page<TicketOrder> ticketOrders = ticketOrderService.getTicketOrders(status, search, sort, order, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(ticketOrders));
    }

    @GetMapping("/assignee/{assigneeId}")
    @Operation(summary = "Get Assignee's Tickets", description = "Get ticket orders by assignee ID")
    public ResponseEntity<Message<List<TicketOrder>>> getTicketOrdersByAssignee(
            @Parameter(description = "Assignee ID") @PathVariable("assigneeId") Long assigneeId,
            @Parameter(description = "Status") @RequestParam(required = false) Byte status) {
        List<TicketOrder> ticketOrders = ticketOrderService.getTicketOrdersByAssignee(assigneeId, status);
        return ResponseEntity.ok(Message.success(ticketOrders));
    }

    @PutMapping("/status/{id}")
    @Operation(summary = "Update Ticket Status", description = "Update ticket order status")
    public ResponseEntity<Message<Void>> updateTicketStatus(
            @Parameter(description = "Ticket ID") @PathVariable("id") Long id,
            @Parameter(description = "Status") @RequestParam Byte status,
            @Parameter(description = "Solution") @RequestParam(required = false) String solution) {
        ticketOrderService.updateTicketStatus(id, status, solution);
        return ResponseEntity.ok(Message.success());
    }

    @DeleteMapping("/{ids}")
    @Operation(summary = "Delete Tickets", description = "Delete ticket orders by IDs")
    public ResponseEntity<Message<Void>> deleteTickets(
            @Parameter(description = "Ticket IDs, comma separated") @PathVariable("ids") List<Long> ids) {
        ticketOrderService.deleteTicketOrders(ids);
        return ResponseEntity.ok(Message.success());
    }

    @GetMapping("/status-options")
    @Operation(summary = "Get Status Options", description = "Get ticket status options")
    public ResponseEntity<Message<List<StatusOption>>> getStatusOptions() {
        List<StatusOption> options = List.of(
            new StatusOption(TicketConstants.TICKET_STATUS_OPEN, "Open"),
            new StatusOption(TicketConstants.TICKET_STATUS_IN_PROGRESS, "In Progress"),
            new StatusOption(TicketConstants.TICKET_STATUS_RESOLVED, "Resolved"),
            new StatusOption(TicketConstants.TICKET_STATUS_CLOSED, "Closed")
        );
        return ResponseEntity.ok(Message.success(options));
    }

    @GetMapping("/priority-options")
    @Operation(summary = "Get Priority Options", description = "Get ticket priority options")
    public ResponseEntity<Message<List<StatusOption>>> getPriorityOptions() {
        List<StatusOption> options = List.of(
            new StatusOption(TicketConstants.TICKET_PRIORITY_HIGH, "High"),
            new StatusOption(TicketConstants.TICKET_PRIORITY_MEDIUM, "Medium"),
            new StatusOption(TicketConstants.TICKET_PRIORITY_LOW, "Low")
        );
        return ResponseEntity.ok(Message.success(options));
    }

    /**
     * Status option class for dropdown lists
     */
    static class StatusOption {
        private final byte value;
        private final String label;

        public StatusOption(byte value, String label) {
            this.value = value;
            this.label = label;
        }

        public byte getValue() {
            return value;
        }

        public String getLabel() {
            return label;
        }
    }
} 