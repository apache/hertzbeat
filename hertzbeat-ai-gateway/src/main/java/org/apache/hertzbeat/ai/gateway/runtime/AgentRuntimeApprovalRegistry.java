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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalConsumption;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Active approval waiters for currently running runtime loops.
 */
@Service
public class AgentRuntimeApprovalRegistry {

    private final ConcurrentMap<String, ApprovalWaiter> approvals = new ConcurrentHashMap<>();

    public CompletableFuture<AgentApprovalDecision> register(String approvalId) {
        // Approval IDs are persisted ledger identities and must be complete before a runtime waiter is registered.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        ApprovalWaiter waiter = new ApprovalWaiter(approvalId);
        ApprovalWaiter existing = approvals.putIfAbsent(approvalId, waiter);
        if (existing != null) {
            throw new IllegalStateException("Approval is already waiting: " + approvalId);
        }
        return waiter.future;
    }

    public boolean complete(String approvalId, AgentApprovalDecision decision) {
        // Command normalization supplies both values; a null completion would corrupt the waiting lifecycle.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        Objects.requireNonNull(decision, "Approval decision is required");
        return reserve(approvalId).map(reservation -> reservation.deliver(decision).accepted()).orElse(false);
    }

    /**
     * Atomically reserves one active waiter while its durable decision is committed.
     */
    public Optional<ApprovalReservation> reserve(String approvalId) {
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        ApprovalWaiter waiter = approvals.get(approvalId);
        return waiter == null ? Optional.empty() : waiter.reserve();
    }

    public Optional<AgentApprovalConsumption.Claim> beginConsumption(
            String approvalId, AgentApprovalDecision decision) {
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        Objects.requireNonNull(decision, "Approval decision is required");
        ApprovalWaiter waiter = approvals.get(approvalId);
        return waiter == null ? Optional.empty() : waiter.beginConsumption(decision);
    }

    public boolean isWaiting(String approvalId) {
        // Approval lookups use normalized command identities; blank values indicate a caller contract violation.
        if (!StringUtils.hasText(approvalId)) {
            throw new IllegalArgumentException("Approval id is required");
        }
        return approvals.containsKey(approvalId);
    }

    protected CompletableFuture<Boolean> newConsumptionFuture() {
        return new CompletableFuture<>();
    }

    /**
     * One-use claim that prevents runtime cancellation from racing a durable decision.
     */
    public final class ApprovalReservation {

        private final ApprovalWaiter waiter;

        private ApprovalReservation(ApprovalWaiter waiter) {
            this.waiter = waiter;
        }

        public ApprovalDelivery deliver(AgentApprovalDecision decision) {
            return waiter.deliver(this, Objects.requireNonNull(decision, "Approval decision is required"));
        }

        public void release() {
            waiter.release(this);
        }
    }

    /** Delivery remains provisional until the runtime enters its durable resume boundary. */
    public final class ApprovalDelivery {

        private final ApprovalWaiter waiter;
        private final CompletableFuture<Boolean> consumed = newConsumptionFuture();
        private final boolean accepted;

        private ApprovalDelivery(ApprovalWaiter waiter, boolean accepted) {
            this.waiter = waiter;
            this.accepted = accepted;
            if (!accepted) {
                consumed.complete(false);
            }
        }

        public boolean accepted() {
            return accepted;
        }

        public boolean awaitConsumption(Duration timeout) {
            Objects.requireNonNull(timeout, "Approval consumption timeout is required");
            if (timeout.isZero() || timeout.isNegative()) {
                throw new IllegalArgumentException("Approval consumption timeout must be positive");
            }
            try {
                return consumed.get(Math.max(1L, timeout.toMillis()), TimeUnit.MILLISECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return waiter.abandon(this);
            } catch (ExecutionException exception) {
                waiter.abandon(this);
                return false;
            } catch (TimeoutException exception) {
                return waiter.abandon(this);
            }
        }

        private void complete(boolean value) {
            consumed.complete(value);
        }
    }

    private final class ApprovalWaiter {

        private final String approvalId;
        private final ApprovalFuture future;
        private ApprovalReservation reservation;
        private ApprovalDelivery delivery;
        private ApprovalConsumptionReservation consumption;
        private AgentApprovalDecision deliveredDecision;
        private boolean cancelRequested;

        private ApprovalWaiter(String approvalId) {
            this.approvalId = approvalId;
            this.future = new ApprovalFuture(this);
        }

        private synchronized Optional<ApprovalReservation> reserve() {
            if (reservation != null || future.isDone() || approvals.get(approvalId) != this) {
                return Optional.empty();
            }
            reservation = new ApprovalReservation(this);
            return Optional.of(reservation);
        }

        private synchronized ApprovalDelivery deliver(ApprovalReservation claim, AgentApprovalDecision decision) {
            if (reservation != claim || delivery != null || future.isDone()
                    || approvals.get(approvalId) != this) {
                return new ApprovalDelivery(this, false);
            }
            reservation = null;
            if (cancelRequested) {
                cancelAndRemove();
                return new ApprovalDelivery(this, false);
            }
            delivery = new ApprovalDelivery(this, true);
            deliveredDecision = decision;
            if (!future.completeDirect(decision)) {
                delivery.complete(false);
                approvals.remove(approvalId, this);
                return new ApprovalDelivery(this, false);
            }
            return delivery;
        }

        private synchronized void release(ApprovalReservation claim) {
            if (reservation == claim && !future.isDone()) {
                reservation = null;
                if (cancelRequested) {
                    cancelAndRemove();
                }
            }
        }

        private synchronized boolean cancel(boolean mayInterruptIfRunning) {
            if (reservation != null) {
                cancelRequested = true;
                return false;
            }
            if (consumption != null) {
                cancelRequested = true;
                return false;
            }
            if (delivery != null) {
                cancelRequested = true;
                delivery.complete(false);
                approvals.remove(approvalId, this);
                return false;
            }
            if (future.isDone()) {
                return false;
            }
            boolean cancelled = future.cancelDirect(mayInterruptIfRunning);
            approvals.remove(approvalId, this);
            return cancelled;
        }

        private synchronized boolean complete(AgentApprovalDecision decision) {
            if (reservation != null || delivery != null || future.isDone()) {
                return false;
            }
            ApprovalReservation direct = new ApprovalReservation(this);
            reservation = direct;
            return deliver(direct, decision).accepted();
        }

        private synchronized Optional<AgentApprovalConsumption.Claim> beginConsumption(
                AgentApprovalDecision decision) {
            if (delivery == null || consumption != null || cancelRequested
                    || deliveredDecision != decision || approvals.get(approvalId) != this) {
                if (delivery != null && cancelRequested) {
                    delivery.complete(false);
                    approvals.remove(approvalId, this);
                }
                return Optional.empty();
            }
            consumption = new ApprovalConsumptionReservation(this);
            return Optional.of(consumption);
        }

        private synchronized boolean completeConsumption(ApprovalConsumptionReservation claim) {
            if (consumption != claim || delivery == null) {
                return false;
            }
            if (cancelRequested) {
                return false;
            }
            consumption = null;
            delivery.complete(true);
            approvals.remove(approvalId, this);
            return true;
        }

        private synchronized void releaseConsumption(ApprovalConsumptionReservation claim) {
            if (consumption != claim || delivery == null) {
                return;
            }
            consumption = null;
            delivery.complete(false);
            approvals.remove(approvalId, this);
        }

        private synchronized boolean abandon(ApprovalDelivery abandoned) {
            if (delivery != abandoned) {
                return abandoned.consumed.getNow(false);
            }
            if (delivery.consumed.isDone()) {
                return delivery.consumed.getNow(false);
            }
            cancelRequested = true;
            if (consumption == null) {
                delivery.complete(false);
                approvals.remove(approvalId, this);
            }
            return false;
        }

        private void cancelAndRemove() {
            future.cancelDirect(false);
            if (delivery != null) {
                delivery.complete(false);
            }
            approvals.remove(approvalId, this);
        }
    }

    private final class ApprovalConsumptionReservation implements AgentApprovalConsumption.Claim {

        private final ApprovalWaiter waiter;

        private ApprovalConsumptionReservation(ApprovalWaiter waiter) {
            this.waiter = waiter;
        }

        @Override
        public boolean complete() {
            return waiter.completeConsumption(this);
        }

        @Override
        public void release() {
            waiter.releaseConsumption(this);
        }
    }

    private final class ApprovalFuture extends CompletableFuture<AgentApprovalDecision> {

        private final ApprovalWaiter waiter;

        private ApprovalFuture(ApprovalWaiter waiter) {
            this.waiter = waiter;
        }

        @Override
        public boolean cancel(boolean mayInterruptIfRunning) {
            return waiter.cancel(mayInterruptIfRunning);
        }

        @Override
        public boolean complete(AgentApprovalDecision value) {
            return waiter.complete(Objects.requireNonNull(value, "Approval decision is required"));
        }

        private boolean cancelDirect(boolean mayInterruptIfRunning) {
            return super.cancel(mayInterruptIfRunning);
        }

        private boolean completeDirect(AgentApprovalDecision value) {
            return super.complete(value);
        }
    }
}
