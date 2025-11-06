# HertzBeat Startup Module

## 概述

`hertzbeat-startup` 模块是为了实现 HertzBeat 项目的模块化重构而创建的启动模块。该模块专门负责应用的启动和初始化任务，将原本由 `hertzbeat-manager` 模块承担的启动职责分离出来，实现更好的关注点分离。

## 模块职责

该启动模块主要负责以下启动任务：

1. **主应用启动** - 通过 `HertzBeatApplication` 类作为主入口点
2. **系统配置初始化** - 通过 `SystemConfigInitializer` 初始化系统配置、JWT密钥、AES密钥等
3. **调度系统初始化** - 通过 `SchedulerSystemInitializer` 初始化收集器状态和监控任务
4. **Netty服务器启动** - 通过 `NettyServerInitializer` 启动集群通信服务器

## 架构设计

### 原有架构问题
- `manager` 模块既负责业务逻辑又负责启动，职责不够清晰
- 启动代码散布在多个文件中，不利于维护

### 重构后的架构
```
hertzbeat-startup/
├── src/main/java/org/apache/hertzbeat/startup/
│   ├── HertzBeatApplication.java          # 主启动类
│   ├── config/
│   │   └── SystemConfigInitializer.java   # 系统配置初始化
│   └── scheduler/
│       ├── SchedulerSystemInitializer.java  # 调度系统初始化
│       └── NettyServerInitializer.java     # Netty服务器初始化
└── pom.xml
```

## 使用方式

### 主入口点
```java
// 原来的启动方式
public static void main(String[] args) {
    SpringApplication.run(Manager.class, args);
}

// 现在的启动方式
public static void main(String[] args) {
    SpringApplication.run(HertzBeatApplication.class, args);
}
```

### 启动顺序
1. `HertzBeatApplication` 作为主启动类启动Spring Boot应用
2. `SystemConfigInitializer` (最高优先级 +2) 初始化系统配置
3. `SchedulerSystemInitializer` (最低优先级 -1) 初始化调度系统
4. `NettyServerInitializer` (最低优先级) 启动Netty服务器

## 迁移说明

### 从 Manager 模块迁移的组件
1. **启动主类** - `Manager.java` → `HertzBeatApplication.java`
2. **配置初始化** - `ConfigInitializer.java` → `SystemConfigInitializer.java`
3. **调度初始化** - `SchedulerInit.java` → `SchedulerSystemInitializer.java`
4. **Netty服务器** - `ManageServer.java` → `NettyServerInitializer.java`

### Manager 模块的变化
- 移除了所有启动相关的代码
- 保留 `Manager.java` 作为 Spring Boot 配置类
- 专注于业务逻辑处理

## 资源文件迁移

### 迁移到 startup 模块的资源
- **应用配置文件** - `application*.yml`（包含dev、test、mysql、pg等配置）
- **数据库迁移脚本** - `db/migration/`（支持H2、MySQL、PostgreSQL）
- **启动横幅** - `banner.txt`
- **安全配置** - `sureness.yml`

### 保留在 manager 模块的资源
- **监控应用定义** - `define/app-*.yml`（各种监控应用的定义文件）
- **告警模板** - `templates/`（告警通知模板文件）

## 依赖关系

### 当前依赖
- `spring-boot-starter` - Spring Boot核心
- `spring-boot-starter-web` - Web应用支持
- `spring-boot-starter-data-jpa` - 数据持久化
- `flyway-core` - 数据库迁移核心
- `flyway-mysql` - MySQL数据库迁移支持
- `flyway-database-postgresql` - PostgreSQL数据库迁移支持
- `h2database` - H2数据库（默认）
- `hertzbeat-common` - 通用组件
- `hertzbeat-base` - 基础组件
- `hertzbeat-warehouse` - 数据仓库
- `hertzbeat-alerter` - 告警模块
- `hertzbeat-remoting` - 远程通信
- `hertzbeat-manager` - 管理模块（业务逻辑）

### 注意事项
由于启动模块需要访问管理模块的服务和配置，存在对 `hertzbeat-manager` 的依赖。在实际部署时，需要确保依赖的正确性。

## 配置属性

### 系统配置相关
- `sureness.jwt.secret` - JWT密钥配置
- `common.secret` - AES密钥配置

### 调度器相关
- `scheduler.server.enabled` - 是否启用Netty服务器
- `scheduler.server.port` - Netty服务器端口
- `scheduler.server.idleStateEventTriggerTime` - 空闲状态触发时间

## 优势

1. **职责分离** - 启动逻辑与业务逻辑分离，模块职责更加清晰
2. **易于维护** - 所有启动相关代码集中在一个模块中
3. **可扩展性** - 新的启动功能可以轻松添加到启动模块
4. **向后兼容** - 保持了原有的配置和功能不变

## 注意事项

1. **依赖管理** - 需要正确处理启动模块与业务模块之间的依赖关系
2. **启动顺序** - 确保各个初始化组件按照正确的顺序执行
3. **配置传递** - 启动模块需要能够访问业务模块的配置和服务
4. **测试验证** - 重构后需要充分测试启动流程的正确性

## 总结

通过创建 `hertzbeat-startup` 模块，我们成功地将启动职责从业务模块中分离出来，实现了更清晰的模块划分。这种设计使得：

- 启动逻辑更加集中和易于维护
- 业务模块可以专注于业务逻辑
- 整体架构更加模块化和可扩展
- 保持了原有功能的完整性和稳定性

这是一个典型的关注点分离重构实践，提高了代码的可维护性和可扩展性。