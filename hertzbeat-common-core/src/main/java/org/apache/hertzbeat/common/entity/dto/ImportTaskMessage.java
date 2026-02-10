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

package org.apache.hertzbeat.common.entity.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.hertzbeat.common.constants.ImportTaskStatusEnum;
import org.apache.hertzbeat.common.constants.ManagerEventTypeEnum;
import org.apache.hertzbeat.common.constants.NotifyLevelEnum;
import org.springframework.lang.Nullable;

/**
 * Import task message
 */
@EqualsAndHashCode(callSuper = true)
@Data
public class ImportTaskMessage extends ManagerMessage {

    /**
     * Task name
     */
    @NotNull
    private String taskName;

    /**
     * Progress, expressed as a percentage
     */
    @Nullable
    private Integer progress;

    /**
     * Task Status,
     * @see ImportTaskStatusEnum
     */
    @NotNull
    private String status;

    /**
     * If Fail, the error message
     */
    @Nullable
    private String errMsg;

    public ImportTaskMessage(String notifyLevel, String managerEventType, String taskName, @Nullable Integer progress, String status, @Nullable String errMsg){
        super(notifyLevel, managerEventType);
        this.taskName = taskName;
        this.progress = progress;
        this.status = status;
        this.errMsg = errMsg;
    }

    public static ManagerMessage createInProgressMessage(String taskName, Integer process){
        return new ImportTaskMessage(NotifyLevelEnum.INFO.getValue(), ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), taskName, process, ImportTaskStatusEnum.IN_PROGRESS.getValue(), null);
    }

    public static ManagerMessage createCompletedMessage(String taskName){
        return new ImportTaskMessage(NotifyLevelEnum.SUCCESS.getValue(), ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), taskName, null, ImportTaskStatusEnum.COMPLETED.getValue(), null);
    }

    public static ManagerMessage createFailedMessage(String taskName, String errMsg){
        return new ImportTaskMessage(NotifyLevelEnum.ERROR.getValue(), ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), taskName, null, ImportTaskStatusEnum.FAILED.getValue(), errMsg);
    }
}