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

package org.apache.hertzbeat.manager.setup.security;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.InetAddress;
import java.time.Clock;
import java.util.Arrays;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupAccess;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockResponse;
import org.apache.hertzbeat.manager.setup.workflow.SetupRuntimeState;
import org.springframework.http.ResponseCookie;

/** Security orchestration for remote setup proof redemption and cookie issuance. */
public final class SetupHttpUnlockService implements AutoCloseable {
    private final RemoteSetupUnlock unlock;
    private final InetAddress bindAddress;
    private final SetupRuntimeState state;
    private final Clock clock;
    private final SetupRequestSecurityPolicy requestPolicy;

    public SetupHttpUnlockService(RemoteSetupUnlock unlock, InetAddress bindAddress,
                                  SetupRuntimeState state, Clock clock) throws IOException {
        this.unlock = unlock;
        this.bindAddress = bindAddress;
        this.state = state;
        this.clock = clock;
        this.requestPolicy = new SetupRequestSecurityPolicy();
        if (state.phase() != SetupPhase.COMPLETE && unlock.requiresUnlock(bindAddress)) {
            ensureProof();
        }
    }

    public boolean requiresUnlock() {
        return state.phase() != SetupPhase.COMPLETE && unlock.requiresUnlock(bindAddress);
    }

    public boolean requiresUnlock(HttpServletRequest request) {
        var context = requestPolicy.inspect(request);
        boolean required = state.phase() != SetupPhase.COMPLETE
                && (unlock.requiresUnlock(bindAddress) || context.requiresProofOnLoopback());
        if (required) {
            try {
                ensureProof();
            } catch (IOException failure) {
                throw new IllegalStateException("Setup unlock proof is unavailable", failure);
            }
        }
        return required;
    }

    synchronized void ensureProof() throws IOException {
        if (unlock.ensureOpen() && unlock.requiresUnlock(bindAddress)) {
            state.locked();
        }
    }

    public boolean secureCookie(HttpServletRequest request) {
        return requestPolicy.secureCookie(request);
    }

    public synchronized UnlockExchange redeem(
            UnlockRequest request, HttpServletRequest servletRequest) throws IOException {
        var context = requestPolicy.inspect(servletRequest);
        if (!requiresUnlock(servletRequest)) {
            throw new SetupUnlockRejected(SetupUnlockRejected.Reason.INVALID);
        }
        char[] code = request.code().toCharArray();
        try {
            SetupAccessSession session = unlock.redeem(context.remoteAddress(), new SetupUnlockCode(code));
            if (unlock.requiresUnlock(bindAddress)) {
                state.unlocked();
            }
            return new UnlockExchange(new UnlockResponse(SetupAccess.UNLOCKED, session.expiresAt()),
                    SetupAccessCookie.create(session, context.secureCookie(), clock));
        } finally {
            Arrays.fill(code, '\0');
        }
    }

    public synchronized boolean permits(String token) {
        return !requiresUnlock() || unlock.permits(token);
    }

    public synchronized boolean permits(String token, HttpServletRequest request) {
        return !requiresUnlock(request) || unlock.permits(token);
    }

    @Override
    public void close() throws IOException {
        unlock.close();
    }

    /** Successful response plus the opaque transport cookie; neither renders the token. */
    public record UnlockExchange(UnlockResponse response, ResponseCookie cookie) {
        @Override
        public String toString() {
            return "UnlockExchange[response=unlocked, cookie=redacted]";
        }
    }
}
