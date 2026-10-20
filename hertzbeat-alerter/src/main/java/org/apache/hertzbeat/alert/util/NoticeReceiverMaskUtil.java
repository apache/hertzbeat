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
     * Restore unchanged masked secrets only after validating all masks and bindings.
     * Edits and test messages share this entry point so a saved edit cannot rebind a
     * hidden credential. Validation does not modify either receiver on failure.
     * @param incoming receiver submitted by the ui, modified only after validation
     * @param existing receiver currently stored in the database
     * @throws IllegalArgumentException if a mask is invalid or a changed destination
     *                                  needs an explicitly re-entered secret
     */
    public static void resolveMask(NoticeReceiver incoming, NoticeReceiver existing) {
        if (incoming == null || existing == null) {
            return;
        }
        for (SecretField field : SECRET_FIELDS) {
            String submitted = field.getter().apply(incoming);
            if (isMaskValue(submitted) && !isMaskOf(submitted, field.getter().apply(existing))) {
                throw new IllegalArgumentException(
                        "The submitted secret mask does not match the stored secret.");
            }
        }
        validateStoredSecretDestinations(incoming, existing);
        for (SecretField field : SECRET_FIELDS) {
            String stored = field.getter().apply(existing);
            if (isMaskOf(field.getter().apply(incoming), stored)) {
                field.setter().accept(incoming, stored);
            }
        }
    }

    /**
     * Apply the same stored-credential policy to tests and saved receiver edits.
     * @param incoming receiver submitted for a test message
     * @param existing receiver currently stored in the database
     */
    public static void resolveMaskForTest(NoticeReceiver incoming, NoticeReceiver existing) {
        resolveMask(incoming, existing);
    }

    private static void validateStoredSecretDestinations(NoticeReceiver incoming, NoticeReceiver existing) {
        boolean sameType = Objects.equals(incoming.getType(), existing.getType());
        boolean containsStoredSecretMask = SECRET_FIELDS.stream()
                .anyMatch(field -> isMaskOf(field.getter().apply(incoming), field.getter().apply(existing)));
        if (containsStoredSecretMask && !sameType) {
            throw new IllegalArgumentException(
                    "The notification type cannot be changed when reusing a masked secret. Re-enter the secret.");
        }
        boolean webhook = sameType && Objects.equals(existing.getType(), (byte) 2);
        boolean telegram = sameType && Objects.equals(existing.getType(), (byte) 7);
        boolean discord = sameType && Objects.equals(existing.getType(), (byte) 9);
        boolean ntfy = sameType && Objects.equals(existing.getType(), (byte) 15);
        requireReenteredSecretForChangedDestination(
                incoming.getHookAuthToken(), existing.getHookAuthToken(),
                incoming.getHookUrl(), existing.getHookUrl(), webhook, "webhook URL");
        // Disabling authentication alone may deliberately remove a credential. Changing
        // Basic/Bearer interpretation must not silently reuse the previous credential.
        boolean webhookAuthenticationRequired = webhook
                && ("Basic".equalsIgnoreCase(incoming.getHookAuthType())
                    || "Bearer".equalsIgnoreCase(incoming.getHookAuthType()));
        requireReenteredSecretForChangedDestination(
                incoming.getHookAuthToken(), existing.getHookAuthToken(),
                StringUtils.defaultIfBlank(incoming.getHookAuthType(), "None"),
                StringUtils.defaultIfBlank(existing.getHookAuthType(), "None"),
                webhookAuthenticationRequired, "webhook authentication type");
        requireReenteredSecretForChangedDestination(
                incoming.getNtfyToken(), existing.getNtfyToken(),
                emptyToNull(incoming.getNtfyServerUrl()), emptyToNull(existing.getNtfyServerUrl()), ntfy, "ntfy server URL");
        requireReenteredSecretForChangedDestination(
                incoming.getNtfyToken(), existing.getNtfyToken(),
                incoming.getNtfyTopic(), existing.getNtfyTopic(), ntfy, "ntfy topic");
        requireReenteredSecretForChangedDestination(
                incoming.getTgBotToken(), existing.getTgBotToken(),
                incoming.getTgUserId(), existing.getTgUserId(), telegram, "Telegram chat");
        requireReenteredSecretForChangedDestination(
                incoming.getTgBotToken(), existing.getTgBotToken(),
                emptyToNull(incoming.getTgMessageThreadId()), emptyToNull(existing.getTgMessageThreadId()),
                telegram, "Telegram message thread");
        requireReenteredSecretForChangedDestination(
                incoming.getDiscordBotToken(), existing.getDiscordBotToken(),
                incoming.getDiscordChannelId(), existing.getDiscordChannelId(), discord, "Discord channel");
    }

    private static void requireReenteredSecretForChangedDestination(
            String submittedSecret,
            String storedSecret,
            String submittedDestination,
            String storedDestination,
            boolean activeCredential,
            String destinationName) {
        if (!Objects.equals(submittedDestination, storedDestination)
                && (isMaskOf(submittedSecret, storedSecret)
                    || (activeCredential && StringUtils.isNotBlank(storedSecret) && StringUtils.isBlank(submittedSecret)))) {
            throw new IllegalArgumentException(
                    "The " + destinationName + " changed. Re-enter the secret before saving or testing this receiver.");
        }
    }

    private static String emptyToNull(String value) {
        // Optional form fields may round-trip as either null or an empty string.
        // Do not normalize nonempty URLs/IDs or resolve their network addresses.
        return value == null || value.isEmpty() ? null : value;
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
