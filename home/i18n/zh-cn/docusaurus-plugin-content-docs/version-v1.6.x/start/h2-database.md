---
id: h2-database
title: 使用 H2 数据库（仅用于测试）
sidebar_label: H2（仅用于测试）
---

Apache HertzBeat 默认使用嵌入式 H2 数据库存储元数据(监控任务，告警数据，配置等)。  此默认设置旨在用于快速启动、演示和本地开发。

:::caution 不适用于生产环境
H2 并非设计为在对抗性环境中运行，HertzBeat 的 H2 用法不建议用于生产部署。

如果攻击者可以访问您的 H2 数据库（例如通过暴露的 H2 Web 控制台或任何其他允许执行 SQL 的路径），则 H2 的 `CREATE ALIAS` 等功能可能会被滥用以执行任意 Java 代码，并可能完全控制 HertzBeat 服务器。

有关背景信息，请参阅 H2 安全文档：https://h2database.com/html/security.html
:::

## 生产建议

使用生产级数据库代替 H2 作为 HertzBeat 元数据存储：

- MySQL：[使用 MYSQL 替换 H2 数据库存储元数据(可选)](./mysql-change)
- PostgreSQL：[使用 PostgreSQL 替换 H2 数据库存储元数据（可选）](./postgresql-change)

## 使用 H2 的安全方式（仅限沙盒）

如果您仍然选择使用 H2 运行 HertzBeat 进行测试，请保持部署沙盒化并尽量减少暴露：

1. 优先选择**嵌入/文件模式**（默认），避免在 TCP 服务器模式下运行 H2。
2. 不要将 H2 端点暴露给不受信任的网络。
3. 将 H2 数据存储视为**临时**存储（如果需要，备份/导出您的 HertzBeat 配置）。

## 默认数据源配置（示例）

使用 H2 时，您的 `application.yml` 通常如下所示：

```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    username: sa
    password: 123456
    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
    hikari:
      max-lifetime: 120000
```

> 注
> - 默认值可能因版本和打包而异。
>  - 如果您通过 Docker 运行，则应装载 `data/` 目录，以便您的本地测试数据持久存在。

## H2 Web 控制台（高风险）

H2 提供了一个 Web 控制台，可以针对您的数据库执行 SQL。  启用它会更容易意外地暴露强大的管理界面。

:::danger 不要在生产环境中启用
仅在沙盒环境中启用 H2 控制台进行本地临时故障排除。
:::

要启用它，请设置：

```yaml
spring:
  h2:
    console:
      path: /h2-console
      enabled: true
```

### 如果您启用控制台，请锁定它

- 确保它只能从 `localhost` 或严格控制的管理网络访问。
- 查看您的 `sureness.yml`：许多部署将 `/h2-console/**` 配置为未经验证的资源，以方便使用。  不要让它公开可访问。
- 如果您位于反向代理之后，请通过 IP 允许列表和/或附加身份验证来限制访问。
