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

package org.apache.hertzbeat.alert.service;

import java.util.List;
import org.apache.hertzbeat.alert.dto.NoticeReceiverMutationResponse;
import org.apache.hertzbeat.alert.dto.NoticeReceiverOptionResponse;
import org.apache.hertzbeat.alert.dto.NoticeReceiverRequest;
import org.apache.hertzbeat.alert.dto.NoticeReceiverResponse;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Public receiver workflow boundary with validation, secret preservation, and authoritative rereads. */
@Service
@Transactional(rollbackFor = Exception.class)
public class NoticeReceiverContractService {

    private final NoticeConfigService noticeConfigService;
    private final NoticeReceiverContractMapper mapper;

    public NoticeReceiverContractService(
            NoticeConfigService noticeConfigService, NoticeReceiverContractMapper mapper) {
        this.noticeConfigService = noticeConfigService;
        this.mapper = mapper;
    }

    public NoticeReceiverMutationResponse create(NoticeReceiverRequest request) {
        if (request.getId() != null) {
            throw new IllegalArgumentException("Receiver ID is server assigned");
        }
        NoticeReceiver receiver = mapper.toEntity(request, null);
        noticeConfigService.addReceiver(receiver);
        return confirmed(receiver.getId(), "created");
    }

    public NoticeReceiverMutationResponse update(NoticeReceiverRequest request) {
        if (request.getId() == null) {
            throw new IllegalArgumentException("Receiver ID is required");
        }
        NoticeReceiver existing = noticeConfigService.getReceiverById(request.getId());
        if (existing == null) {
            return NoticeReceiverMutationResponse.missing(request.getId());
        }
        noticeConfigService.editReceiver(mapper.toEntity(request, existing));
        return confirmed(request.getId(), "updated");
    }

    public NoticeReceiverMutationResponse delete(Long id) {
        if (noticeConfigService.getReceiverById(id) == null) {
            return NoticeReceiverMutationResponse.missing(id);
        }
        noticeConfigService.deleteReceiver(id);
        if (noticeConfigService.getReceiverById(id) != null) {
            throw new IllegalStateException("Receiver deletion was not persisted");
        }
        return new NoticeReceiverMutationResponse(id, "deleted", null);
    }

    @Transactional(readOnly = true)
    public Page<NoticeReceiverResponse> page(String name, int pageIndex, int pageSize) {
        return noticeConfigService.getNoticeReceivers(name, pageIndex, pageSize).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<NoticeReceiverOptionResponse> options() {
        return noticeConfigService.getAllNoticeReceivers().stream()
                .map(receiver -> new NoticeReceiverOptionResponse(
                        receiver.getId(), receiver.getName(), receiver.getType()))
                .toList();
    }

    @Transactional(readOnly = true)
    public NoticeReceiverResponse get(Long id) {
        NoticeReceiver receiver = noticeConfigService.getReceiverById(id);
        return receiver == null ? null : mapper.toResponse(receiver);
    }

    public boolean sendTest(NoticeReceiverRequest request) {
        NoticeReceiver existing = request.getId() == null ? null : noticeConfigService.getReceiverById(request.getId());
        return noticeConfigService.sendTestMsg(mapper.toEntity(request, existing));
    }

    private NoticeReceiverMutationResponse confirmed(Long id, String status) {
        if (id == null) {
            throw new IllegalStateException("Persisted receiver has no ID");
        }
        NoticeReceiver persisted = noticeConfigService.getReceiverById(id);
        if (persisted == null) {
            throw new IllegalStateException("Receiver is unavailable after persistence");
        }
        return new NoticeReceiverMutationResponse(id, status, mapper.toResponse(persisted));
    }
}
