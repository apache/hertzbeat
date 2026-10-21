---
id: how_to_verify_release
title: 版本物料的验证
sidebar_position: 4
---

## 验证候选版本

详细检查列表请参考 ASF 官方的[发布策略](https://www.apache.org/legal/release-policy.html)与[发布检查清单](https://infra.apache.org/release-publishing.html)

在浏览器中可访问版本内容 [https://dist.apache.org/repos/dist/dev/hertzbeat/](https://dist.apache.org/repos/dist/dev/hertzbeat/)

### 1. 下载候选版本到本地

> 需要依赖gpg工具，如果没有，建议安装gpg2

```shell
# 将 {version} 与 RC1 替换为本次投票的版本号和候选版本号，例如 1.9.0 与 RC2

# 如果本地有 svn，可以整个目录检出
svn co https://dist.apache.org/repos/dist/dev/hertzbeat/{version}-RC1/

# 或者直接下载单个物料文件
wget https://dist.apache.org/repos/dist/dev/hertzbeat/{version}-RC1/apache-hertzbeat-{version}-src.tar.gz

```

### 2. 验证上传的版本是否合规

> 开始验证环节，验证包含但不局限于以下内容和形式

#### 2.1 查看发布包是否完整

> 上传到dist的包必须包含源码包，二进制包可选

1. 是否包含源码包
2. 是否包含源码包的签名
3. 是否包含源码包的sha512
4. 如果上传了二进制包（含 native 采集器包），则每个包同样检查第 2、3 项

> **每一个**物料都必须有对应的 `.asc` 和 `.sha512`，一个都不能少。可以用下面的命令快速核对，
> 有输出就说明有物料缺失：
>
> ```shell
> for i in *.tar.gz *.zip; do
>   [ -e "$i.asc" ]    || echo "缺少签名: $i"
>   [ -e "$i.sha512" ] || echo "缺少校验和: $i"
> done
> ```

#### 2.2 检查gpg签名

首先导入发布人公钥。从svn仓库导入KEYS到本地环境。（发布版本的人不需要再导入，帮助做验证的人需要导入，用户名填发版人的即可）

##### 2.2.1 导入公钥

```shell
curl  https://downloads.apache.org/hertzbeat/KEYS > KEYS # 下载KEYS
gpg --import KEYS # 导入KEYS到本地
```

##### 2.2.2 关于信任公钥

:::tip 验证签名并不需要信任公钥
`gpg --verify` 对未信任的公钥同样会输出 `Good signature`，只是会附带一行提示：

```text
WARNING: This key is not certified with a trusted signature!
```

**这行 WARNING 是正常的，只要出现 `Good signature` 即视为通过。**

如果你确实想消除这个提示，可以按下面的方式设置信任级别。但请注意，`5 = ultimate` 在 GPG 语义中表示
“这是我自己的密钥”，把他人的公钥设为 ultimate 会污染本地信任网，一般选择 `4 = fully` 更合适。
:::

> 设置此次版本所使用 KEY 的信任级别（可选）

```shell
$ gpg --edit-key xxxxxxxxxx #此次版本所使用的KEY用户
gpg (GnuPG) 2.2.21; Copyright (C) 2020 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Secret key is available.
gpg> trust #信任
Please decide how far you trust this user to correctly verify other users' keys
(by looking at passports, checking fingerprints from different sources, etc.)

  1 = I don't know or won't say
  2 = I do NOT trust
  3 = I trust marginally
  4 = I trust fully
  5 = I trust ultimately
  m = back to the main menu

Your decision? 5 #选择5
Do you really want to set this key to ultimate trust? (y/N) y #选择y

gpg>

```

##### 2.2.3 检查签名

```shell
# 注意同时覆盖 *.zip，Windows 的 native 采集器包是 zip 格式，
# 只写 *.tar.gz 会静默跳过它
for i in *.tar.gz *.zip; do echo $i; gpg --verify $i.asc $i ; done
```

> 核对签名所用的 key 与投票邮件中声明的 PGP key ID 是否一致。只有 `Good signature` 而 key 对不上，
> 并不能说明物料是发布者签的。

检查结果

> 出现类似以下内容则说明签名正确，关键字：**`Good signature`**

```shell
apache-hertzbeat-${release_version}-src.tar.gz
gpg: Signature made XXXX
gpg:                using RSA key XXXXX
gpg: Good signature from "XXX <xxx@apache.org>"
```

#### 2.3 检查sha512哈希

> 本地计算sha512哈希后，验证是否与dist上的一致，如果上传二进制包，则同样需要检查二进制包的sha512哈希

```shell
for i in *.tar.gz *.zip; do echo $i; sha512sum --check "$i.sha512"; done

# macOS 上如果没有 sha512sum，可用系统自带的 shasum 替代
# for i in *.tar.gz *.zip; do echo $i; shasum -a 512 -c "$i.sha512"; done
```

> 每个物料输出 `OK` 即为通过：
>
> ```text
> apache-hertzbeat-{version}-src.tar.gz: OK
> ```

#### 2.4 检查二进制包

解压缩  `apache-hertzbeat-${release_version}-bin.tar.gz`

```shell
tar -xzvf apache-hertzbeat-${release_version}-bin.tar.gz
```

进行如下检查：

- [ ] 存在`LICENSE`和`NOTICE`文件
- [ ] `NOTICE`文件中的年份正确
- [ ] 所有文本文件开头都有ASF许可证
- [ ] 检查第三方依赖许可证：
- [ ] 第三方依赖的许可证兼容
- [ ] 所有第三方依赖的许可证都在`LICENSE`文件中声名
- [ ] 如果依赖的是Apache许可证并且存在`NOTICE`文件，那么这些`NOTICE`文件也需要加入到版本的`NOTICE`文件中
- [ ] .....

参考: [https://apache.org/legal/resolved.html](https://apache.org/legal/resolved.html)

#### 2.5 检查 Native 采集器包

Native 采集器包（`apache-hertzbeat-collector-native-{version}-*`）是**预编译的原生可执行文件**，
不适用下面的“源码编译验证”，需要单独检查。

```shell
tar -xzf apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz
cd apache-hertzbeat-collector-native-{version}-linux-amd64-bin
MANAGER_HOST=127.0.0.1 ./bin/startup.sh
tail -f logs/startup.log
```

进行如下检查：

- [ ] 存在 `LICENSE`、`NOTICE` 和 `licenses/` 目录
- [ ] 能够正常启动：日志出现 `Started Collector` 与 `Registered N collect strategies`
- [ ] 启动十几秒后进程仍然存活（**崩溃可能发生在 `Started Collector` 之后**，只看这一行不够）

:::caution Native 包有硬性运行环境要求
不满足时的表现是**进程瞬间退出、没有任何日志输出**，很容易被误判为物料损坏。遇到这种情况请先确认环境：

- **x86 包需要 CPU 支持 AVX2**：Intel Haswell（2013）及以后、AMD Zen（2017）及以后。部分 Atom 血统的低端芯片、
  Apple Silicon 上的 Rosetta 2、旧版 Windows on ARM 模拟均不支持
- **Linux 包需要 glibc ≥ 2.34**：Ubuntu 22.04+、Debian 12+、RHEL/Rocky 9+ 可用；
  Ubuntu 20.04、Debian 11、RHEL 8、CentOS 7 不可用
- **Windows 包需要** Windows 10 / Server 2016 及以上，并安装 Microsoft Visual C++ 2015-2022 可再发行组件包

环境不满足属于已知限制，不应据此投 -1；请在回复中说明你的验证环境。
:::

#### 2.6 源码编译验证

解压缩 `apache-hertzbeat-${release_version}-src.tar.gz`

```shell
cd apache-hertzbeat-${release_version}-src
```

编译源码: [https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package](https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package)

进行如下检查:

- [ ] 检查源码包是否包含由于包含不必要文件，致使tar包过于庞大
- [ ] 存在`LICENSE`和`NOTICE`文件
- [ ] `NOTICE`文件中的年份正确
- [ ] 只存在文本文件，不存在二进制文件
- [ ] 所有文件的开头都有ASF许可证
- [ ] 能够正确编译
- [ ] .....

参考: [https://apache.org/legal/resolved.html](https://apache.org/legal/resolved.html)

### 3. 邮件回复

如果发起了发布投票，验证后，可以参照此回复示例进行邮件回复

:::caution 注意
回复的邮件一定要带上自己检查了那些项信息，仅仅回复`+1 approve`，是无效的。

PMC 在 [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) HertzBeat 的社区投票时，请带上 binding 后缀，表示对 HertzBeat 社区中的投票具有约束性投票，方便统计投票结果。

:::

非PMC成员

```text
+1 (non-binding)
I checked:
    1. All download links are valid
    2. Checksums and signatures are OK for all artifacts, including the .zip
    3. LICENSE and NOTICE exist and are correct
    4. Built successfully from source on <你的操作系统和版本>
    5. Native collector package starts and registers its collect strategies
    6. ....
```

PMC成员

```text
+1 (binding)
I checked:
    1. All download links are valid
    2. Checksums and signatures are OK for all artifacts, including the .zip
    3. LICENSE and NOTICE exist and are correct
    4. Built successfully from source on <你的操作系统和版本>
    5. Native collector package starts and registers its collect strategies
    6. ....
```

发现问题时，请给出具体的复现信息，便于发布者定位：

```text
-1 (binding)

The <物料名> is missing its .sha512 checksum.

Checked on: macOS 26 / arm64
Steps:
    1. svn co https://dist.apache.org/repos/dist/dev/hertzbeat/1.9.0-RC2/
    2. for i in *.tar.gz *.zip; do [ -e "$i.sha512" ] || echo "missing: $i"; done
Output:
    missing: apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip
```

---
