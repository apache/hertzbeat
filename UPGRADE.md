<!--
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements. See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Upgrading to HertzBeat 1.9.1 / 升级到 HertzBeat 1.9.1

## English

1.9.1 intentionally changes account permission compatibility: only accounts
with the `admin` role can sign in to management. Existing `user`, `guest`, and
other non-admin roles no longer grant management access, including when they
remain in an external `sureness.yml`. Existing sessions and tokens do not bypass
this restriction. Accounts are not automatically promoted or deleted.

Before upgrading:

1. Back up the relational database, monitoring templates and deployment configuration.
   Rehearse the upgrade and restore procedure in a test environment first.
2. Inventory accounts and automation tokens. Have a deployment administrator
   manually edit the deployed `sureness.yml` and assign `admin` only to confirmed
   trusted operators. Multiple independent usernames may have `admin`.
   Accounts that are not granted `admin` cannot continue using management.
3. An admin has management access across the whole instance. This release does
   not provide resource or credential isolation between administrators. Continue
   to protect the configuration and credentials; existing secret masking remains.
4. Preserve your deployment configuration rather than replacing it with the
   packaged defaults. Restart after the manual account changes, sign in again,
   and verify management access and automation tokens. Monitoring configuration
   imports and exports require `admin`.
5. Validate representative monitors, alert delivery and any separately deployed
   collectors before returning the installation to service. Public status pages
   and ingestion endpoints retain their own access policies.

This maintenance update fixes existing behavior; it does not introduce the 2.0
frontend, tenant model, new monitoring protocols or new AI configuration options.

## 中文

1.9.1 有意改变了账号权限兼容性：只有具有 `admin` 角色的账号才能登录管理平台。
原有 `user`、`guest` 和其他非 admin 角色不再具有管理权限，即使外置
`sureness.yml` 中仍保留这些配置也不生效。旧会话和 token 不能绕过此限制。
升级不会自动提升或删除账号。

升级前请完成：

1. 备份关系数据库、监控模板和部署配置，先在测试环境验证升级和恢复流程。
2. 盘点账号与自动化 token，由部署管理员手动修改实际使用的 `sureness.yml`，
   仅为确认可信的运维人员赋予 `admin`。可以为多个不同用户名配置 `admin`；
   不授予 admin 的账号不能继续使用管理平台。
3. admin 拥有全实例管理权限。平台不提供管理员之间的资源或凭据隔离，
   请继续保护配置与凭据；原有秘密掩码保护保留。
4. 保留自己的部署配置，不要直接用发行包默认配置覆盖。手工调整账号后重启，
   重新登录并验证管理权限及自动化 token。监控配置导入、导出都要求 admin。
5. 恢复使用前验证代表性监控、告警通知和独立部署的采集器。
   公开状态页和采集上报入口继续遵循各自的访问策略。

本维护版修复已有功能，不引入 2.0 前端、租户模型、新监控协议或新的 AI 配置项。
