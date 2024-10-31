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

package org.apache.hertzbeat.templatehub.model.DO;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.Range;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Builder
@Entity
@Table(name = "auth_user")
public class AuthUserDO implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(nullable = false)
    @Schema(description = "Username, can be repeated, can be modified")
    private String name;

    @Column(nullable = false)
    @Schema(description = "Email, can be modified, used for user login")
    private String email;

    @NotBlank(message = "password can not null")
    @Length(min = 3, max = 100, message = "password length in 3-100")
    private String password;

    private String salt;

    private String avatar;

    @Range(min = 0, max = 4, message = "1 enable, 2 locked, 3 deleted, 4 illegal")
    private Integer status;

    @Column(nullable = false,name = "create_time")
    private String createTime;

    @Column(nullable = false,name = "update_time")
    private String updateTime;

    @Column(nullable = false,name = "log_off_time")
    @Schema(description = "Logout time, if not logged out it is 0, if logged out it is time")
    private String logOffTime;


}
