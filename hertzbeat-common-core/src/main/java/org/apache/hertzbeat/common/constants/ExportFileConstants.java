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

package org.apache.hertzbeat.common.constants;

/**
 * Export file type constants
 */

public interface ExportFileConstants {

    /**
     * Export file name constants.
     */
    String FILE = "file";

    /**
     * Excel export files constants.
     */
    interface ExcelFile {

        /**
         * Export file type.
         */
        String TYPE = "EXCEL";

        /**
         * Export file suffix.
         */
        String FILE_SUFFIX = ".xlsx";
    }

    /**
     * Json export file constants.
     */
    interface JsonFile {

        /**
         * Export file type.
         */
        String TYPE = "JSON";

        /**
         * Export file suffix.
         */
        String FILE_SUFFIX = ".json";
    }

    /**
     * Yaml export file constants.
     */
    interface YamlFile {

        /**
         * Export file type.
         */
        String TYPE = "YAML";

        /**
         * Export file suffix.
         */
        String FILE_SUFFIX = ".yaml";
    }

}
