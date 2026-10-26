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

package org.apache.hertzbeat.common.support;

import java.util.Optional;

/** Audit attribution only. This context must never be used to authorize a resource operation. */
public final class TrustedAuditActorContext {

    private static final ThreadLocal<Binding> CURRENT = new ThreadLocal<>();

    private TrustedAuditActorContext() {
    }

    public static boolean isBound() {
        return CURRENT.get() != null;
    }

    public static Optional<String> currentActor() {
        Binding binding = CURRENT.get();
        return binding == null ? Optional.empty() : Optional.ofNullable(binding.actor());
    }

    /** A null actor explicitly suppresses attribution from an unrelated ambient HTTP subject. */
    public static Scope bind(String actor) {
        Binding previous = CURRENT.get();
        Binding binding = new Binding(actor == null || actor.isBlank() ? null : actor);
        CURRENT.set(binding);
        return new Scope(previous, binding);
    }

    private record Binding(String actor) {
    }

    /** Restores the prior thread binding when closed in nesting order. */
    public static final class Scope implements AutoCloseable {
        private final Binding previous;
        private final Binding binding;
        private final Thread owner = Thread.currentThread();
        private boolean closed;

        private Scope(Binding previous, Binding binding) {
            this.previous = previous;
            this.binding = binding;
        }

        @Override
        public void close() {
            if (closed) {
                return;
            }
            if (Thread.currentThread() != owner || CURRENT.get() != binding) {
                throw new IllegalStateException("Audit actor scopes must close in order on their originating thread");
            }
            closed = true;
            if (previous == null) {
                CURRENT.remove();
            } else {
                CURRENT.set(previous);
            }
        }
    }
}
