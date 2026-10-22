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

package org.apache.hertzbeat.alert.util;

import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** No sender, database or network is created by these binding checks. */
class NoticeReceiverBindingTest {
    private static final String SYNTHETIC_SECRET = "SYNTHETIC_ORIGINAL_SECRET";

    private record Binding(byte type, BiConsumer<NoticeReceiver, String> setSecret,
                           Function<NoticeReceiver, String> getSecret,
                           Consumer<NoticeReceiver> originalDestination,
                           Consumer<NoticeReceiver> changedDestination) {
    }

    private static List<Binding> bindings() {
        return List.of(
                new Binding((byte) 2, NoticeReceiver::setHookAuthToken, NoticeReceiver::getHookAuthToken,
                        r -> r.setHookUrl("https://original.example/hook"), r -> r.setHookUrl("https://changed.example/hook")),
                new Binding((byte) 2, NoticeReceiver::setHookAuthToken, NoticeReceiver::getHookAuthToken,
                        r -> r.setHookAuthType("Bearer"), r -> r.setHookAuthType("Basic")),
                new Binding((byte) 7, NoticeReceiver::setTgBotToken, NoticeReceiver::getTgBotToken,
                        r -> r.setTgUserId("original-chat"), r -> r.setTgUserId("changed-chat")),
                new Binding((byte) 7, NoticeReceiver::setTgBotToken, NoticeReceiver::getTgBotToken,
                        r -> r.setTgMessageThreadId("original-thread"), r -> r.setTgMessageThreadId("changed-thread")),
                new Binding((byte) 9, NoticeReceiver::setDiscordBotToken, NoticeReceiver::getDiscordBotToken,
                        r -> r.setDiscordChannelId("original-channel"), r -> r.setDiscordChannelId("changed-channel")),
                new Binding((byte) 15, NoticeReceiver::setNtfyToken, NoticeReceiver::getNtfyToken,
                        r -> r.setNtfyServerUrl("https://original.example"), r -> r.setNtfyServerUrl("https://changed.example")),
                new Binding((byte) 15, NoticeReceiver::setNtfyToken, NoticeReceiver::getNtfyToken,
                        r -> r.setNtfyTopic("original-topic"), r -> r.setNtfyTopic("changed-topic")));
    }

    private static List<BiConsumer<NoticeReceiver, NoticeReceiver>> resolvers() {
        return List.of(NoticeReceiverMaskUtil::resolveMask, NoticeReceiverMaskUtil::resolveMaskForTest);
    }

    private static NoticeReceiver existing(Binding binding) {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setType(binding.type());
        binding.setSecret().accept(receiver, SYNTHETIC_SECRET);
        binding.originalDestination().accept(receiver);
        return receiver;
    }

    @Test
    void changedDestinationRejectsMaskedOrMissingCredentialsBeforeMutation() {
        for (Binding binding : bindings()) {
            for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
                NoticeReceiver stored = existing(binding);
                String mask = binding.getSecret().apply(NoticeReceiverMaskUtil.mask(stored));
                for (String submitted : new String[] {mask, null, "", " "}) {
                    NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
                    binding.changedDestination().accept(incoming);
                    binding.setSecret().accept(incoming, submitted);
                    assertThrows(IllegalArgumentException.class, () -> resolver.accept(incoming, stored));
                    assertEquals(submitted, binding.getSecret().apply(incoming));
                    assertEquals(SYNTHETIC_SECRET, binding.getSecret().apply(stored));
                }
            }
        }
    }

    @Test
    void changedDestinationAcceptsExplicitReentryAndUnchangedDestinationKeepsMask() {
        for (Binding binding : bindings()) {
            for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
                NoticeReceiver stored = existing(binding);
                for (String entered : new String[] {SYNTHETIC_SECRET, "SYNTHETIC_REPLACEMENT"}) {
                    NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
                    binding.changedDestination().accept(incoming);
                    binding.setSecret().accept(incoming, entered);
                    resolver.accept(incoming, stored);
                    assertEquals(entered, binding.getSecret().apply(incoming));
                }
                NoticeReceiver renamed = NoticeReceiverMaskUtil.mask(stored);
                renamed.setName("renamed receiver");
                resolver.accept(renamed, stored);
                assertEquals(SYNTHETIC_SECRET, binding.getSecret().apply(renamed));
                assertEquals("renamed receiver", renamed.getName());
            }
        }
    }

    @Test
    void typeChangesNeverAutomaticallyReuseMaskedSecrets() {
        for (Binding binding : bindings()) {
            for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
                NoticeReceiver stored = existing(binding);
                NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
                incoming.setType((byte) 1);
                assertThrows(IllegalArgumentException.class, () -> resolver.accept(incoming, stored));
                binding.setSecret().accept(incoming, null);
                resolver.accept(incoming, stored);
                assertNull(binding.getSecret().apply(incoming));
            }
        }
    }

    @Test
    void invalidLaterMaskDoesNotRestoreEarlierSecret() {
        NoticeReceiver stored = new NoticeReceiver();
        stored.setType((byte) 2);
        stored.setHookAuthToken(SYNTHETIC_SECRET);
        stored.setNtfyToken("SYNTHETIC_OTHER_SECRET");
        for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
            NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
            String originalMask = incoming.getHookAuthToken();
            incoming.setNtfyToken("******FAKE");
            assertThrows(IllegalArgumentException.class, () -> resolver.accept(incoming, stored));
            assertEquals(originalMask, incoming.getHookAuthToken());
            assertEquals(SYNTHETIC_SECRET, stored.getHookAuthToken());
        }
    }

    @Test
    void optionalCredentialsRemainOptionalWhenNoneWerePreviouslyConfigured() {
        for (byte type : new byte[] {2, 15}) {
            NoticeReceiver stored = new NoticeReceiver();
            stored.setType(type);
            for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
                NoticeReceiver incoming = new NoticeReceiver();
                incoming.setType(type);
                incoming.setHookUrl("https://new.example/hook");
                incoming.setNtfyServerUrl("https://new.example");
                incoming.setNtfyTopic("new-topic");
                resolver.accept(incoming, stored);
                assertNull(incoming.getHookAuthToken());
                assertNull(incoming.getNtfyToken());
            }
        }
    }

    @Test
    void disablingWebhookAuthenticationAloneDoesNotRequireSecret() {
        NoticeReceiver stored = new NoticeReceiver();
        stored.setType((byte) 2);
        stored.setHookAuthType("Bearer");
        stored.setHookAuthToken(SYNTHETIC_SECRET);
        stored.setHookUrl("https://original.example/hook");
        for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
            NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
            incoming.setHookAuthType("None");
            incoming.setHookAuthToken(null);
            resolver.accept(incoming, stored);
            assertNull(incoming.getHookAuthToken());
            incoming.setHookUrl("https://changed.example/hook");
            assertThrows(IllegalArgumentException.class, () -> resolver.accept(incoming, stored));
        }
    }

    @Test
    void optionalDestinationFieldsRoundTripWithoutSpuriousChanges() {
        for (BiConsumer<NoticeReceiver, NoticeReceiver> resolver : resolvers()) {
            NoticeReceiver stored = new NoticeReceiver();
            stored.setType((byte) 15);
            stored.setNtfyServerUrl("");
            stored.setNtfyToken(SYNTHETIC_SECRET);
            NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
            incoming.setNtfyServerUrl(null);
            resolver.accept(incoming, stored);
            assertEquals(SYNTHETIC_SECRET, incoming.getNtfyToken());
            stored.setType((byte) 7);
            stored.setTgMessageThreadId("");
            stored.setTgBotToken(SYNTHETIC_SECRET);
            incoming = NoticeReceiverMaskUtil.mask(stored);
            incoming.setTgMessageThreadId(null);
            resolver.accept(incoming, stored);
            assertEquals(SYNTHETIC_SECRET, incoming.getTgBotToken());
        }
    }
}
