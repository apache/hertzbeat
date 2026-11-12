---
id: 1.9.1-update
title: 如何升级到 1.9.1
sidebar_label: 1.9.1 升级指南
---

## HertzBeat 1.9.1 升级指南

本次更新包含大量安全加固和 Bug 修复，不涉及数据库表结构变更，强烈建议 1.9.0 用户升级。

:::warning 升级前请先处理以下变化

- **管理端要求账号具有精确的 `admin` 角色。** 原有 `user`、`guest` 和其他非管理员账号将无法使用管理界面和 API。升级前，请手动为获准管理此 HertzBeat 实例的人员授予 `admin`，不要批量提升所有账号。
- **随 1.9.1 提供的 `application.yml` 默认关闭 Digest 摘要认证。** 替换镜像或安装包不会改动已挂载或保留的配置文件，因此旧文件 `sureness.auths` 中的 `digest` 条目仍会生效。请检查管理端实际使用的配置文件；如果要关闭 Digest，只移除这一项，保留其他需要的认证方式和密钥，然后重启并验证。
:::

本指南适用于从正式发布的 HertzBeat 1.9.0 升级到正式发布的 1.9.1。管理端和 Collector 请使用同一发行版中的配套制品。请等 1.9.1 官方制品发布后再用于生产环境。

经核对，正式版 `v1.9.0` 与已验证的 1.9.1 源码之间没有新增 Flyway 迁移文件，本次升级没有新增 Flyway SQL 迁移文件，但凭据迁移可能更新已有数据库记录，账号权限和当前生效的认证配置仍需按上方说明检查和调整。

## 1. 备份当前部署

先记录当前镜像或安装包、启动参数、挂载路径和 Collector 版本，并保留 1.9.0 制品，以便回滚。

备份元数据库和部署文件，包括 `application.yml`、`sureness.yml`、证书和密钥、`compose.yaml`、`.env`、Kubernetes 清单、ConfigMap 和 Secret。复制内置 H2 数据库前先停止 HertzBeat；MySQL 或 PostgreSQL 请使用一致性备份方式。也要备份 `define/` 中的自定义文件和 `ext-lib/` 中的自定义 JAR。妥善保护可能包含凭据或私钥的备份。

## 2. 停止当前服务

安排维护窗口，在替换文件或修改挂载配置前停止管理端。如果部署了远程 Collector，也要安排升级到同一 1.9.1 发行版，并在维护窗口结束前确认它们重新连接。

## 3. 升级 Docker 部署

保留当前数据卷和配置挂载，不要运行 `docker compose down -v`。

对于 Compose 部署，等官方镜像发布后，将 HertzBeat 镜像改为 `apache/hertzbeat:1.9.1`。保留现有卷、环境变量、端口和密钥引用，再重建服务：

```bash
docker compose config
docker compose pull hertzbeat
docker compose up -d hertzbeat
docker compose logs --follow hertzbeat
```

如果通过 `docker run` 启动容器，先用 `docker inspect hertzbeat` 记录挂载和卷名称。拉取新镜像后，停止并移除旧容器，但不要删除卷；然后使用保存的命令重新启动，只把镜像改为新版本。匿名卷要按记录的卷名称重新挂载；只重复 `-v /容器内路径` 会创建一个新的空卷。

```bash
docker pull apache/hertzbeat:1.9.1
docker stop hertzbeat
docker rm hertzbeat
# 使用保存的 docker run 命令重新启动，只将镜像改为 apache/hertzbeat:1.9.1。
```

`docker rm` 不要加 `-v`。

## 4. 升级安装包部署

以下示例使用 `/opt/hertzbeat`，请替换为实际安装路径。使用部署对应的停止命令。标准安装包可使用：

```bash
cd /opt/hertzbeat-1.9.0
./bin/shutdown.sh
```

将完整的 1.9.1 安装包解压到新目录，例如 `/opt/hertzbeat-1.9.1`。以新包的 `config/` 文件为基础，合并部署专用配置和密钥。如果使用内置 H2，将已停止服务的 `data/` 目录复制到新目录；如果使用外部数据库，请确认新安装能访问已备份的数据库。

把核对过的自定义模板和 JAR 放入新目录的 `define/`、`ext-lib/`。保留新包中的 `bin/`、`lib/`，不要从 1.9.0 复制这两个目录，也不要只替换主 JAR。然后启动新安装包：

```bash
cd /opt/hertzbeat-1.9.1
./bin/startup.sh
```

## 5. 合并并检查配置

以 1.9.1 的 `sureness.yml` 为基础，谨慎合并已核对的账号与策略配置。为获准的管理员手动设置精确的 `admin` 角色，保留账号原有标识和凭据，不要用旧文件覆盖整份新配置。旧 token 不能绕过角色校验，也不会获得 `admin`；管理端重启后，获准的管理员应重新登录。

检查管理端实际挂载的 `application.yml`。1.9.1 随附配置使用 Basic 和 JWT，默认不启用 Digest。如果你希望采用这一设置，生效配置的 `sureness.auths` 应包含 `basic` 和 `jwt`，不包含 `digest`：

```yaml
sureness:
  auths: [basic, jwt]
```

如果确实需要 Digest，请在保留部署所需其他认证方式的同时，将它留在生效列表中：

```yaml
sureness:
  auths: [basic, jwt, digest]
```

修改旧配置时，只调整符合你策略所需的认证条目，并保留 `sureness.jwt.secret` 等设置。Digest 是 HTTP 摘要质询响应认证，不会加密密码或网络流量；传输保密请使用 TLS。修改后重启管理端。

保留原有 `common.secret`；修改它可能导致已存储的凭据无法读取。请先在测试环境验证掩码值编辑、密码替换、监控导入导出及后续采集。掩码导出不包含原始密钥，需要时须重新提供。权限边界参见[管理员迁移](../help/admin_only_migration)和[安全模型](../help/security_model)。

## 6. 验证升级

检查管理端启动日志，确认没有数据库或配置错误。确认获准的管理员可以登录，非管理员账号不能访问管理功能。使用需要认证的端点检查实际认证行为，并确认 Digest 状态符合当前配置；仅检查公开路径无法判断 Digest 是否关闭。

将远程 Collector 升级到同一官方 1.9.1 发行版，确认每个 Collector 重新连接，并检查一个有代表性的监控对象是否收到新数据。端口 `1158` 承载管理端与 Collector 之间的传输，只允许需要连接的 Collector 来源网络访问。管理账号变化不会改变现有 Collector 传输协议的认证方式。

## 7. 检查失败时回滚

停止 1.9.1 管理端和受影响的 Collector。恢复完整的 1.9.0 镜像或安装包、对应的配置和部署文件，以及备份的 `define/`、`ext-lib/` 内容。如果 1.9.1 运行期间写入过数据库，应先恢复升级前的一致性数据库备份，再启动 1.9.0。不要只替换 JAR 回滚。确认恢复后的服务正常前，保留备份。
