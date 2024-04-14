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

    - Ensure that `PR` corresponds to `ISSUE`.
   > **Note**: `Hotfix` issue does not need to follow this rule, such as fixing spelling errors in `JavaDoc` or `document` files.

    - Title naming format  
      When naming `PR`, you can refer to the `[ISSUE-XXXX][Feature/Improve/Refactor/Bug/Cleanup] Title` of the pull request,
      where `ISSUE-XXXX` should be replaced with the actual `ISSUE` number.
        - The second part describes the type of `PR`, such as new features, improvement, refactor, etc.
        - If all changes to `PR` are within a certain module or component, they can be indicated in the commit message.

2. Description

    - Please fill in the `PR` template to describe the contribution. So that the reviewer can understand the problem and solution from the description, rather than just from the code.
    - Ensure that the description is sufficient to illustrate the problem addressed by the `PR`.
    - Small changes do not require too much description.
    - In an ideal scenario, the problem is described in `ISSUE`, and most of the description is copied from there.

3. Try to break down changes into pure types of changes

    - It's recommended that `PR` should be arranged changes such as `Cleanup`, `Refactor`, `Improve`, and `Feature` into separated `PRs`/`Commits`.
    - In this way, the reviewers can independently view cleaning and refactoring, and ensure that these changes do not change behavior.
    - Then, the reviewer can independently review the core changes and ensure that they are a clean and robust change.
    - In extreme cases, if a rollback commit is required, it can provide the optimal granularity for version rollback selection.
    - In addition, significant contributions should be split into a set of independent changes that can be reviewed independently.

4. Commit message  
   The commit of messages should follow a pattern similar to the `PR`: `[ISSUE-XXXX][Feature/Improve/Refactor/Cleanup] Title of the pull request`.

    - `[ISSUE-xxxx1][Improve(ment)] Improve ...`
    - `[ISSUE-xxxx2][Refactor] Refactor ...`
    - `[ISSUE-xxxx3][Feature] Support ...`
    - `[ISSUE-xxxx4][Bug] Fix  ...`
    - `[ISSUE-xxxx5][Feature][subtask] Support ...`
    - `[Hotfix][module_name] Fix xxx comments ...`

> **Note**: Try to use git history instead of annotated code (not mandatory)

## 2 Code Checkstyle

- Backend code formatting Maven plugin: `spotless`
  Just run `mvn spotless:apply` in the project repo root directory after installing the plugin.

- Backend code specification Maven plugin: `checkstyle`
  Just run `mvn checkstyle:checkstyle` after installing the plugin.

- Frontend code formatting plugin `eslint`
    - The original command is `npx eslint --cache --max-warnings 0 "{src,mock}/**/*.{vue,ts,tsx}" --fix`
    - Encapsulated as `npm run lint:eslint`

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

5. The methods name of basic `CRUD` of the database layer (non-service layer) should be uniformly standardized according to name `com.baomidou.mybatisplus.core.mapper.BaseMapper`:

    - If performing a database query operation, the method name should start with `select`.

      When querying a single record, you can use `selectXxx`, such as `selectApp`.

      When querying multiple records, you can use `selectXxxs` to indicate a collection result, such as `selectApps`. If the entity ends with `s`, you can use `List`, such as `selectStatusList`.

      If the result is paginated, you can use `selectPage`. If the result is a `Map`, it is recommended to follow the `Map` naming conventions, such as `selectIdUserMap`.

      When the query includes specific conditions, you can use `selectXxxByXxx` naming, such as `listById` or `selectAppsByProjectId`.

      > In cases of excessively long entity names, consider abbreviating judiciously. The principle is to be “clear and concise.” For example, `selectApplications` can be abbreviated to `selectApps`. However, if there is no suitable abbreviation, abbreviation is not recommended.
      > For `Mapper` queries like `selectRecentK8sClusterIds`, you can also adopt the `selectList` naming convention.

    - If perform a database <mark> update </mark> statement operation, the name of the method should be started with `update`
    - If perform a database <mark> insert </mark> statement operation, the name of the method should be started with `insert`
    - If perform a database <mark> delete </mark> statement operation, the name of the method should be started with `delete`

6. The methods name of basic `CRUD` of the service layer should be named as `com.baomidou.mybatisplus.extension.service.IService`:

    - If perform a database <mark> select </mark> operation to query multiple records, the name of the method should be started with a `list`, such as `listByIds`, `listByXxx`
    - If perform a database <mark> select </mark> operation to query a single record, the name of the method should be started with get, such as `getByName` and `getOne`
    - If perform a database <mark> update </mark> operation, the name of the method should be started with `update`
    - If perform a database <mark> insert </mark> operation, the name of the method should be started with `save`
    - If perform a database <mark> delete </mark> operation, the name of the method should be started with `remove`

7. Naming of parameters

    - It's best to maintain consistent parameter naming for parameters of the same type in the same interface.

### 3.2 Constant Variables Definition

1. Set the `serialVersionUID` of all classes to `1L`, following `Flink`'s `serialVersionUID`.

    - Negative demo:
      ```java
        private static final long serialVersionUID = -8713837118340960775L;
      ```

    - Positive demo:
      ```java
       private static final long serialVersionUID = 1L;
      ```

2. Redundant strings should be extracted as constants  
   >If a constant has been hardcoded twice or more times, please directly extract it as a constant and change the corresponding reference.
   In generally, constants in `log` can be ignored to extract.

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

3. Ensure code readability and intuitiveness

  - The string in the `annotation` symbol doesn't need to be extracted as constant.

  - The referenced `package` or `resource` name doesn't need to be extracted as constant.

4. Variables that have not been reassigned must also be declared as <mark> final </mark> types.

5. About the arrangement order of `constant/variable` lines  

   Sort the variable lines in the class in the order of
   1. `public static final V`, `static final V`,`protected static final V`, `private static final V`
   2. `public static v`, `static v`,`protected static v`, `private static v`
   3. `public v`, `v`, `protected v`, `private v`


### 3.3 Methods Rule

1. Sort the methods in the class in the order of `public`, `protected`, `private`

   Static methods of a class can be placed after non-static methods and sorted according to consistent method visibility.

2. When there are restrictions on the method, the parameters and returned values of the method need to be annotated with `@Nonnull` or `@Nullable` annotations and constraints.

   For example, if the parameter cannot be null, it is best to add a `@Nonnull` annotation. If the returned value can be null, the `@Nullable` annotation should be added first.

   <mark> Note: that the package name is <code>javax.validation.requirements </code> </mark>

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
          if(expression2) {
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
              ...
           } else {
              ...
           }
          }
        ```

    - Positive demo:

      ```java
        public void doSomething() {
         // Ignored more deeper block lines
         // .....
         if (!condition1) {
            ...
            return;
         }
         // ...
        }
      ```
- Using a single variable or method to reduce the complex conditional expression
    - Negative demo:
       ```java
         if (dbType.indexOf("sqlserver") >= 0 || dbType.indexOf("sql server") >= 0) {
          ...
         }
       ```

    - Positive demo:
       ```java
         if (containsSqlServer(dbType)) {
           ....
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
        ...
      }
      ```
   
   - Positive demo:
   
     ```java
     public enum JobStatus {
       ...
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
        ...
      }
      ```
   
   - Positive demo:
   
     ```java
     public enum JobStatusEnum {
       ...
     }
     ```

### 3.13 `Deprecated` Annotation

  - Negative demo:

    ```java
    @deprecated
    public void process(String input) {
      ...
    }
    ```

  - Positive demo:

    ```java
    @Deprecated
    public void process(String input) {
      ...
    }
    ```

## 4 Exception Processing

This `hertzbeat-console-service` module is the core module for processing user requests.
It's very necessary to strive to provide the best user experience.   
So, we introduced the [AbstractApiException](https://github.com/apache/hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/AbstractApiException.java)
and its subclasses to get more friendly interaction effect. Non-`AbstractApiException` is treated as internal server errors correspondingly, which needn't notify the interaction details to users.   
Based on the above premise, we need to pay attention to the handling of `AbstractApiException`.    
For example, we should throw an exception by one of followed subclasses of `AbstractApiException` when processing logic with the user operation errors or missing data errors:

- [ApiDetailException](https://github.com/apache/hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/ApiDetailException.java)
> An exception message that needs to be notified to front-end, is a detailed exception message, such as the stackTrace info, often accompanied by a large number of exception logs,
> e.g: `Failed to start job`, need to display the exception(stackTrace info) to front-end.
- [ApiAlertException](https://github.com/apache/hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/ApiAlertException.java)
> An exception message that needs to be notified to front-end, usually a simple, clear message, e.g:
> 1. Username already exists
> 2. No permission, please contact the administrator
> 3. ...

- [AlertException](https://github.com/apache/hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/AlertException.java)
> An exception message that needs to be notified to front-end when processing alert logic.
- Or others exceptions used to get fine users interaction.

In addition to handling the classification of exceptions, we'd better make the precise and concise exception message and try to ensure the follows in the exception:

- Display the current status of the abnormal case.
- Display the solutions to the abnormal case.
- Or others information fit the pretty interaction.

Please click [Issue-2325](https://github.com/apache/hertzbeat/issues/2325) for more details about the items if needed.

## 5 Log

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

## 6 Testing

1. For some of the `code/variables` used for `testing`, you can use `@VisableForTesting` annotation to indicate that

2. It's recommended to use `JUnit5` to develop test case preparation

3. Using `AssertJ` to develop assertions statements.

4. About the implementation of tests.

    - If the test case only tests an `independent` class or method that does not require external components such as hadoop,
      remote flink session cluster, etc., it can be written directly using `JUnit5` & `Mockito`.

    - If the test case needs a `real database`, environment or backend environment,
      but doesn't need to interact with external components, it's recommended to inherit directly from `SpringUnitTestBase`.

    - If the test case requires `a real database, environment` or `backend environment`,
      but needs to `interact with external components` (`Remote Flink session cluster`, `Hadoop cluster`),
      it's recommended to write the test case by directly inheriting `SpringIntegrationTestBase`.

5. It's only recommended to use integration tests on critical test links to avoid making the `CI` overhead time too long and the resource load too heavy.


## References
- https://site.mockito.org/
- https://flink.apache.org/zh/how-to-contribute/code-style-and-quality-preamble/
- https://alibaba.github.io/p3c/
- https://rules.sonarsource.com/java/
- https://joel-costigliola.github.io/assertj/index.html
- https://junit.org/junit5/
