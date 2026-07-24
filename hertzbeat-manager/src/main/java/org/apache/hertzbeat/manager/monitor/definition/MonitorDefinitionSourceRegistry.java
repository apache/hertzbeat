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

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.entity.job.Job;

/** Atomically published provenance and raw-content snapshot for monitor definitions. */
public final class MonitorDefinitionSourceRegistry {

    private final Object lock = new Object();
    private final Map<String, StoredMonitorDefinition> builtin = new HashMap<>();
    private final Map<String, StoredMonitorDefinition> active = new HashMap<>();
    private volatile Snapshot snapshot = Snapshot.empty();
    private boolean rebuilding;

    public void rebuild(Runnable loader) {
        synchronized (lock) {
            Map<String, StoredMonitorDefinition> previousBuiltin = Map.copyOf(builtin);
            Map<String, StoredMonitorDefinition> previousActive = Map.copyOf(active);
            builtin.clear();
            active.clear();
            rebuilding = true;
            try {
                loader.run();
                publish();
            } catch (RuntimeException | Error error) {
                builtin.clear();
                active.clear();
                builtin.putAll(previousBuiltin);
                active.putAll(previousActive);
                throw error;
            } finally {
                rebuilding = false;
            }
        }
    }

    public void registerBuiltin(Job job, String definition) {
        synchronized (lock) {
            builtin.put(identity(job), stored(job, definition));
            publishOutsideRebuild();
        }
    }

    public void registerActive(Job job, String definition) {
        synchronized (lock) {
            active.put(identity(job), stored(job, definition));
            publishOutsideRebuild();
        }
    }

    public MonitorDefinitionSource removeActive(String app) {
        synchronized (lock) {
            String identity = app.toLowerCase(Locale.ROOT);
            active.remove(identity);
            publishOutsideRebuild();
            return snapshot.builtin().containsKey(identity) ? source(snapshot, identity) : null;
        }
    }

    public List<MonitorDefinitionSource> readAll() {
        Snapshot current = snapshot;
        Set<String> identities = new HashSet<>(current.builtin().keySet());
        identities.addAll(current.active().keySet());
        return identities.stream().map(identity -> source(current, identity)).toList();
    }

    private void publishOutsideRebuild() {
        if (!rebuilding) {
            publish();
        }
    }

    private void publish() {
        snapshot = new Snapshot(Map.copyOf(builtin), Map.copyOf(active));
    }

    private static MonitorDefinitionSource source(Snapshot snapshot, String identity) {
        StoredMonitorDefinition builtinDefinition = snapshot.builtin().get(identity);
        StoredMonitorDefinition activeDefinition = snapshot.active().get(identity);
        StoredMonitorDefinition effective = activeDefinition == null ? builtinDefinition : activeDefinition;
        return new MonitorDefinitionSource(
                effective.job().clone(),
                effective.definition(),
                builtinDefinition != null,
                activeDefinition != null);
    }

    private static String identity(Job job) {
        return job.getApp().toLowerCase(Locale.ROOT);
    }

    private static StoredMonitorDefinition stored(Job job, String definition) {
        return new StoredMonitorDefinition(job.clone(), definition);
    }

    private record StoredMonitorDefinition(Job job, String definition) {
    }

    private record Snapshot(
            Map<String, StoredMonitorDefinition> builtin,
            Map<String, StoredMonitorDefinition> active) {

        private static Snapshot empty() {
            return new Snapshot(Map.of(), Map.of());
        }
    }
}
