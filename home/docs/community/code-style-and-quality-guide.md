---
id: 'code_style_and_quality_guide'
title: 'Code style and quality guide'
sidebar_position: 3
---

<!--
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

## 1 Pull Requests & Changes Rule

1. `ISSUE`/`PR`(pull request) driving and naming

   - After creating a new `PR`, you need to associate the existing corresponding `ISSUE` at the Github Development button on the `PR` page (if there is no corresponding ISSUE, it is recommended to create a new corresponding ISSUE).

   - Title naming format  
     `[feature/bugfix/doc/improve/refactor/bug/cleanup] title`

2. Description

   - Please fill in the `PR` template to describe the contribution. So that the reviewer can understand the problem and solution from the description, rather than just from the code.
   - Check the CheckList
3. It's recommended that `PR` should be arranged changes such as `cleanup`, `Refactor`, `improve`, and `feature` into separated `PRs`/`Commits`.
4. Commit message(English, lowercase, no special characters)  
   The commit of messages should follow a pattern similar to the `[feature/bugfix/doc/improve/refactor/bug/cleanup] title`

## 2 Code Checkstyle

### 2.1 Configure Checkstyle

1. Install the Checkstyle-IDEA plugin.
2. Open Checkstyle Settings. Click **Settings** → **Tools** → **Checkstyle**.
3. Set **Checkstyle version** to **10.14.2**.
4. Set **Scan scope** to **Only Java sources (including tests)**.
5. Click **+** button in the **Configuration** section to open a dialog to choose the checkstyle config file.
   1. Enter a **Description**. For example, hertzbeat.
   2. Select **Use a local checkstyle file**.
   3. Set **File** to **script/checkstyle/checkstyle.xml**.
   4. Select **Store relative to project location**.
   5. Click **Next** → **Next** → **Finish**.
6. Activate the configuration you just added by toggling the corresponding box.
7. Click **OK**.

- Backend code specification Maven plugin: `checkstyle`
  Just run `mvn checkstyle:checkstyle`.

- Frontend code formatting plugin `eslint`
  Just run `npm run lint:fix` in web-app

### 2.2 Document style check

1. Install `markdownlint-cli2` and run `npm install markdownlint-cli2 --global`
2. Run `markdownlint-cli2 "home/**/*.md"` in the project to automatically detect the Markdown file format.
3. Run `markdownlint-cli2 --fix "home/**/*.md"` in the project to automatically format the Markdown file format to ensure that all documents meet the specifications.

Error code description:

| **Error code**                           | **description**                                                     |
|--------------------------------------------| ------------------------------------------------------------ |
| **MD001 heading-increment**                | Heading levels should only increment by one level at a time  |
| **MD003 heading-style**                    | Heading style                                                |
| **MD004 ul-style**                         | Unordered list style                                         |
| **MD005 list-indent**                      | Inconsistent indentation for list items at the same level    |
| **MD007 ul-indent**                        | Unordered list indentation                                   |
| **MD009 no-trailing-spaces**               | Trailing spaces                                              |
| **MD010 no-hard-tabs**                     | Hard tabs                                                    |
| **MD011 no-reversed-links**                | Reversed link syntax                                         |
| **MD012 no-multiple-blanks**               | Multiple consecutive blank lines                             |
| **MD013 line-length**                      | Line length                                                  |
| **MD014 commands-show-output**             | Dollar signs used before commands without showing output     |
| **MD018 no-missing-space-atx**             | No space after hash on atx style heading                     |
| **MD019 no-multiple-space-atx**            | Multiple spaces after hash on atx style heading              |
| **MD020 no-missing-space-closed-atx**      | No space inside hashes on closed atx style heading           |
| **MD021 no-multiple-space-closed-atx**     | Multiple spaces inside hashes on closed atx style heading    |
| **MD022 blanks-around-headings**           | Headings should be surrounded by blank lines                 |
| **MD023 heading-start-left**               | Headings must start at the beginning of the line             |
| **MD024 no-duplicate-heading**             | Multiple headings with the same content                      |
| **MD025 single-title/single-h1**           | Multiple top-level headings in the same document             |
| **MD026 no-trailing-punctuation**          | Trailing punctuation in heading                              |
| **MD027 no-multiple-space-blockquote**     | Multiple spaces after blockquote symbol                      |
| **MD028 no-blanks-blockquote**             | Blank line inside blockquote                                 |
| **MD029 ol-prefix**                        | Ordered list item prefix                                     |
| **MD030 list-marker-space**                | Spaces after list markers                                    |
| **MD031 blanks-around-fences**             | Fenced code blocks should be surrounded by blank lines       |
| **MD032 blanks-around-lists**              | Lists should be surrounded by blank lines                    |
| **MD033 no-inline-html**                   | Inline HTML                                                  |
| **MD034 no-bare-urls**                     | Bare URL used                                                |
| **MD035 hr-style**                         | Horizontal rule style                                        |
| **MD036 no-emphasis-as-heading**           | Emphasis used instead of a heading                           |
| **MD037 no-space-in-emphasis**             | Spaces inside emphasis markers                               |
| **MD038 no-space-in-code**                 | Spaces inside code span elements                             |
| **MD039 no-space-in-links**                | Spaces inside link text                                      |
| **MD040 fenced-code-language**             | Fenced code blocks should have a language specified          |
| **MD041 first-line-heading/first-line-h1** | First line in a file should be a top-level heading           |
| **MD042 no-empty-links**                   | No empty links                                               |
| **MD043 required-headings**                | Required heading structure                                   |
| **MD044 proper-names**                     | Proper names should have the correct capitalization          |
| **MD045 no-alt-text**                      | Images should have alternate text (alt text)                 |
| **MD046 code-block-style**                 | Code block style                                             |
| **MD047 single-trailing-newline**          | Files should end with a single newline character             |
| **MD048 code-fence-style**                 | Code fence style                                             |
| **MD049 emphasis-style**                   | Emphasis style                                               |
| **MD050 strong-style**                     | Strong style                                                 |
| **MD051 link-fragments**                   | Link fragments should be valid                               |
| **MD052 reference-links-images**           | Reference links and images should use a label that is defined |
| **MD053 link-image-reference-definitions** | Link and image reference definitions should be needed        |
| **MD054 link-image-style**                 | Link and image style                                         |
| **MD055 table-pipe-style**                 | Table pipe style                                             |
| **MD056 table-column-count**               | Table column count                                           |

## 3 Programming Specification

### 3.1 Naming Style

1. Prioritize selecting nouns for variable naming, it's easier to distinguish between `variables` or `methods`.

   ```java
   Cache<String> publicKeyCache;
   ```

2. Pinyin abbreviations are prohibited for variables (excluding nouns such as place names), such as chengdu.
3. It is recommended to end variable names with a `type`.  
   For variables of type `Collection/List`, take `xxxx` (plural representing multiple elements) or end with `xxxList` (specific type).  
   For variables of type `map`, describe the `key` and `value` clearly:

   ```java
   Map<Long, User> idUserMap;
   Map<Long, String> userIdNameMap;
   ```

4. That can intuitively know the type and meaning of the variable through its name.  
   Method names should start with a verb first as follows:

   ```java
   void computeVcores(Object parameter1);
   ```

   > Note: It is not necessary to strictly follow this rule in the `Builder` tool class.

### 3.2 Constant Variables Definition

1. Redundant strings should be extracted as constants

   > If a constant has been hardcoded twice or more times, please directly extract it as a constant and change the corresponding reference.
   > In generally, constants in `log` can be ignored to extract.

   - Negative demo:

     ```java
     public static RestResponse success(Object data) {
         RestResponse resp = new RestResponse();
         resp.put("status", "success");
         resp.put("code", ResponseCode.CODE_SUCCESS);
         resp.put("data", data);
         return resp;
     }

     public static RestResponse error() {
         RestResponse resp = new RestResponse();
         resp.put("status", "error");
         resp.put("code", ResponseCode.CODE_FAIL);
         resp.put("data", null);
         return resp;
     }
     ```

   - Positive demo:

     > Strings are extracted as constant references.

     ```java
       public static final String STATUS = "status";
       public static final String CODE = "code";
       public static final String DATA = "data";

       public static RestResponse success(Object data) {
           RestResponse resp = new RestResponse();
           resp.put(STATUS, "success");
           resp.put(CODE, ResponseCode.CODE_SUCCESS);
           resp.put(DATA, data);
           return resp;
       }

       public static RestResponse error() {
           RestResponse resp = new RestResponse();
           resp.put(STATUS, "error");
           resp.put(CODE, ResponseCode.CODE_FAIL);
           resp.put(DATA, null);
           return resp;
       }
     ```

2. Ensure code readability and intuitiveness

   - The string in the `annotation` symbol doesn't need to be extracted as constant.

   - The referenced `package` or `resource` name doesn't need to be extracted as constant.

3. Variables that have not been reassigned must also be declared as <mark> final </mark> types.

4. About the arrangement order of `constant/variable` lines

   Sort the variable lines in the class in the order of
   1. `public static final V`, `static final V`,`protected static final V`, `private static final V`
   2. `public static v`, `static v`,`protected static v`, `private static v`
   3. `public v`, `v`, `protected v`, `private v`

### 3.3 Methods Rule

1. Sort the methods in the class in the order of `public`, `protected`, `private`

   Static methods of a class can be placed after non-static methods and sorted according to consistent method visibility.

2. When there are restrictions on the method, the parameters and returned values of the method need to be annotated with `@Nonnull` or `@Nullable` annotations and constraints.

   For example, if the parameter cannot be null, it is best to add a `@Nonnull` annotation. If the returned value can be null, the `@Nullable` annotation should be added first.

   <mark> Note: that the package name is <b>javax.validation.requirements</b> </mark>

3. If there are too many lines of code in the method, please have a try on using multiple sub methods at appropriate points to segment the method body.

   Generally speaking, it needs to adhere to the following principles:
   - Convenient testing
   - Good semantics
   - Easy to read

   In addition, it is also necessary to consider whether the splitting is reasonable in terms of components, logic, abstraction, and other aspects in the scenario.

   > However, there is currently no clear definition of demo. During the evolution process, we will provide additional examples for developers to have a clearer reference and understanding.

### 3.4 Collection Rule

1. For `collection` returned values, unless there are special `concurrent` (such as thread safety), always return the `interface`, such as:
   - returns <mark> List </mark> if use `ArrayList`
   - returns <mark> Map </mark> if use `HashMap`
   - returns <mark> Set </mark> if use `HashSet`
2. If there are multiple threads, the following declaration or returned types can be used:

    ```java
    private CurrentHashMap map;
    public CurrentHashMap funName();
    ```

3. Use `isEmpty()` instead of `length() == 0` or `size() == 0`
   - Negative demo：

     ```java
     if (pathPart.length() == 0) {
        return;
     }
     ```

   - Positive demo：

     ```java
     if (pathPart.isEmpty()) {
        return;
     }
     ```

### 3.5 Concurrent Processing

1. The `thread pool` needs to be managed, using a unified entry point to obtain the `thread pool`.

   <mark> Note: During the evolution process, we will provide additional examples for developers to have a clearer reference and understanding. </mark>

2. `Thread pool` needs to be resource constrained to prevent resource leakage caused by improper handling

### 3.6 Control/Condition Statements

1. Avoid unreasonable `condition/control` branches order leads to:
   - Multiple code line `depths` of `n+1`
   - Redundant lines

Generally speaking, if a method's code line depth exceeds `2+ Tabs` due to continuous nested `if... else..`, it should be considered to try

- `merging branches`,
- `inverting branch conditions`
- `extracting private methods`

to reduce code line depth and improve readability like follows:

- Union or merge the logic into the next level calling
  - Negative demo:

      ```java
      if (isInsert) {
          save(platform);
      } else {
          updateById(platform);
      }
      ```

  - Positive demo:

      ```java
      saveOrUpdate(platform);
      ```

- Merge the conditions
  - Negative demo:

      ```java
      if (expression1) {
          if (expression2) {
          ......
          }
      }
    
      ```

  - Positive demo:

      ```java
      if (expression1 && expression2) {
      ......
      }
      ```

- Reverse the condition
  - Negative demo:

    ```java
    public void doSomething() {
        // Ignored more deeper block lines
        // .....
        if (condition1) {
            // ...
        } else {
            // ...
        }
    }
    ```

  - Positive demo:

    ```java
    public void doSomething() {
        // Ignored more deeper block lines
        // .....
        if (!condition1) {
            // ...
            return;
        }
        // ...
    }
    ```

- Using a single variable or method to reduce the complex conditional expression
  - Negative demo:

    ```java
    if (dbType.indexOf("sqlserver") >= 0 || dbType.indexOf("sql server") >= 0) {
        // ...
    }
    ```

  - Positive demo:

    ```java
    if (containsSqlServer(dbType)) {
        // ....
    }
    //.....
    // definition of the containsSqlServer
    ```

> Using `sonarlint` and `better highlights` to check code depth looks like good in the future.

### 3.7 Code Comments Rule

1. Method lacks comments:

   - `When`: When can the method be called
   - `How`: How to use this method and how to pass parameters, etc.
   - `What`: What functions does this method achieve
   - `Note`: What should developers pay attention to when calling this method

2. Missing necessary class header description comments.

    Add `What`, `Note`, etc. like mentioned in the `1`.

3. The method declaration in the interface must be annotated.

   - If the semantics of the implementation and the annotation content at the interface declaration are inconsistent, the specific implementation method also needs to be rewritten with annotations.

   - If the semantics of the method implementation are consistent with the annotation content at the interface declaration, it is not recommended to write annotations to avoid duplicate annotations.

4. The first word in the comment lines need to be capitalized, like `param` lines, `return` lines.
   If a special reference as a subject does not need to be capitalized, special symbols such as quotation marks need to be noted.

### 3.8 Java Lambdas

1. Prefer `non-capturing` lambdas (lambdas that do not contain references to the outer scope).
   Capturing lambdas need to create a new object instance for every call. `Non-capturing` lambdas can use the same instance for each invocation.

   - Negative demo:

     ```java
     map.computeIfAbsent(key, x -> key.toLowerCase())
     ```

   - Positive demo:

     ```java
     map.computeIfAbsent(key, k -> k.toLowerCase());
     ```

2. Consider method references instead of inline lambdas

   - Negative demo:

     ```java
     map.computeIfAbsent(key, k-> Loader.load(k));
     ```

   - Positive demo:

     ```java
     map.computeIfAbsent(key, Loader::load);
     ```

### 3.9 Java Streams

- Avoid Java Streams in any performance critical code.

- The main motivation to use Java Streams would be to improve code readability. As such, they can be a good match in parts of the code that are not data-intensive, but deal with coordination.

- Even in the latter case, try to limit the scope to a method, or a few private methods within an internal class.

### 3.10 Pre-Conditions Checking

1. Use a unified `Utils.requireXXX` to complete the validation of the prerequisite, and if possible, replace the `AlertXXException.throwIfXXX` by new pre-conditions checking.

### 3.11 StringUtils

1. Use `StringUtils.isBlank` instead of `StringUtils.isEmpty`

   - Negative demo:

     ```java
     if (StringUtils.isEmpty(name)) {
        return;
     }
     ```

   - Positive demo:

     ```java
     if (StringUtils.isBlank(name)) {
        return;
     }
     ```

2. Use `StringUtils.isNotBlank` instead of `StringUtils.isNotEmpty`

   - Negative demo:

     ```java
     if (StringUtils.isNotEmpty(name)) {
        return;
     }
     ```

   - Positive demo:

     ```java
     if (StringUtils.isNotBlank(name)) {
        return;
     }
     ```

3. Use `StringUtils.isAllBlank` instead of `StringUtils.isAllEmpty`

   - Negative demo:

     ```java
     if (StringUtils.isAllEmpty(name, age)) {
        return;
     }
     ```

   - Positive demo:

     ```java
     if (StringUtils.isAllBlank(name, age)) {
        return;
     }
     ```

### 3.12 `Enum` Class

1. Enumeration value comparison

   - Negative demo:

     ```java
     if (status.equals(JobStatus.RUNNING)) {
        return;
     }
     ```

   - Positive demo:

     ```java
     if (status == JobStatus.RUNNING) {
        return;
     }
     ```

2. Enumeration classes do not need to implement Serializable

   - Negative demo:

     ```java
     public enum JobStatus implements Serializable {
        // ...
     }
     ```

   - Positive demo:

     ```java
     public enum JobStatus {
        // ...
     }
     ```

3. Use `Enum.name()` instead of `Enum.toString()`

   - Negative demo:

     ```java
     System.out.println(JobStatus.RUNNING.toString());
     ```

   - Positive demo:

     ```java
     System.out.println(JobStatus.RUNNING.name());
     ```

4. Enumeration class names uniformly use the Enum suffix

   - Negative demo:

     ```java
     public enum JobStatus {
        // ...
     }
     ```

   - Positive demo:

     ```java
     public enum JobStatusEnum {
        // ...
     }
     ```

### 3.13 `Deprecated` Annotation

- Negative demo:

```java
@deprecated
public void process(String input) {
    // ...
}
```

- Positive demo:

```java
@Deprecated
public void process(String input) {
    // ...
}
```

## 4 Log

1. Use `placeholders` for log output:

   - Negative demo

     ```java
     log.info("Deploy cluster request " + deployRequest);
     ```

   - Positive demo

     ```java
     log.info("load plugin:{} to {}", file.getName(), appPlugins);
     ```

2. Pay attention to the selection of `log level` when printing logs

    When printing the log content, if the actual parameters of the log placeholder are passed, it is necessary to avoid premature evaluation to avoid unnecessary evaluation caused by the log level.

   - Negative demo:

     Assuming the current log level is `INFO`:

     ```java
     // ignored declaration lines.
     List<User> userList = getUsersByBatch(1000);
     LOG.debug("All users: {}", getAllUserIds(userList));
     ```

   - Positive demo:

     In this case, we should determine the log level in advance before making actual log calls as follows:

     ```java
     // ignored declaration lines.
     List<User> userList = getUsersByBatch(1000);
     if (LOG.isDebugEnabled()) {
       LOG.debug("All ids of users: {}", getAllIDsOfUsers(userList)); 
     }
     ```

## 5 Testing

1. It's recommended to use `JUnit5` to develop test case preparation

2. The implemented interface needs to write the `e2e` test case script under the `e2e` module.

## References

- <https://site.mockito.org/>
- <https://alibaba.github.io/p3c/>
- <https://rules.sonarsource.com/java/>
- <https://junit.org/junit5/>
- <https://streampark.apache.org/>
