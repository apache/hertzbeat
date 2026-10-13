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

package org.apache.hertzbeat.manager.service.helper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.List;
import org.apache.hertzbeat.manager.service.ImExportService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskService;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskStatus;
import org.apache.hertzbeat.manager.service.importtask.ImportTaskView;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class MonitorImportCommandTest {

    @Mock
    private ImExportService imExportService;

    @Test
    void returnsStableTaskIdAndRunsImportAgainstThatCanonicalTask() throws Exception {
        when(imExportService.type()).thenReturn("JSON");
        ImportTaskService tasks = new ImportTaskService(null);
        MonitorImExportHelper helper = new MonitorImExportHelper(
                List.of(imExportService), tasks, new SyncTaskExecutor());
        MockMultipartFile file = new MockMultipartFile("file", "monitors.json", "application/json", "[]".getBytes());

        ImportTaskView accepted = helper.importConfig(file, "team-a");

        verify(imExportService).importConfig(eq(accepted.taskId()), any(InputStream.class));
        assertEquals(ImportTaskStatus.COMPLETED,
                tasks.find(accepted.taskId(), "team-a").orElseThrow().status());
    }
}
