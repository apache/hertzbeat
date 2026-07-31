/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.service.importtask;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.config.ManagerSseManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Canonical state for monitor imports.
 *
 * <p>Completed history is intentionally process-local and globally bounded. Active tasks are retained until they
 * become terminal. State survives an SSE disconnect but not a manager restart, and does not claim durable or
 * exactly-once task delivery.</p>
 */
@Service
public class ImportTaskService {

    static final int DEFAULT_HISTORY_LIMIT = 20;
    static final int MAX_HISTORY_LIMIT = 100;
    private static final int SCHEMA_VERSION = 1;
    private static final String TASK_TYPE = "MONITOR_IMPORT";

    private final ManagerSseManager managerSseManager;
    private final Clock clock;
    private final int capacity;
    private final Map<String, ImportTaskState> tasks = new LinkedHashMap<>();

    @Autowired
    public ImportTaskService(ManagerSseManager managerSseManager) {
        this(managerSseManager, Clock.systemUTC(), MAX_HISTORY_LIMIT);
    }

    ImportTaskService(ManagerSseManager managerSseManager, Clock clock, int capacity) {
        this.managerSseManager = managerSseManager;
        this.clock = clock;
        this.capacity = capacity;
    }

    public synchronized ImportTaskView create(String workspaceId) {
        Instant now = clock.instant();
        ImportTaskState state = new ImportTaskState(
                UUID.randomUUID().toString(), normalizeWorkspace(workspaceId), ImportTaskStatus.IN_PROGRESS,
                0, now, now, null, null);
        tasks.put(state.taskId(), state);
        notifyChanged(state.taskId());
        return view(state);
    }

    public synchronized ImportTaskView updateProgress(String taskId, int progress) {
        ImportTaskState current = required(taskId);
        if (current.status() != ImportTaskStatus.IN_PROGRESS) {
            return view(current);
        }
        ImportTaskState updated = current.withProgress(Math.max(0, Math.min(progress, 99)));
        return replaceAndNotify(updated);
    }

    public synchronized ImportTaskView complete(String taskId) {
        ImportTaskState current = required(taskId);
        if (current.status() != ImportTaskStatus.IN_PROGRESS) {
            return view(current);
        }
        return replaceAndNotify(current.completed(clock.instant()));
    }

    public synchronized ImportTaskView fail(String taskId, ImportTaskErrorCode errorCode) {
        ImportTaskState current = required(taskId);
        if (current.status() != ImportTaskStatus.IN_PROGRESS) {
            return view(current);
        }
        return replaceAndNotify(current.failed(clock.instant(), errorCode));
    }

    public synchronized Optional<ImportTaskView> find(String taskId, String workspaceId) {
        ImportTaskState state = tasks.get(taskId);
        if (state == null || !state.workspaceId().equals(normalizeWorkspace(workspaceId))) {
            return Optional.empty();
        }
        return Optional.of(view(state));
    }

    public synchronized List<ImportTaskView> list(String workspaceId, int requestedLimit) {
        String workspace = normalizeWorkspace(workspaceId);
        int limit = Math.max(1, Math.min(requestedLimit, MAX_HISTORY_LIMIT));
        List<ImportTaskState> matching = new ArrayList<>();
        for (ImportTaskState state : tasks.values()) {
            if (state.workspaceId().equals(workspace)) {
                matching.add(state);
            }
        }
        int from = Math.max(0, matching.size() - limit);
        List<ImportTaskView> result = new ArrayList<>();
        for (int index = matching.size() - 1; index >= from; index--) {
            result.add(view(matching.get(index)));
        }
        return List.copyOf(result);
    }

    private ImportTaskView replaceAndNotify(ImportTaskState state) {
        tasks.put(state.taskId(), state);
        trimTerminalHistory();
        notifyChanged(state.taskId());
        return view(state);
    }

    private void trimTerminalHistory() {
        int terminalCount = (int) tasks.values().stream()
                .filter(state -> state.status() != ImportTaskStatus.IN_PROGRESS)
                .count();
        var iterator = tasks.entrySet().iterator();
        while (terminalCount > capacity && iterator.hasNext()) {
            if (iterator.next().getValue().status() != ImportTaskStatus.IN_PROGRESS) {
                iterator.remove();
                terminalCount--;
            }
        }
    }

    private ImportTaskState required(String taskId) {
        ImportTaskState state = tasks.get(taskId);
        if (state == null) {
            throw new IllegalArgumentException("Unknown import task");
        }
        return state;
    }

    private void notifyChanged(String taskId) {
        if (managerSseManager != null) {
            managerSseManager.broadcastImportTaskChanged(taskId);
        }
    }

    private static String normalizeWorkspace(String workspaceId) {
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }

    private static ImportTaskView view(ImportTaskState state) {
        return new ImportTaskView(SCHEMA_VERSION, state.taskId(), TASK_TYPE, state.status(), state.progress(),
                state.createdAt(), state.startedAt(), state.completedAt(), state.errorCode());
    }

    private record ImportTaskState(
            String taskId,
            String workspaceId,
            ImportTaskStatus status,
            int progress,
            Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            ImportTaskErrorCode errorCode) {

        private ImportTaskState withProgress(int newProgress) {
            return new ImportTaskState(taskId, workspaceId, status, newProgress, createdAt, startedAt, completedAt,
                    errorCode);
        }

        private ImportTaskState completed(Instant time) {
            return new ImportTaskState(taskId, workspaceId, ImportTaskStatus.COMPLETED, 100, createdAt, startedAt,
                    time, null);
        }

        private ImportTaskState failed(Instant time, ImportTaskErrorCode code) {
            return new ImportTaskState(taskId, workspaceId, ImportTaskStatus.FAILED, progress, createdAt, startedAt,
                    time, code == null ? ImportTaskErrorCode.IMPORT_FAILED : code);
        }
    }
}
