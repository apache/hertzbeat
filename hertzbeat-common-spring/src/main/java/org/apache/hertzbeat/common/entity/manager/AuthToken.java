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

package org.apache.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * API Token Entity - stores generated non-expiring API tokens for management and revocation.
 * <p>
 * Only "managed" tokens (those generated after this feature was introduced) are stored here.
 * Legacy tokens are not tracked and continue to work without DB validation.
 * </p>
 */
@Entity
@Table(name = "hzb_auth_token")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "API Token entity")
@EntityListeners(AuditingEntityListener.class)
public class AuthToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "primary id", example = "1", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Token name/description", example = "Alert integration token", accessMode = READ_WRITE)
    @Column(length = 255)
    private String name;

    @Schema(title = "SHA-256 hash of the token value", accessMode = READ_ONLY)
    @Column(length = 128, nullable = false, unique = true)
    private String tokenHash;

    @Schema(title = "Masked token for display", example = "eyJh****xMjM", accessMode = READ_ONLY)
    @Column(length = 64)
    private String tokenMask;

    @Schema(title = "Token status: 0-active", accessMode = READ_ONLY)
    @Column(nullable = false)
    @Builder.Default
    private Byte status = 0;

    @Schema(title = "The creator of this token", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "Token creation time", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Token expiration time, null means never expire", accessMode = READ_ONLY)
    private LocalDateTime expireTime;

    @Schema(title = "Token last used time", accessMode = READ_ONLY)
    private LocalDateTime lastUsedTime;

}
