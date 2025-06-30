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

package org.apache.hertzbeat.collector.collect.mqtt;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Formats the private key and certificate, supporting concatenation of multiple certificates in PEM format.
 */
public class CertificateFormatter {

    public static String formatCertificateChain(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }

        String normalized = normalizeInput(input);

        List<String> certificates = extractCertificates(normalized);

        if (certificates.isEmpty()) {
            return formatAsSingleCertificate(normalized);
        }

        StringBuilder formattedChain = new StringBuilder();
        for (String cert : certificates) {
            if (cert.trim().isEmpty()) continue;

            String formatted = formatPemBlock(cert);
            formattedChain.append(formatted).append("\n");
        }

        return formattedChain.toString().trim();
    }

    private static String normalizeInput(String input) {
        return input
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .replaceAll("\\s*\\\\n\\s*", "\n")
                .replaceAll("(?m)^\\s+|\\s+$", "")
                .trim();
    }

    private static List<String> extractCertificates(String input) {
        List<String> certificates = new ArrayList<>();
        String regex = "(-----BEGIN\\s+[\\w\\s]+?-----)[\\s\\S]*?(-----END\\s+[\\w\\s]+?-----)";


        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(input);

        int lastEnd = 0;
        while (matcher.find()) {

            if (matcher.start() > lastEnd) {
                String gap = input.substring(lastEnd, matcher.start());
                if (!gap.trim().isEmpty()) {
                    certificates.add(gap);
                }
            }

            certificates.add(matcher.group());
            lastEnd = matcher.end();
        }


        if (lastEnd < input.length()) {
            certificates.add(input.substring(lastEnd));
        }

        return certificates;
    }

    private static String formatPemBlock(String block) {
        try {
            Pattern pattern = Pattern.compile(
                    "(-----BEGIN\\s+[\\w\\s]+?-----)(.*?)(-----END\\s+[\\w\\s]+?-----)",
                    Pattern.DOTALL | Pattern.CASE_INSENSITIVE
            );

            Matcher matcher = pattern.matcher(block);
            if (matcher.find()) {
                String header = matcher.group(1).trim();
                String body = matcher.group(2);
                String footer = matcher.group(3).trim();


                if (body == null) body = "";

                String cleanBody = body
                        .replaceAll("\\s", "")
                        .replaceAll("\"", "")
                        .trim();


                if (cleanBody.isEmpty() && body != null && !body.trim().isEmpty()) {

                    cleanBody = body.replaceAll("[^a-zA-Z0-9+/=]", "").trim();
                }

                String formattedBody = formatBase64Body(cleanBody);

                return header + "\n" + formattedBody + "\n" + footer;
            } else {

                return formatAsCertificate(block);
            }
        } catch (Exception e) {

            return block;
        }
    }

    private static String formatAsCertificate(String content) {

        String cleanContent = content.replaceAll("[^a-zA-Z0-9+/=]", "").trim();

        if (cleanContent.isEmpty()) {
            return content;
        }


        String formattedBody = formatBase64Body(cleanContent);


        if (cleanContent.toLowerCase().contains("private")) {
            if (cleanContent.startsWith("MII") || cleanContent.length() > 1000) {
                return "-----BEGIN PRIVATE KEY-----\n" + formattedBody + "\n-----END PRIVATE KEY-----";
            } else {
                return "-----BEGIN RSA PRIVATE KEY-----\n" + formattedBody + "\n-----END RSA PRIVATE KEY-----";
            }
        } else {
            return "-----BEGIN CERTIFICATE-----\n" + formattedBody + "\n-----END CERTIFICATE-----";
        }
    }

    private static String formatAsSingleCertificate(String input) {
        String cleanContent = input.replaceAll("[^a-zA-Z0-9+/=]", "").trim();
        return formatAsCertificate(cleanContent);
    }

    private static String formatBase64Body(String body) {

        StringBuilder formatted = new StringBuilder();
        int index = 0;
        while (index < body.length()) {
            int end = Math.min(index + 64, body.length());
            formatted.append(body.substring(index, end));
            if (end < body.length()) {
                formatted.append("\n");
            }
            index = end;
        }
        return formatted.toString().trim();
    }

    public static String formatPrivateKey(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }


        String normalized = normalizeInput(input);


        if (isPemEncapsulated(normalized)) {
            return formatPemBlock(normalized);
        }

        return formatAsCertificate(normalized);
    }

    private static boolean isPemEncapsulated(String block) {
        return block.contains("-----BEGIN") && block.contains("-----END");
    }
}
