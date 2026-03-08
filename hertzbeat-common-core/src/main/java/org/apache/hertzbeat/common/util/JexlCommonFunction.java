/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.util;

import java.util.regex.Pattern;

/**
 * the common function for jexl str equals, match, contains, etc.
 * sys:now() 
 */
public class JexlCommonFunction {

    /**
     * Get the current time in milliseconds
     * @return current time
     */
    public long now() {
        return System.currentTimeMillis();
    }


    /**
     * Define a custom string equality function
     * @param left left
     * @param right right
     * @return true if equals
     */
    public boolean equals(String left, String right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.equals(right);
    }

    /**
     * Custom determines whether string 1 contains string 2 (case-insensitive)
     * @param left left
     * @param right right
     * @return true if contains
     */
    public boolean contains(String left, String right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.toLowerCase().contains(right.toLowerCase());
    }


    /**
     * Custom determines if a value exists for this object in the environment
     * @param arg arg
     * @return true if exists
     */
    public boolean exists(Object arg) {
        if (arg == null) {
            return false;
        }
        return !String.valueOf(arg).isEmpty();
    }

    /**
     * Custom determines if a string matches a regex
     * - regex You need to add "" or ''
     * @param str str
     * @param regex regex
     * @return true if matches
     */
    public boolean matches(String str, String regex) {
        if (str == null || regex == null) {
            return false;
        }
        return Pattern.compile(regex).matcher(str).matches();
    }
    
}
