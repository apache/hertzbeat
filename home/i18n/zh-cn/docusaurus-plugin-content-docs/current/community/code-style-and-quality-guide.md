---
id: 'code_style_and_quality_guide'
title: '代码风格和质量指南'
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


## 1 拉取请求与变更规则

1. `ISSUE`/`PR`(拉取请求) 的引导和命名

    - 确保 `PR` 与 `ISSUE` 相对应。
   > **注意**：`Hotfix` 问题不需要遵循此规则，例如修复 `JavaDoc` 或 `document` 文件中的拼写错误。

    - 标题命名格式  
      当命名 `PR` 时，可以参考拉取请求的 `[ISSUE-XXXX][Feature/Improve/Refactor/Bug/Cleanup] Title`，
      其中 `ISSUE-XXXX` 应替换为实际的 `ISSUE` 编号。
        - 第二部分描述了 `PR` 的类型，例如新功能、改进、重构等。
        - 如果所有对 `PR` 的更改都在某个模块或组件内，则可以在提交消息中指示。

2. 描述

    - 请填写 `PR` 模板以描述贡献。这样，审阅者可以从描述中，而不仅仅是从代码中，了解问题和解决方案。
    - 确保描述足以说明 `PR` 所解决的问题。
    - 小的更改不需要过多的描述。
    - 在理想情况下，问题描述在 `ISSUE` 中，大部分描述都是从那里复制的。

3. 尝试将更改分解为纯类型的更改

    - 建议 `PR` 应将诸如 `Cleanup`、`Refactor`、`Improve` 和 `Feature` 之类的更改排列到分隔的 `PRs`/`Commits` 中。
    - 这样，审阅者可以独立查看清理和重构，并确保这些更改不会更改行为。
    - 然后，审阅者可以独立审查核心更改，并确保它们是干净和健壮的更改。
    - 在极端情况下，如果需要回滚提交，它可以为版本回滚选择提供最佳的粒度。
    - 此外，重大贡献应分解为一组可以独立审查的独立更改。

4. 提交消息  
   消息的提交应遵循与 `PR` 类似的模式：`[ISSUE-XXXX][Feature/Improve/Refactor/Cleanup] 拉取请求的标题`。

    - `[ISSUE-xxxx1][Improve(ment)] 改进 ...`
    - `[ISSUE-xxxx2][Refactor] 重构 ...`
    - `[ISSUE-xxxx3][Feature] 支持 ...`
    - `[ISSUE-xxxx4][Bug] 修复  ...`
    - `[ISSUE-xxxx5][Feature][subtask] 支持 ...`
    - `[Hotfix][module_name] 修复 xxx 注释 ...`

> **注意**：尝试使用 git 历史记录而不是带注释的代码（不是强制的）

## 2 代码检查样式

- 后端代码格式化 Maven 插件：`spotless`
  在安装插件后，只需在项目仓库根目录中运行 `mvn spotless:apply`。

- 后端代码规范 Maven 插件：`checkstyle`
  在安装插件后，只需运行 `mvn checkstyle:checkstyle`。

- 前端代码格式化插件 `eslint`
    - 原始命令是 `npx eslint --cache --max-warnings 0 "{src,mock}/**/*.{vue,ts,tsx}" --fix`
    - 封装为 `npm run lint:eslint`

## 3 编程规范

### 3.1 命名风格

1. 优先为变量命名选择名词，这样更容易区分`变量`或`方法`。
   ```java
     Cache<String> publicKeyCache;
   ```

2. 变量的拼音缩写是禁止的（排除地名等名词），例如chengdu。

3. 推荐的变量名以 `类型` 结尾。
   对于 `Collection/List` 类型的变量，取 `xxxx` （复数表示多个元素）或以 `xxxList` （特定类型）结束。
   对于 `map` 类型的变量，清晰地描述 `key` 和 `value`：
   ```java
     Map<Long, User> idUserMap;
     Map<Long, String> userIdNameMap;
   ```

4. 通过其名称直观地知道变量的类型和含义。
   方法名称应首先以动词开始，如下所示：
   ```java
     void computeVcores(Object parameter1);
   ```
   > 注意：在 `Builder` 工具类中不必严格遵循这项规则。

5. 数据库层（非服务层）的基本 `CRUD` 的方法名称应根据 `com.baomidou.mybatisplus.core.mapper.BaseMapper` 的名称统一标准化：

   - 如果执行数据库查询操作，方法的名称应以 `select` 开头。

     当查询单条记录时可以使用`selectXxx`，例如`selectApp`
   
     当查询多条记录时可以使用`selectXxxs`表示集合结果，例如`selectApps`，如果实体以`s`结尾，可以使用`List`如`selectStatusList`；

     如果是分页结果，则可以使用`selectPage`；如果是`Map`结果，建议参考`Map`命名规则如`selectIdUserMap`
   
     当查询包含具体条件时可以使用`selectXxxByXxx`命名，例如`listById`、`selectAppsByProjectId`
     
     > 如遇到太长的实体可以酌情缩写，原则是“见名知意”且做到不啰嗦，例如`selectApplications`缩写为`selectApps`，但如果没有合适的缩写，不建议缩写
     > 如果是`Mapper`查询`selectRecentK8sClusterIds`，则也可以采取`selectList`命名

    - 如果执行数据库的 <mark> 更新 </mark> 语句操作，方法的名称应以 `update` 开头。
    - 如果执行数据库的 <mark> 插入 </mark> 语句操作，方法的名称应以 `insert` 开头。
    - 如果执行数据库的 <mark> 删除 </mark> 语句操作，方法的名称应以 `delete` 开头。

6. 服务层的基本 `CRUD` 方法命名应参考 `com.baomidou.mybatisplus.extension.service.IService`：

    - 如果执行数据库的 <mark> 选择 </mark> 操作来查询多个记录，方法的名称应以 `list` 开头，例如 `listByIds`、`listByXxx`。
    - 如果执行数据库的 <mark> 选择 </mark> 操作查询单个记录，方法的名称应以 `get` 开头，例如 `getByName` 和 `getOne`。
    - 如果执行数据库的 <mark> 更新 </mark> 操作，方法的名称应以 `update` 开头。
    - 如果执行数据库的 <mark> 插入 </mark> 操作，方法的名称应以 `save` 开头。
    - 如果执行数据库的 <mark> 删除 </mark> 操作，方法的名称应以 `remove` 开头。

7. 参数的命名

    - 最好保持同一接口中相同类型的参数的命名一致。

### 3.2 常量变量定义

1. 将所有类的 `serialVersionUID` 设置为 `1L`，遵循 `Flink` 的 `serialVersionUID`。

    - 负面示例：
      ```java
        private static final long serialVersionUID = -8713837118340960775L;
      ```

    - 正面示例：
      ```java
       private static final long serialVersionUID = 1L;
      ```

2. 多余的字符串应提取为常量
   >如果一个常量被硬编码两次或多次，请直接提取它为常量并更改相应的引用。
   通常，`log` 中的常量可以忽略提取。

    - 负面示例：

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

    - 正面示例：

      > 字符串提取为常量引用。

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

3. 确保代码的可读性和直观性

- `annotation` 符号中的字符串不需要提取为常量。

- 被引用的 `package` 或 `resource` 名称不需要提取为常量。

4. 未被重新分配的变量也必须声明为 <mark> final </mark> 类型。

5. 关于 `constant/variable` 行的排序顺序

   按以下顺序对类中的变量行进行排序：
    1. `public static final V`, `static final V`,`protected static final V`, `private static final V`
    2. `public static v`, `static v`,`protected static v`, `private static v`
    3. `public v`, `v`, `protected v`, `private v`

### 3.3 方法规则

1. 按照 `public`、`protected`、`private` 的顺序对类中的方法进行排序。

   类的静态方法可以放在非静态方法之后，并根据一致的方法可见性进行排序。

2. 当方法有限制时，方法的参数和返回值需要用 `@Nonnull` 或 `@Nullable` 注释和约束进行注释。

   例如，如果参数不能为 null，最好添加一个 `@Nonnull` 注释。如果返回值可以为 null，则应首先添加 `@Nullable` 注释。

   <mark> 注意：包名为 <code>javax.validation.requirements </code> </mark>

3. 如果方法中的代码行数太多，请尝试在适当的点上使用多个子方法来分段方法体。

   一般来说，需要坚持以下原则：
    - 便于测试
    - 有好的语义
    - 易于阅读

   此外，还需要考虑在组件、逻辑、抽象和场景等方面的切割是否合理。

   > 然而，目前还没有明确的演示定义。在演变过程中，我们将为开发者提供更多的示例，以便他们有更清晰的参考和理解。


### 3.4 集合规则

1. 对于返回的 `collection` 值，除非有特殊的 `concurrent` (如线程安全)，总是返回 `interface`，例如：

    - 如果使用 `ArrayList`，则返回 <mark> List </mark>
    - 如果使用 `HashMap`，则返回 <mark> Map </mark>
    - 如果使用 `HashSet`，则返回 <mark> Set </mark>

2. 如果存在多线程，可以使用以下声明或返回类型：

  ```java
    private CurrentHashMap map;
    public CurrentHashMap funName();
  ```

3. 使用 `isEmpty()` 而不是 `length() == 0` 或者 `size() == 0`

   - 负面示例：

     ```java
     if (pathPart.length() == 0) {
       return;
     }
     ```

   - 正面示例：

     ```java
     if (pathPart.isEmpty()) {
       return;
     }
     ```

### 3.5 并发处理

1. 需要管理 `线程池`，使用统一的入口点获取 `线程池`。

   <mark> 注意：在演变过程中，我们将为开发者提供更多的示例，以便他们有更清晰的参考和理解。 </mark>

2. `线程池` 需要进行资源约束，以防止因处理不当导致的资源泄露。

### 3.6 控制/条件语句

1. 避免因不合理的 `条件/控制` 分支顺序导致：

    - 多个代码行的 `深度` 为 `n+1`
    - 多余的行

一般来说，如果一个方法的代码行深度由于连续嵌套的 `if... else..` 超过了 `2+ Tabs`，那么应该考虑试图
- `合并分支`，
- `反转分支条件`
- `提取私有方法`

以减少代码行深度并提高可读性，例如：
- 联合或将逻辑合并到下一级调用中
    - 负面示例：
      ```java
        if (isInsert) {
          save(platform);
        } else {
           updateById(platform);
        }
       ```
    - 正面示例：
      ```java
        saveOrUpdate(platform);
      ```
- 合并条件
    - 负面示例：
      ```java
        if (expression1) {
          if(expression2) {
              ......
          }
        }
   ```  
  - 正面示例：  
     ```java
      if (expression1 && expression2) {
        ......
      }
     ```
- 反转条件
    - 负面示例：

        ```java
          public void doSomething() {
           // 忽略更深的代码块行
           // .....
           if (condition1) {
              ...
           } else {
              ...
           }
          }
        ```

    - 正面示例：

      ```java
        public void doSomething() {
         // 忽略更深的代码块行
         // .....
         if (!condition1) {
            ...
            return;
         }
         // ...
        }
      ```
- 使用单一变量或方法减少复杂的条件表达式
    - 负面示例：
       ```java
         if (dbType.indexOf("sqlserver") >= 0 || dbType.indexOf("sql server") >= 0) {
          ...
         }
       ```

    - 正面示例：
       ```java
         if (containsSqlServer(dbType)) {
           ....
         }
         //.....
         // containsSqlServer的定义
       ```

> 在未来，使用 `sonarlint` 和 `better highlights` 检查代码深度看起来是个不错的选择。

### 3.7 代码注释规则

1. 方法缺少注释：

    - `When`：该方法何时可以被调用
    - `How`：如何使用此方法以及如何传递参数等
    - `What`：此方法实现了哪些功能
    - `Note`：在调用此方法时开发人员应注意什么

2. 缺少必要的类头部描述注释。

   添加 `What`，`Note` 等，如上述 `1` 中提到的。

3. 在接口中的方法声明必须被注释。

    - 如果实现的语义和接口声明的注释内容不一致，则具体的实现方法也需要用注释重写。

    - 如果方法实现的语义与接口声明的注释内容一致，则建议不写注释以避免重复的注释。

4. 在注释行中的第一个词需要大写，如 `param` 行，`return` 行。
   如果特殊引用作为主题不需要大写，需要注意特殊符号，例如引号。

### 3.8 Java Lambda 表达式

1. 更倾向于使用 `non-capturing` lambda（不包含对外部范围的引用的lambda）。
   Capturing lambda 在每次调用时都需要创建一个新的对象实例。`Non-capturing` lambda 可以为每次调用使用相同的实例。

    - 负面示例：

      ```java
        map.computeIfAbsent(key, x -> key.toLowerCase())
      ```

    - 正面示例：

      ```java
       map.computeIfAbsent(key, k -> k.toLowerCase());
      ```

2. 考虑使用方法引用而不是内联lambda

    - 负面示例：

      ```java
        map.computeIfAbsent(key, k-> Loader.load(k));
      ```

    - 正面示例：

      ```java
        map.computeIfAbsent(key, Loader::load);
      ```

### 3.9 Java Streams

- 在任何对性能敏感的代码中避免使用 Java Streams。

- 使用 Java Streams 的主要动机是为了提高代码的可读性。因此，它们可以在代码的某些部分中很好地匹配，这些部分不是数据密集型的，而是处理协调。

- 即使在后一种情况下，也试图限制范围到一个方法，或者一个内部类中的几个私有方法。

### 3.10 前置条件检查

1. 使用统一的 `Utils.requireXXX` 来完成前提的验证，如果可能的话，用新的前置条件检查替换 `AlertXXException.throwIfXXX`。

### 3.11 StringUtils

1. 使用 `StringUtils.isBlank` 而不是 `StringUtils.isEmpty`

    - 负面示例：

       ```java
       if (StringUtils.isEmpty(name)) {
      return;
       }
       ```

    - 正面示例：

      ```java
      if (StringUtils.isBlank(name)) {
      return;
      }
      ```

2. 使用 `StringUtils.isNotBlank` 而不是 `StringUtils.isNotEmpty`

    - 负面示例：

       ```java
       if (StringUtils.isNotEmpty(name)) {
         return;
       }
       ```

    - 正面示例：

      ```java
      if (StringUtils.isNotBlank(name)) {
        return;
      }
      ```

3. 使用 `StringUtils.isAllBlank` 而不是 `StringUtils.isAllEmpty`

    - 负面示例：

       ```java
       if (StringUtils.isAllEmpty(name, age)) {
         return;
       }
       ```

    - 正面示例：

      ```java
      if (StringUtils.isAllBlank(name, age)) {
        return;
      }
      ```

### 3.12 `Enum` 类

1. 枚举值比较

    - 负面示例：

       ```java
       if (status.equals(JobStatus.RUNNING)) {
         return;
       }
       ```

    - 正面示例：

      ```java
      if (status == JobStatus.RUNNING) {
        return;
      }
      ```

2. 枚举类不需要实现 Serializable

    - 负面示例：

       ```java
       public enum JobStatus implements Serializable {
         ...
       }
       ```

    - 正面示例：

      ```java
      public enum JobStatus {
        ...
      }
      ```

3. 使用 `Enum.name()` 而不是 `Enum.toString()`

    - 负面示例：

       ```java
       System.out.println(JobStatus.RUNNING.toString());
       ```

    - 正面示例：

      ```java
      System.out.println(JobStatus.RUNNING.name());
      ```

4. 枚举类名称统一使用 Enum 后缀

    - 负面示例：

       ```java
       public enum JobStatus {
         ...
       }
       ```

    - 正面示例：

      ```java
      public enum JobStatusEnum {
        ...
      }
      ```

### 3.13 `Deprecated` 注解

  - 负面示例:

    ```java
    @deprecated
    public void process(String input) {
      ...
    }
    ```

  - 正面示例:

    ```java
    @Deprecated
    public void process(String input) {
      ...
    }
    ```

## 4 异常处理

`hertzbeat-console-service` 模块是处理用户请求的核心模块。
我们努力提供最好的用户体验是非常必要的。   
因此，我们引入了 [AbstractApiException](https://github.com/apache/incubator-hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/AbstractApiException.java)
及其子类以获得更友好的交互效果。非 `AbstractApiException` 被视为内部服务器错误，不需要通知用户交互细节。  
基于上述前提，我们需要注意处理 `AbstractApiException`。  
例如，在处理与用户操作错误或缺少数据错误的逻辑时，我们应该通过以下 `AbstractApiException` 的子类之一抛出异常：

- [ApiDetailException](https://github.com/apache/incubator-hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/ApiDetailException.java)
> 需要通知前端的异常消息，是一个详细的异常消息，例如 stackTrace 信息，通常伴随着大量的异常日志，
> 例如：`Failed to start job`，需要在前端显示异常(stackTrace 信息)。
- [ApiAlertException](https://github.com/apache/incubator-hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/ApiAlertException.java)
> 需要通知前端的异常消息，通常是一个简单、清晰的消息，例如：
> 1. 用户名已存在
> 2. 没有权限，请联系管理员
> 3. ...

- [AlertException](https://github.com/apache/incubator-hertzbeat/blob/dev/hertzbeat-console/hertzbeat-console-service/src/main/java/org/apache/hertzbeat/console/base/exception/AlertException.java)
> 在处理警报逻辑时需要通知前端的异常消息。
- 或者其他用于获得良好用户交互的异常。

除了处理异常的分类，我们最好使异常消息准确而简洁，并试图确保异常中遵循以下几点：

- 显示异常情况的当前状态。
- 显示异常情况的解决方案。
- 或其他适合的交互信息。

如果需要，请点击 [Issue-2325](https://github.com/apache/incubator-hertzbeat/issues/2325) 以获取更多关于该项的详细信息。

## 5 日志

1. 使用 `占位符` 进行日志输出：

    - 负面示例
      ```java
        log.info("Deploy cluster request " + deployRequest);
      ```
    - 正面示例
      ```java
        log.info("load plugin:{} to {}", file.getName(), appPlugins);
      ```

2. 打印日志时，注意选择 `日志级别`

   当打印日志内容时，如果传递了日志占位符的实际参数，必须避免过早评估，以避免由日志级别导致的不必要评估。

    - 负面示例：

      假设当前日志级别为 `INFO`：

      ```java
       // 忽略声明行。
       List<User> userList = getUsersByBatch(1000);
       LOG.debug("All users: {}", getAllUserIds(userList));
      ```

    - 正面示例：

      在这种情况下，我们应该在进行实际的日志调用之前提前确定日志级别，如下所示：

      ```java
       // 忽略声明行。
       List<User> userList = getUsersByBatch(1000);
       if (LOG.isDebugEnabled()) {
         LOG.debug("All ids of users: {}", getAllIDsOfUsers(userList));	
       }
       ```

## 6 测试

1. 对于用于 `测试` 的一些 `代码/变量`，您可以使用 `@VisableForTesting` 注解来指示。

2. 建议使用 `JUnit5` 进行测试用例的准备。

3. 使用 `AssertJ` 进行断言语句的开发。

4. 关于测试的实现。

    - 如果测试用例只测试一个不需要如 hadoop、远程 flink 会话集群等外部组件的 `独立` 类或方法，可以直接使用 `JUnit5` 和 `Mockito` 进行编写。

    - 如果测试用例需要一个 `真实的数据库`、环境或后端环境，
      但不需要与外部组件进行交互，建议直接继承 `SpringUnitTestBase`。

    - 如果测试用例需要 `真实的数据库、环境` 或 `后端环境`，
      但需要与外部组件 (`远程 Flink 会话集群`、`Hadoop 集群`) 进行交互，建议通过直接继承 `SpringIntegrationTestBase` 来编写测试用例。

5. 只建议在关键测试环节上使用集成测试，以避免使 `CI` 的开销时间过长和资源负荷过重。

## 参考资料
- https://site.mockito.org/
- https://flink.apache.org/zh/how-to-contribute/code-style-and-quality-preamble/
- https://alibaba.github.io/p3c/
- https://rules.sonarsource.com/java/
- https://joel-costigliola.github.io/assertj/index.html
- https://junit.org/junit5/