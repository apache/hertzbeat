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

package org.apache.hertzbeat.templatehub.controller;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import io.jsonwebtoken.ExpiredJwtException;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.DTO.LoginDto;
import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.apache.hertzbeat.templatehub.model.DTO.RefreshTokenResponse;
import org.apache.hertzbeat.templatehub.model.DTO.TokenDto;
import org.apache.hertzbeat.templatehub.service.AccountService;
import org.apache.hertzbeat.templatehub.util.ResponseUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.naming.AuthenticationException;
import java.util.List;
import java.util.Map;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.LOGIN_FAILED_CODE;

@Slf4j
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("user")
public class UserController {

    @Autowired
    private AccountService accountService;

    @GetMapping("/role")
    public ResponseEntity<Message> getUserRoles() {
        SubjectSum subject = SurenessContextHolder.getBindSubject();
        if (subject == null || subject.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String appId = (String) subject.getPrincipal();
        List<String> roles = accountService.loadAccountRoles(appId);
        return ResponseEntity.ok(Message.builder().data(roles).build());
    }

    @PostMapping("/authority/role/{appId}/{roleId}")
    public ResponseEntity<Message> authorityUserRole(@PathVariable String appId, @PathVariable Long roleId) {
        SubjectSum subject = SurenessContextHolder.getBindSubject();
        if (subject == null || subject.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String principal = (String) subject.getPrincipal();
        if (!principal.equals(appId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean flag = accountService.authorityUserRole(appId, roleId);
        return flag ? ResponseEntity.ok().build() : ResponseEntity.status(HttpStatus.CONFLICT).build();
    }

    @DeleteMapping("/authority/role/{appId}/{roleId}")
    public ResponseEntity<Message> deleteAuthorityUserRole(@PathVariable String appId, @PathVariable Long roleId) {
        SubjectSum subject = SurenessContextHolder.getBindSubject();
        if (subject == null || subject.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String principal = (String) subject.getPrincipal();
        if (!principal.equals(appId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return accountService.deleteAuthorityUserRole(appId, roleId) ?
                ResponseEntity.ok().build() : ResponseEntity.status(HttpStatus.CONFLICT).build();
    }

}
