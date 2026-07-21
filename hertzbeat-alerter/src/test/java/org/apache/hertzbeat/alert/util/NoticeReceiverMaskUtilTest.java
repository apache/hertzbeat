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

import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.junit.jupiter.api.Test;

import static org.apache.hertzbeat.alert.util.NoticeReceiverMaskUtil.SECRET_MASK;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Test case for {@link NoticeReceiverMaskUtil}
 */
class NoticeReceiverMaskUtilTest {

    private NoticeReceiver buildReceiverWithSecrets() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("tom");
        receiver.setEmail("tom@usthe.com");
        receiver.setHookUrl("https://example.com/hook");
        receiver.setHookAuthToken("hook-auth-token-abcd");
        receiver.setAccessToken("c03a568a306f8fd84dab51ff03cf6af6ba676a3be940c904e1df2de34853739d");
        receiver.setTgBotToken("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM");
        receiver.setSlackWebHookUrl("https://hooks.slack.com/services/X/Y/Zt0k3n");
        receiver.setAppSecret("oUydwn92ey0lnuY02MixNa57eNK-20dJn5NEOG-u2uE");
        receiver.setDiscordBotToken("MTA2NTMwMzU0ODY4Mzg4MjUzNw.discord.t0kn");
        receiver.setSmnAk("NCVBODJOEYHSW3VNSMAK");
        receiver.setSmnSk("nmSNhUJN9MlpPl8lfCsgdA0KvHCL9JSMSK");
        receiver.setServerChanToken("SCT193569TSNm6xIabdjqeZPtOGOWcvU1e");
        receiver.setGotifyToken("A845h__ZMqDxZlO");
        receiver.setNtfyToken("tk_AgQdq7mVBoFD37zQVN29RhuMzNIz2");
        return receiver;
    }

    @Test
    void maskKeepsSuffixOfLongSecrets() {
        NoticeReceiver receiver = buildReceiverWithSecrets();
        NoticeReceiver masked = NoticeReceiverMaskUtil.mask(receiver);

        assertEquals(SECRET_MASK + "abcd", masked.getHookAuthToken());
        assertEquals(SECRET_MASK + "739d", masked.getAccessToken());
        assertEquals(SECRET_MASK + "voJM", masked.getTgBotToken());
        assertEquals(SECRET_MASK + "0k3n", masked.getSlackWebHookUrl());
        assertEquals(SECRET_MASK + "u2uE", masked.getAppSecret());
        assertEquals(SECRET_MASK + "t0kn", masked.getDiscordBotToken());
        assertEquals(SECRET_MASK + "SMAK", masked.getSmnAk());
        assertEquals(SECRET_MASK + "SMSK", masked.getSmnSk());
        assertEquals(SECRET_MASK + "vU1e", masked.getServerChanToken());
        assertEquals(SECRET_MASK + "xZlO", masked.getGotifyToken());
        assertEquals(SECRET_MASK + "NIz2", masked.getNtfyToken());

        assertEquals(receiver.getId(), masked.getId());
        assertEquals(receiver.getName(), masked.getName());
        assertEquals(receiver.getEmail(), masked.getEmail());
        assertEquals(receiver.getHookUrl(), masked.getHookUrl());
    }

    @Test
    void maskHidesShortSecretsEntirely() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setAccessToken("short-token");
        receiver.setGotifyToken("tiny");
        NoticeReceiver masked = NoticeReceiverMaskUtil.mask(receiver);

        assertEquals(SECRET_MASK, masked.getAccessToken());
        assertEquals(SECRET_MASK, masked.getGotifyToken());
    }

    @Test
    void maskDoesNotModifyOriginalAndKeepsEmptySecrets() {
        NoticeReceiver receiver = buildReceiverWithSecrets();
        NoticeReceiverMaskUtil.mask(receiver);

        assertEquals("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM", receiver.getTgBotToken());
        assertEquals("nmSNhUJN9MlpPl8lfCsgdA0KvHCL9JSMSK", receiver.getSmnSk());

        NoticeReceiver empty = new NoticeReceiver();
        NoticeReceiver maskedEmpty = NoticeReceiverMaskUtil.mask(empty);
        assertNull(maskedEmpty.getAccessToken());
        assertNull(maskedEmpty.getNtfyToken());
        assertNull(NoticeReceiverMaskUtil.mask(null));
    }

    @Test
    void resolveMaskRestoresOnlyMaskedFields() {
        NoticeReceiver existing = buildReceiverWithSecrets();
        NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(existing);
        incoming.setAccessToken("new-access-token-1234");
        incoming.setGotifyToken(null);
        incoming.setNtfyToken(SECRET_MASK);

        NoticeReceiverMaskUtil.resolveMask(incoming, existing);

        assertEquals("new-access-token-1234", incoming.getAccessToken());
        assertNull(incoming.getGotifyToken());
        assertEquals("tk_AgQdq7mVBoFD37zQVN29RhuMzNIz2", incoming.getNtfyToken());
        assertEquals("hook-auth-token-abcd", incoming.getHookAuthToken());
        assertEquals("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM", incoming.getTgBotToken());
        assertEquals("https://hooks.slack.com/services/X/Y/Zt0k3n", incoming.getSlackWebHookUrl());
        assertEquals("oUydwn92ey0lnuY02MixNa57eNK-20dJn5NEOG-u2uE", incoming.getAppSecret());
        assertEquals("MTA2NTMwMzU0ODY4Mzg4MjUzNw.discord.t0kn", incoming.getDiscordBotToken());
        assertEquals("NCVBODJOEYHSW3VNSMAK", incoming.getSmnAk());
        assertEquals("nmSNhUJN9MlpPl8lfCsgdA0KvHCL9JSMSK", incoming.getSmnSk());
        assertEquals("SCT193569TSNm6xIabdjqeZPtOGOWcvU1e", incoming.getServerChanToken());
    }

    @Test
    void resolveMaskIgnoresMaskWhenNothingIsStored() {
        NoticeReceiver existing = new NoticeReceiver();
        NoticeReceiver incoming = new NoticeReceiver();
        incoming.setAccessToken(SECRET_MASK);

        NoticeReceiverMaskUtil.resolveMask(incoming, existing);

        assertEquals(SECRET_MASK, incoming.getAccessToken());
    }
}
