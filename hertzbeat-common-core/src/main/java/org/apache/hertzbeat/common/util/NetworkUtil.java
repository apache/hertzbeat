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

package org.apache.hertzbeat.common.util;

/**
 * network util
 */
public final class NetworkUtil {

    public static final String OS_NAME = System.getProperty("os.name");

    private static final String LINUX = "linux";

    private static final String WINDOWS = "windows";

    private static boolean isLinuxPlatform = false;
    private static boolean isWindowsPlatform = false;

    static {
        if (OS_NAME != null && OS_NAME.toLowerCase().contains(LINUX)) {
            isLinuxPlatform = true;
        }

        if (OS_NAME != null && OS_NAME.toLowerCase().contains(WINDOWS)) {
            isWindowsPlatform = true;
        }
    }

    private NetworkUtil() {
    }

    /**
     * whether the running environment is linux
     * @return is linux platform or not
     */
    public static boolean isLinuxPlatform() {
        return isLinuxPlatform;
    }

    /**
     * whether the running environment is windows
     * @return is windows platform or not
     */
    public static boolean isWindowsPlatform() {
        return isWindowsPlatform;
    }
}
