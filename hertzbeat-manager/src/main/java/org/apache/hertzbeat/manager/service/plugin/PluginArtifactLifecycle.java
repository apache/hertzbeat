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

package org.apache.hertzbeat.manager.service.plugin;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Coordinates plugin JAR and extracted-library artifacts with database transactions.
 */
@Component
@Slf4j
public class PluginArtifactLifecycle {

    private static final String PLUGIN_LIB_DIR_PROPERTY = "hertzbeat.plugin.lib.dir";

    public File createUploadTarget(String originalFilename) {
        if (originalFilename == null || !originalFilename.endsWith(".jar")
                || originalFilename.matches(".*(\\.\\.|[\n\t\r/\\\\]).*")) {
            throw new CommonException("Invalid plugin file name");
        }
        try {
            File root = pluginRoot();
            FileUtils.forceMkdir(root);
            String filename = UUID.randomUUID().toString().replace("-", "") + "_" + originalFilename;
            return requireManagedJar(new File(root, filename));
        } catch (IOException exception) {
            throw new CommonException("Failed to prepare plugin upload");
        }
    }

    public File requireManagedJar(File jar) {
        if (jar == null) {
            throw new CommonException("Plugin artifact path is invalid");
        }
        File canonical = requireManagedPath(jar);
        if (!canonical.getName().endsWith(".jar")) {
            throw new CommonException("Plugin artifact path is invalid");
        }
        return canonical;
    }

    public void registerUploadRollbackCleanup(File jar) {
        File managedJar = requireManagedJar(jar);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    deleteManagedArtifacts(managedJar);
                }
            }
        });
    }

    public void cleanupFailedUpload(File jar) {
        deleteManagedArtifacts(requireManagedJar(jar));
    }

    public Deletion prepareDeletion(List<String> jarPaths) {
        if (jarPaths == null) {
            throw new CommonException("Plugin artifact path is invalid");
        }
        List<File> managedJars = jarPaths.stream()
                .map(path -> path == null ? null : new File(path))
                .map(this::requireManagedJar)
                .toList();
        if (!managedJars.isEmpty() && !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new CommonException("Plugin artifact transaction is unavailable");
        }
        return new Deletion(managedJars);
    }

    public void deleteCommitted(Deletion deletion) {
        if (deletion == null) {
            throw new CommonException("Plugin artifact path is invalid");
        }
        for (File managedJar : deletion.managedJars) {
            try {
                deleteManagedArtifacts(managedJar);
            } catch (RuntimeException exception) {
                log.error("Failed to clean a committed plugin artifact");
            }
        }
    }

    private File pluginRoot() throws IOException {
        return new File(System.getProperty(PLUGIN_LIB_DIR_PROPERTY, "plugin-lib")).getCanonicalFile();
    }

    private void deleteManagedArtifacts(File jar) {
        try {
            File managedJar = requireManagedJar(jar);
            FileUtils.delete(managedJar);
            File extractedLibraries = requireManagedPath(companionDirectory(managedJar));
            if (extractedLibraries.exists()) {
                FileUtils.deleteDirectory(extractedLibraries);
            }
        } catch (IOException exception) {
            throw new CommonException("Plugin artifact cleanup failed");
        }
    }

    private File companionDirectory(File jar) {
        String path = jar.getPath();
        int extension = path.lastIndexOf('.');
        if (extension <= pluginRootPrefixLength()) {
            throw new CommonException("Plugin artifact path is invalid");
        }
        return new File(path.substring(0, extension));
    }

    private int pluginRootPrefixLength() {
        try {
            return pluginRoot().getPath().length() + 1;
        } catch (IOException exception) {
            throw new CommonException("Plugin artifact path is invalid");
        }
    }

    private File requireManagedPath(File artifact) {
        try {
            File root = pluginRoot();
            File canonical = artifact.getCanonicalFile();
            String rootPrefix = root.getPath() + File.separator;
            if (!canonical.getPath().startsWith(rootPrefix)) {
                throw new CommonException("Plugin artifact path is invalid");
            }
            return canonical;
        } catch (IOException exception) {
            throw new CommonException("Plugin artifact path is invalid");
        }
    }

    /**
     * Canonicalized immutable deletion plan validated before database mutation.
     */
    public static final class Deletion {

        private final List<File> managedJars;

        private Deletion(List<File> managedJars) {
            this.managedJars = List.copyOf(managedJars);
        }
    }
}
