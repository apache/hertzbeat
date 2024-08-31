---
id: how_to_verify_release
title: 版本物料的验证
sidebar_position: 4
---

## 验证候选版本

详细检查列表请参考官方的[check list](https://cwiki.apache.org/confluence/display/INCUBATOR/Incubator+Release+Checklist)

在浏览器中可访问版本内容 <https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/>

### 1. 下载候选版本到本地

> 需要依赖gpg工具，如果没有，建议安装gpg2

```shell
#如果本地有svn，可以clone到本地 
svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/${release_version}-${rc_version}/
#或者 直接下载物料文件
wget https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/${release_version}-${rc_version}/xxx.xxx

```

### 2. 验证上传的版本是否合规

> 开始验证环节，验证包含但不局限于以下内容和形式

#### 2.1 查看发布包是否完整

> 上传到dist的包必须包含源码包，二进制包可选

1. 是否包含源码包
2. 是否包含源码包的签名
3. 是否包含源码包的sha512
4. 如果上传了二进制包，则同样检查(2)-(4)所列的内容

#### 2.2 检查gpg签名

首先导入发布人公钥。从svn仓库导入KEYS到本地环境。（发布版本的人不需要再导入，帮助做验证的人需要导入，用户名填发版人的即可）

##### 2.2.1 导入公钥

```shell
curl  https://downloads.apache.org/incubator/hertzbeat/KEYS > KEYS # 下载KEYS
gpg --import KEYS # 导入KEYS到本地
```

##### 2.2.2 信任公钥

> 信任此次版本所使用的KEY

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
for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i ; done
```

检查结果

> 出现类似以下内容则说明签名正确，关键字：**`Good signature`**

```shell
apache-hertzbeat-xxx-incubating-src.tar.gz
gpg: Signature made XXXX
gpg:                using RSA key XXXXX
gpg: Good signature from "xxx @apache.org>"
```

#### 2.3 检查sha512哈希

> 本地计算sha512哈希后，验证是否与dist上的一致，如果上传二进制包，则同样需要检查二进制包的sha512哈希

```shell
for i in *.tar.gz; do echo $i; sha512sum --check  $i.sha512; done
```

#### 2.4 检查二进制包

解压缩  `apache-hertzbeat-${release.version}-incubating-bin.tar.gz`

```shell
tar -xzvf apache-hertzbeat-${release.version}-incubating-bin.tar.gz
```

进行如下检查：

- [ ] 文件夹包含单词`incubating`
- [ ] 存在`LICENSE`和`NOTICE`文件
- [ ] 存在`DISCLAIMER`或`DISCLAIMER-WIP`文件
- [ ] `NOTICE`文件中的年份正确
- [ ] 所有文本文件开头都有ASF许可证
- [ ] 检查第三方依赖许可证：
- [ ] 第三方依赖的许可证兼容
- [ ] 所有第三方依赖的许可证都在`LICENSE`文件中声名
- [ ] 如果依赖的是Apache许可证并且存在`NOTICE`文件，那么这些`NOTICE`文件也需要加入到版本的`NOTICE`文件中
- [ ] .....

参考: <https://apache.org/legal/resolved.html>

#### 2.5. 源码编译验证

解压缩 `apache-hertzbeat-${release_version}-incubating-src.tar.gz`

```shell
cd apache-hertzbeat-${release_version}-incubating-src
```

编译源码: <https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package>

进行如下检查:

- [ ] 检查源码包是否包含由于包含不必要文件，致使tar包过于庞大
- [ ] 文件夹包含单词`incubating`
- [ ] 存在`LICENSE`和`NOTICE`文件
- [ ] 存在`DISCLAIMER`或`DISCLAIMER-WIP`文件
- [ ] `NOTICE`文件中的年份正确
- [ ] 只存在文本文件，不存在二进制文件
- [ ] 所有文件的开头都有ASF许可证
- [ ] 能够正确编译
- [ ] .....

参考: <https://apache.org/legal/resolved.html>

### 3. 邮件回复

如果发起了发布投票，验证后，可以参照此回复示例进行邮件回复

:::caution 注意
回复的邮件一定要带上自己检查了那些项信息，仅仅回复`+1 approve`，是无效的。

PPMC 在 <dev@hertzbeat.apache.org> HertzBeat 的社区投票时，请带上 binding 后缀，表示对 HertzBeat 社区中的投票具有约束性投票，方便统计投票结果。

IPMC 在 <general@incubator.apache.org> incubator 社区投票，请带上 binding 后缀，表示对 incubator 社区中的投票具有约束性投票，方便统计投票结果。
:::

:::caution 注意
如果在<dev@hertzbeat.apache.org>已经投过票，在incubator社区进行投票回复时，可以直接带过去,<font color="red">需要注意约束性</font>  如:

```html
//incubator社区 投票时，只有IPMC成员才具有约束性 binding，PPMC需要注意约束性的变化
Forward my +1 from dev@hertzbeat (non-binding)
Copy my +1 from hertzbeat DEV ML (non-binding)
```

:::

非PPMC/IPMC成员

```html
+1 (non-binding)
I  checked:
    1. All download links are valid
    2. Checksum and signature are OK
    3. LICENSE and NOTICE are exist
    4. Build successfully on macOS(Big Sur) 
    5. ....
```

PPMC/IPMC成员

```html
//incubator社区 投票时，只有IPMC成员才具有约束性 binding
+1 (binding)
I  checked:
    1. All download links are valid
    2. Checksum and signature are OK
    3. LICENSE and NOTICE are exist
    4. Build successfully on macOS(Big Sur) 
    5. ....
```

---

This doc refer from [Apache StreamPark](https://streampark.apache.org/)
