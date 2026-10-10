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

package org.apache.hertzbeat.manager.setup.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.Arrays;
import java.util.List;
import org.apache.commons.lang3.StringUtils;

/** Persisted authentication identity. The password hash is deliberately never exposed by a DTO. */
@Entity
@Table(name = "hzb_account", uniqueConstraints = {
        @UniqueConstraint(name = "uk_hzb_account_username", columnNames = "username"),
        @UniqueConstraint(name = "uk_hzb_account_bootstrap", columnNames = "bootstrap_slot")})
public class DatabaseAccount {
    static final int USERNAME_MAX_LENGTH = 64;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = USERNAME_MAX_LENGTH)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 128)
    private String roles;

    @Column(name = "credential_version", nullable = false)
    private long credentialVersion;

    @Column(nullable = false)
    private boolean disabled;

    @Column(name = "bootstrap_slot")
    private Short bootstrapSlot;

    protected DatabaseAccount() {
    }

    DatabaseAccount(String username, String passwordHash, String roles, long credentialVersion,
                    Short bootstrapSlot) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.roles = roles;
        this.credentialVersion = credentialVersion;
        this.bootstrapSlot = bootstrapSlot;
    }

    static DatabaseAccount firstAdministrator(String username, String passwordHash, String roles) {
        return new DatabaseAccount(username, passwordHash, roles, 1, (short) 1);
    }

    static DatabaseAccount ordinary(String username, String passwordHash, String roles) {
        return new DatabaseAccount(username, passwordHash, roles, 1, null);
    }

    public String username() {
        return username;
    }

    String passwordHash() {
        return passwordHash;
    }

    String roles() {
        return roles;
    }

    List<String> roleList() {
        if (StringUtils.isBlank(roles)) {
            return List.of();
        }
        return Arrays.stream(roles.split(","))
                .map(String::trim)
                .filter(StringUtils::isNotEmpty)
                .toList();
    }

    public long credentialVersion() {
        return credentialVersion;
    }

    boolean disabled() {
        return disabled;
    }

    boolean bootstrapAdministrator() {
        return bootstrapSlot != null;
    }

    void replacePassword(String hash) {
        passwordHash = hash;
        credentialVersion++;
    }

    @Override
    public String toString() {
        return "DatabaseAccount[username=" + username + ", credentialVersion=" + credentialVersion
                + ", disabled=" + disabled + "]";
    }
}
