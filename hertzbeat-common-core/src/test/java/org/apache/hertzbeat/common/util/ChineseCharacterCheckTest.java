/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.util;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ast.CompilationUnit;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.FileVisitOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Test case for checking Chinese characters in Java files
 */
@Slf4j
public class ChineseCharacterCheckTest {

    private static final Pattern CHINESE_CHAR_PATTERN = Pattern.compile("[\u4e00-\u9fa5]");
    private static final Set<String> EXCLUDED_FILES = new HashSet<>(Collections.singletonList("Metrics"));
    private static final String MAIN_SOURCE_DIR = "src/main/java";
    private static final String TEST_SOURCE_DIR = "src/test/java";
    
    private final JavaParser javaParser = new JavaParser();
    private final String sourceDir;
    private final String testDir;
    
    public ChineseCharacterCheckTest() {
        boolean isWindowsOs = System.getProperty("os.name").toLowerCase().startsWith("win");
        String separator = isWindowsOs ? "\\" : "/";
        this.sourceDir = MAIN_SOURCE_DIR.replace("/", separator);
        this.testDir = TEST_SOURCE_DIR.replace("/", separator);
    }

    @Test
    void shouldNotContainChineseInComments() {
        List<String> violations = scanForChineseCharacters(ScanTarget.COMMENTS);
        assertNoChineseCharacters(violations);
    }

    private List<String> scanForChineseCharacters(ScanTarget target) {
        List<String> violations = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(Paths.get(".."), FileVisitOption.FOLLOW_LINKS)) {
            paths.filter(this::isValidJavaFile)
                .forEach(path -> processFile(path, target, violations));
        } catch (IOException e) {
            throw new RuntimeException("Failed to scan Java files", e);
        }
        return violations;
    }

    private boolean isValidJavaFile(Path path) {
        String pathStr = path.toString();
        return pathStr.endsWith(".java") 
                && (pathStr.contains(sourceDir) || pathStr.contains(testDir))
                && EXCLUDED_FILES.stream().noneMatch(pathStr::contains);
    }

    private void processFile(Path path, ScanTarget target, List<String> violations) {
        try {
            ParseResult<CompilationUnit> parseResult = javaParser.parse(Files.newInputStream(path));
            parseResult.getResult().ifPresent(cu -> {
                if (target.includeComments()) {
                    checkComments(cu, path, violations);
                }
                if (target.includeCode()) {
                    checkCode(cu, path, violations);
                }
            });
        } catch (Exception e) {
            log.error("Error processing file: {}", path, e);
        }
    }

    private void checkComments(CompilationUnit cu, Path path, List<String> violations) {
        cu.getAllContainedComments().stream()
            .filter(comment -> CHINESE_CHAR_PATTERN.matcher(comment.getContent()).find())
            .forEach(comment -> violations.add(formatViolation(path, "comment", comment.getContent().trim())));
    }

    private void checkCode(CompilationUnit cu, Path path, List<String> violations) {
        cu.findAll(com.github.javaparser.ast.expr.StringLiteralExpr.class).stream()
            .filter(str -> CHINESE_CHAR_PATTERN.matcher(str.getValue()).find())
            .forEach(str -> violations.add(formatViolation(path, "code", str.getValue())));
    }

    private String formatViolation(Path path, String location, String content) {
        return String.format("Chinese characters found in %s at %s: %s", 
                location, path.toAbsolutePath(), content);
    }

    private void assertNoChineseCharacters(List<String> violations) {
        Assertions.assertEquals(0, violations.size(),
                () -> String.format("Found Chinese characters in files:%n%s", 
                        String.join(System.lineSeparator(), violations)));
    }

    private enum ScanTarget {
        COMMENTS(true, false),
        CODE(false, true),
        ALL(true, true);

        private final boolean checkComments;
        private final boolean checkCode;

        ScanTarget(boolean checkComments, boolean checkCode) {
            this.checkComments = checkComments;
            this.checkCode = checkCode;
        }

        public boolean includeComments() {
            return checkComments;
        }

        public boolean includeCode() {
            return checkCode;
        }
    }
}
