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
import java.util.Objects;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;

/**
 * Masks the secret fields of {@link NoticeReceiver} before it is exposed through the rest api,
 * and resolves masked values back to the stored secrets when an edited receiver is submitted.
 * A secret long enough keeps its last characters visible so different tokens stay
 * distinguishable in the ui, while an unchanged secret round-trips through the ui
 * without ever leaving the server.
 */
public final class NoticeReceiverMaskUtil {

    /**
     * Fixed-length placeholder replacing the hidden part of a secret. Its length is
     * constant on purpose so the mask never reveals how long the real secret is.
     */
    public static final String SECRET_MASK = "******";

    /**
     * A secret shorter than this is masked entirely: revealing a suffix of a short
     * secret would give away too large a fraction of it.
     */
    private static final int MIN_LENGTH_TO_SHOW_SUFFIX = 12;

    /**
     * Number of trailing characters kept visible for a long secret,
     * enough to tell configured tokens apart.
     */
    private static final int VISIBLE_SUFFIX_LENGTH = 4;

    private record SecretField(Function<NoticeReceiver, String> getter, BiConsumer<NoticeReceiver, String> setter) {
    }

    private static final List<SecretField> SECRET_FIELDS = List.of(
            new SecretField(NoticeReceiver::getHookAuthToken, NoticeReceiver::setHookAuthToken),
            new SecretField(NoticeReceiver::getAccessToken, NoticeReceiver::setAccessToken),
            new SecretField(NoticeReceiver::getTgBotToken, NoticeReceiver::setTgBotToken),
            new SecretField(NoticeReceiver::getSlackWebHookUrl, NoticeReceiver::setSlackWebHookUrl),
            new SecretField(NoticeReceiver::getAppSecret, NoticeReceiver::setAppSecret),
            new SecretField(NoticeReceiver::getDiscordBotToken, NoticeReceiver::setDiscordBotToken),
            new SecretField(NoticeReceiver::getSmnAk, NoticeReceiver::setSmnAk),
            new SecretField(NoticeReceiver::getSmnSk, NoticeReceiver::setSmnSk),
            new SecretField(NoticeReceiver::getServerChanToken, NoticeReceiver::setServerChanToken),
            new SecretField(NoticeReceiver::getGotifyToken, NoticeReceiver::setGotifyToken),
            new SecretField(NoticeReceiver::getNtfyToken, NoticeReceiver::setNtfyToken));

    private NoticeReceiverMaskUtil() {
    }

    /**
     * Return a copy of the receiver with all secret fields masked.
     * The given entity is not modified as it may still be attached to the persistence context.
     * @param receiver receiver to mask, may be null
     * @return masked copy, or null if receiver is null
     */
    public static NoticeReceiver mask(NoticeReceiver receiver) {
        if (receiver == null) {
            return null;
        }
        NoticeReceiver masked = receiver.toBuilder().build();
        for (SecretField field : SECRET_FIELDS) {
            field.setter().accept(masked, maskValue(field.getter().apply(masked)));
        }
        return masked;
    }

    /**
     * Replace every secret field of the incoming receiver that still holds the masked form
     * of the stored secret with the stored value, so an edit that did not touch a secret keeps it.
     * A re-entered secret or a cleared field is left untouched.
     * @param incoming receiver submitted by the ui, modified in place
     * @param existing receiver currently stored in the database
     * @throws IllegalArgumentException if a submitted mask does not match the stored secret
     */
    public static void resolveMask(NoticeReceiver incoming, NoticeReceiver existing) {
        if (incoming == null || existing == null) {
            return;
        }
        for (SecretField field : SECRET_FIELDS) {
            String submitted = field.getter().apply(incoming);
            String stored = field.getter().apply(existing);
            if (isMaskOf(submitted, stored)) {
                field.setter().accept(incoming, stored);
            } else if (isMaskValue(submitted)) {
                throw new IllegalArgumentException(
                        "The submitted secret mask does not match the stored secret.");
            }
        }
    }

    /**
     * Resolve masked secrets for a test message while binding them to their persisted destination.
     * A caller that changes the notification type or a URL receiving authentication data
     * must submit the new secret explicitly instead of reusing a stored secret mask.
     * @param incoming receiver submitted for a test message, modified in place
     * @param existing receiver currently stored in the database
     * @throws IllegalArgumentException if a masked secret is combined with a changed destination
     */
    public static void resolveMaskForTest(NoticeReceiver incoming, NoticeReceiver existing) {
        if (incoming == null || existing == null) {
            return;
        }

        boolean containsStoredSecretMask = SECRET_FIELDS.stream()
                .anyMatch(field -> isMaskOf(field.getter().apply(incoming), field.getter().apply(existing)));
        if (containsStoredSecretMask && !Objects.equals(incoming.getType(), existing.getType())) {
            throw new IllegalArgumentException(
                    "The notification type cannot be changed when reusing a masked secret.");
        }
        rejectChangedSecretDestination(
                incoming.getHookAuthToken(),
                existing.getHookAuthToken(),
                incoming.getHookUrl(),
                existing.getHookUrl(),
                "webhook URL");
        rejectChangedSecretDestination(
                incoming.getNtfyToken(),
                existing.getNtfyToken(),
                incoming.getNtfyServerUrl(),
                existing.getNtfyServerUrl(),
                "ntfy server URL");
        resolveMask(incoming, existing);
    }

    private static void rejectChangedSecretDestination(
            String submittedSecret,
            String storedSecret,
            String submittedDestination,
            String storedDestination,
            String destinationName) {
        if (isMaskOf(submittedSecret, storedSecret)
                && !Objects.equals(submittedDestination, storedDestination)) {
            throw new IllegalArgumentException(
                    "The " + destinationName + " cannot be changed when reusing a masked secret.");
        }
    }

    private static boolean isMaskOf(String submitted, String stored) {
        if (submitted == null || StringUtils.isBlank(stored)) {
            return false;
        }
        return submitted.equals(maskValue(stored));
    }

    private static boolean isMaskValue(String value) {
        return value != null
                && value.startsWith(SECRET_MASK)
                && (value.length() == SECRET_MASK.length()
                    || value.length() == SECRET_MASK.length() + VISIBLE_SUFFIX_LENGTH);
    }

    private static String maskValue(String value) {
        if (StringUtils.isBlank(value)) {
            return value;
        }
        if (value.length() < MIN_LENGTH_TO_SHOW_SUFFIX) {
            return SECRET_MASK;
        }
        return SECRET_MASK + value.substring(value.length() - VISIBLE_SUFFIX_LENGTH);
    }
}
