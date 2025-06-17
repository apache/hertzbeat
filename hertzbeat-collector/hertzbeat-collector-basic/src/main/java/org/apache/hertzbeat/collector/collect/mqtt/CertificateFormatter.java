package org.apache.hertzbeat.collector.collect.mqtt;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CertificateFormatter {

    /**
     * 格式化证书字符串，支持处理多个证书
     */
    public static String formatCertificateChain(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }

        // 标准化输入格式
        String normalized = normalizeInput(input);

        // 提取所有证书块
        List<String> certificates = extractCertificates(normalized);

        // 如果没有找到证书块，尝试作为纯内容处理
        if (certificates.isEmpty()) {
            return formatAsSingleCertificate(normalized);
        }

        // 格式化每个证书块
        StringBuilder formattedChain = new StringBuilder();
        for (String cert : certificates) {
            // 防止空证书块
            if (cert.trim().isEmpty()) continue;

            String formatted = formatPEMBlock(cert);
            formattedChain.append(formatted).append("\n");
        }

        return formattedChain.toString().trim();
    }

    private static String normalizeInput(String input) {
        return input
                .replace("\r\n", "\n")        // 统一换行符
                .replace("\r", "\n")          // 处理Mac换行符
                .replaceAll("\\s*\\\\n\\s*", "\n") // 处理转义换行符
                .replaceAll("(?m)^\\s+|\\s+$", "") // 去除行首行尾空格
                .trim();                      // 去除首尾空白
    }

    private static List<String> extractCertificates(String input) {
        List<String> certificates = new ArrayList<>();
        String regex = "(-----BEGIN\\s+[\\w\\s]+?-----)[\\s\\S]*?(-----END\\s+[\\w\\s]+?-----)";

        // 使用非贪婪模式匹配多个证书块
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(input);

        int lastEnd = 0;
        while (matcher.find()) {
            // 如果两个证书块之间有内容，可能是不完整的证书
            if (matcher.start() > lastEnd) {
                String gap = input.substring(lastEnd, matcher.start());
                if (!gap.trim().isEmpty()) {
                    certificates.add(gap);
                }
            }

            certificates.add(matcher.group());
            lastEnd = matcher.end();
        }

        // 添加最后一个证书块后的内容
        if (lastEnd < input.length()) {
            certificates.add(input.substring(lastEnd));
        }

        return certificates;
    }

    private static String formatPEMBlock(String block) {
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

                // 修复点: 处理空body的情况
                if (body == null) body = "";

                // 清理主体内容
                String cleanBody = body
                        .replaceAll("\\s", "")   // 移除所有空白
                        .replaceAll("\"", "")    // 移除引号
                        .trim();

                // 确保body非空
                if (cleanBody.isEmpty() && body != null && !body.trim().isEmpty()) {
                    // 可能body包含非标准的空白字符
                    cleanBody = body.replaceAll("[^a-zA-Z0-9+/=]", "").trim();
                }

                String formattedBody = formatBase64Body(cleanBody);

                return header + "\n" + formattedBody + "\n" + footer;
            } else {
                // 如果不能匹配格式，尝试作为纯Base64格式化
                return formatAsCertificate(block);
            }
        } catch (Exception e) {
            // 发生异常时返回原始内容，避免程序崩溃
            return block;
        }
    }

    private static String formatAsCertificate(String content) {
        // 清理内容
        String cleanContent = content.replaceAll("[^a-zA-Z0-9+/=]", "").trim();

        if (cleanContent.isEmpty()) {
            return content; // 无法格式化的空内容直接返回
        }

        // 格式化内容
        String formattedBody = formatBase64Body(cleanContent);

        // 添加标准标记 - 尝试检测证书类型
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
        // 按64字符分割
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

        // 标准化输入格式
        String normalized = normalizeInput(input);

        // 检查是否已有PEM封装
        if (isPEMEncapsulated(normalized)) {
            return formatPEMBlock(normalized);
        }

        return formatAsCertificate(normalized);
    }

    private static boolean isPEMEncapsulated(String block) {
        return block.contains("-----BEGIN") && block.contains("-----END");
    }
}
