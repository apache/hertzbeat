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

package org.apache.hertzbeat.collector.collect.basic.database;

/**
 * Database type (image mame) and image tag enumeration class
 */
public enum DatabaseImagesEnum {
    MYSQL("mysql", "8.0.36"),
    POSTGRESQL("postgresql", "15");

    private final String imageName;
    private final String defaultTag;

    DatabaseImagesEnum(String imageName, String defaultTag) {
        this.imageName = imageName;
        this.defaultTag = defaultTag;
    }

    public String getImageName() {
        return imageName;
    }

    public String getDefaultTag() {
        return defaultTag;
    }

    public String getFullImageName() {
        return imageName + ":" + defaultTag;
    }

    public static DatabaseImagesEnum fromImageName(String imageName) {
        for (DatabaseImagesEnum value : values()) {
            if (value.getImageName().equalsIgnoreCase(imageName)) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown database image name: " + imageName);
    }

    public static DatabaseImagesEnum fromFullImageName(String fullImageName) {
        for (DatabaseImagesEnum value : values()) {
            if (value.getFullImageName().equalsIgnoreCase(fullImageName)) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown full database image name: " + fullImageName);
    }

    @Override
    public String toString() {
        return "DatabaseImagesEnum{"
                + "imageName='" + imageName + '\''
                + ", defaultTag='" + defaultTag + '\''
                + '}';
    }
}
