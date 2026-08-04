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

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Safety helpers for building JDBC connection urls from user supplied monitor parameters.
 *
 * <p>Connection parameters such as the database name are concatenated into the jdbc url. Without
 * restriction a value like {@code db?allowLoadLocalInfile=true} injects arbitrary driver properties,
 * which a malicious database server turns into local file disclosure or deserialization on the
 * connecting jvm. The url blacklist only guards the url a user types in directly, so every other
 * value that reaches the url has to be constrained here.
 */
public final class JdbcUrlSafetyUtil {

    /**
     * Identifier characters accepted in a database or schema name. Deliberately excludes the
     * characters that carry meaning inside a jdbc url: {@code ? & = : / \ ; # space}.
     */
    private static final Pattern DATABASE_NAME_PATTERN = Pattern.compile("^[A-Za-z0-9_$][A-Za-z0-9_$.\\-]{0,63}$");

    /**
     * Driver properties that turn a connection into a client side attack. Checked against the
     * assembled url so a concatenation mistake anywhere still fails closed.
     */
    private static final String[] DANGEROUS_URL_PROPERTIES = {
            // file IO - lets a malicious server read files from the connecting host
            "allowloadlocalinfile", "allowloadlocalinfileinpath", "uselocalinfile",
            // code execution and deserialization
            "autodeserialize", "detectcustomcollations", "queryinterceptors", "statementinterceptors",
            "exceptioninterceptors", "javaobjectserializer", "serverstatusdiffinterceptor",
            "socketfactory", "init=", "runscript",
            // multi statement execution
            "allowmultiqueries",
            // remote object lookup
            "jndi:", "ldap:", "rmi:",
    };

    private JdbcUrlSafetyUtil() {
    }

    /**
     * Validate a database or schema name that is about to be concatenated into a jdbc url.
     *
     * @param database database name, may be null or empty
     * @return the database name, or an empty string when nothing was supplied
     * @throws IllegalArgumentException when the name contains jdbc url syntax
     */
    public static String requireSafeDatabaseName(String database) {
        if (database == null || database.isEmpty()) {
            return "";
        }
        if (!DATABASE_NAME_PATTERN.matcher(database).matches()) {
            throw new IllegalArgumentException("Invalid database name: only letters, digits, "
                    + "'_', '$', '.' and '-' are allowed, up to 64 characters");
        }
        return database;
    }

    /**
     * Reject an assembled jdbc url that carries a driver property known to be attacker useful.
     *
     * <p>Applies to urls this project builds itself. Urls typed in by a user go through the wider
     * platform aware checks in the collector before reaching here.
     *
     * @param url assembled jdbc url
     * @throws IllegalArgumentException when a dangerous property is present
     */
    public static void requireSafeJdbcUrl(String url) {
        if (url == null || url.isEmpty()) {
            return;
        }
        String normalized = url.toLowerCase(Locale.ROOT).replaceAll("[\\x00-\\x1F\\x7F]", "");
        for (String property : DANGEROUS_URL_PROPERTIES) {
            if (normalized.contains(property)) {
                throw new IllegalArgumentException(
                        "Invalid JDBC URL: contains potentially malicious parameter: " + property);
            }
        }
    }
}
