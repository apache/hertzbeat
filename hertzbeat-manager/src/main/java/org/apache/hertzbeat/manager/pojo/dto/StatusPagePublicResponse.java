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

package org.apache.hertzbeat.manager.pojo.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;

/**
 * Explicit public status-page projections. Management DTOs retain their full schema.
 * Never expose audit identities or the internal monitor-matching label selectors.
 */
public final class StatusPagePublicResponse {

    private StatusPagePublicResponse() {
    }

    /** Public component and availability history. */
    public record ComponentStatusInfo(Component info, List<History> history) {
    }

    public static ComponentStatusInfo componentStatus(ComponentStatus value) {
        return value == null ? null : new ComponentStatusInfo(component(value.getComponentInfo()),
                map(value.getHistoryItems(), StatusPagePublicResponse::history));
    }

    public static List<ComponentStatusInfo> componentStatuses(List<ComponentStatus> values) {
        return map(values, StatusPagePublicResponse::componentStatus);
    }

    /** Public status-page organization. */
    public record Org(Long id,
                         String name,
                         String description,
                         String home,
                         String logo,
                         String feedback,
                         String color,
                         byte state,
                         LocalDateTime gmtCreate,
                         LocalDateTime gmtUpdate) {
    }

    public static Org org(StatusPageOrgInfo value) {
        return value == null ? null : new Org(value.getId(),
                value.getName(),
                value.getDescription(),
                value.getHome(),
                value.getLogo(),
                value.getFeedback(),
                value.getColor(),
                value.getState(),
                value.getGmtCreate(),
                value.getGmtUpdate());
    }

    /** Public component without internal matching selectors. */
    public record Component(Long id,
                         Long orgId,
                         String name,
                         String description,
                         byte method,
                         byte configState,
                         byte state,
                         LocalDateTime gmtCreate,
                         LocalDateTime gmtUpdate) {
    }

    public static Component component(StatusPageComponentInfo value) {
        return value == null ? null : new Component(value.getId(),
                value.getOrgId(),
                value.getName(),
                value.getDescription(),
                value.getMethod(),
                value.getConfigState(),
                value.getState(),
                value.getGmtCreate(),
                value.getGmtUpdate());
    }

    /** Public component availability sample. */
    public record History(Long id,
                         Long componentId,
                         byte state,
                         Long timestamp,
                         Double uptime,
                         Integer abnormal,
                         Integer unknowing,
                         Integer normal,
                         LocalDateTime gmtCreate,
                         LocalDateTime gmtUpdate) {
    }

    public static History history(StatusPageHistoryInfo value) {
        return value == null ? null : new History(value.getId(),
                value.getComponentId(),
                value.getState(),
                value.getTimestamp(),
                value.getUptime(),
                value.getAbnormal(),
                value.getUnknowing(),
                value.getNormal(),
                value.getGmtCreate(),
                value.getGmtUpdate());
    }

    /** Public incident and its component updates. */
    public record Incident(Long id,
                         Long orgId,
                         String name,
                         byte state,
                         Long startTime,
                         Long endTime,
                         LocalDateTime gmtCreate,
                         LocalDateTime gmtUpdate,
                         List<Component> components,
                         List<IncidentContent> contents) {
    }

    public static Incident incident(StatusPageIncidentInfo value) {
        return value == null ? null : new Incident(value.getId(),
                value.getOrgId(),
                value.getName(),
                value.getState(),
                value.getStartTime(),
                value.getEndTime(),
                value.getGmtCreate(),
                value.getGmtUpdate(),
                map(value.getComponents(), StatusPagePublicResponse::component),
                map(value.getContents(), StatusPagePublicResponse::incidentContent));
    }

    /** Public incident update. */
    public record IncidentContent(Long id,
                         Long incidentId,
                         String message,
                         byte state,
                         Long timestamp,
                         LocalDateTime gmtCreate,
                         LocalDateTime gmtUpdate) {
    }

    public static IncidentContent incidentContent(StatusPageIncidentContentInfo value) {
        return value == null ? null : new IncidentContent(value.getId(),
                value.getIncidentId(),
                value.getMessage(),
                value.getState(),
                value.getTimestamp(),
                value.getGmtCreate(),
                value.getGmtUpdate());
    }

    private static <T, R> List<R> map(List<T> values, Function<T, R> mapper) {
        return values == null ? null : values.stream().map(mapper).toList();
    }
}
