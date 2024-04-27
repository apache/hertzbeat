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

    - 新建 `PR` 后需要在 `PR` 页面的 Github Development 按钮处关联已存在的对应 `ISSUE`(若无建议新建对应ISSUE)

    - 标题命名格式(英文，小写)   
      `[feature/bugfix/doc/improve/refactor/bug/cleanup] title`

2. 添加描述信息

    - 新建 `PR` 时请仔细描述此贡献，描述文档和代码同样重要。审阅者可以从描述中，而不仅仅是从代码中，了解问题和解决方案。
    - 勾选是否完成了对应的 Checklist。

3. 建议一次 `PR` 只包含一个功能/一种修复/一类改进/一种重构/一次清理/一类文档等

4. 提交消息(英文，小写，无特殊字符)  
   消息的提交应遵循与 `PR` 类似的模式：`[feature/bugfix/doc/improve/refactor/bug/cleanup] title` 

## 2 代码检查样式

- 后端代码规范 Maven 插件：`checkstyle`
  后端运行 `mvn checkstyle:checkstyle`

- 前端代码格式化插件 `eslint`
  前端运行 `npm run lint:fix`

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



### 3.2 常量变量定义

1. 多余的字符串应提取为常量
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

2. 确保代码的可读性和直观性

- `annotation` 符号中的字符串不需要提取为常量。

- 被引用的 `package` 或 `resource` 名称不需要提取为常量。

3. 未被重新分配的变量也必须声明为 <mark> final </mark> 类型。

4. 关于 `constant/variable` 行的排序顺序

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

## 4 日志

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

## 5 测试

1. 建议使用 `JUnit5` 进行测试用例的准备。

2. 实现的接口需在`e2e`模块下编写`e2e`测试用例脚本。


## 参考资料
- https://site.mockito.org/
- https://alibaba.github.io/p3c/
- https://rules.sonarsource.com/java/
- https://junit.org/junit5/
- https://streampark.apache.org/
