---
id: risc-v
title: HertzBeat 在 RISC-V 架构环境中运行
sidebar_label: RISC-V
keywords: [ 开源监控系统, RISC-V架构, RISC-V 运行 HertzBeat ]
---

> 如何搭建 RISC-V 环境，并使 HertzBeat 在 RISC-V 架构环境中运行。

## RISC-V 环境搭建

确保你的 RISC-V 开发环境已正确配置，包括拥有兼容 RISC-V 的设备或模拟器。这里采用在 Ubuntu 环境上搭建 QEMU 模拟器的方式，来模拟 RISC-V 架构。

**1. 安装 QEMU 以及软件包**

```shell
sudo apt update
sudo apt install opensbi qemu-system-misc u-boot-qemu
```

**2. 下载 RISC-V 架构的 Ubuntu 镜像**

下载地址：```https://ubuntu.com/download/risc-v```
选择 `QEMU模拟器` ， 下载需要的版本。

** 3. 在 QEMU 上安装 Ubuntu

> 使用 QEMU 启动 Ubuntu，模拟 RISC-V 架构。一些参数，如启动、设置磁盘大小等可以灵活设置。

```shell
# 解压镜像
xz -dk ubuntu-24.04.2-preinstalled-server-riscv64.img.xz
# 也可自定义扩大磁盘
qemu-img resize -f raw ubuntu-24.04-preinstalled-server-riscv64.img +5G
# 使用 u-boot-qemu 启动虚拟机
qemu-system-riscv64 \
    -machine virt -nographic -m 2048 -smp 4 \
    -kernel /usr/lib/u-boot/qemu-riscv64_smode/uboot.elf \
    -device virtio-net-device,netdev=eth0 -netdev user,id=eth0 \
    -device virtio-rng-pci \
    -drive file=ubuntu-24.04.2-preinstalled-server-riscv64.img,format=raw,if=virtio
```

等待控制台输出完毕后，使用用户 Ubuntu 和默认密码 Ubuntu 登录；系统会要求您选择一个新密码。详细可参考：[Ubuntu官网文档](https://canonical-ubuntu-boards.readthedocs-hosted.com/en/latest/how-to/qemu-riscv/)

## 安装并配置支持 RISC-V 架构的 JDK

> 在启动的镜像中配置支持 RISC-V 架构的 JDK，这里选用 Temurin JDK 17。

**1. 下载 Temurin JDK**

下载地址：```https://adoptium.net/zh-CN/temurin/releases```

**2. 配置 JDK 环境**

> 根据下载的版本不同，做适当更改

```shell
# 安装工具
sudo apt update
sudo apt install -y tar wget

# 创建安装目录
sudo mkdir -p /usr/lib/jvm
# 解压到系统目录
sudo tar -xzf OpenJDK17U-jdk_riscv64_linux_hotspot_17.0.15_6.tar.gz -C /usr/lib/jvm

# 编辑环境变量，添加以下内容
sudo nano /etc/profile.d/java.sh
export JAVA_HOME=/usr/lib/jvm/jdk-17.0.15+6
export PATH=$JAVA_HOME/bin:$PATH

# 使配置生效
source /etc/profile.d/java.sh

# 验证安装
java -version
```

## 运行 HertzBeat

> 在 [Hertzbeat官网](https://hertzbeat.apache.org/zh-cn/docs/download/) 下载安装包，并按照官网部署教程运行即可，以 1.7.2 版本为例。

```shell
cd apache-hertzbeat-1.7.2-incubating-bin/bin/
./startup.sh
```

> 注意事项：
>
> 1. 请将 `OpenJDK17U-jdk_riscv64_linux_hotspot_17.0.15_6.tar.gz` 替换为您实际下载的 JDK 文件名。
> 2. 确保模拟器具备网络访问能力，以下载 HertzBeat。
> 3. 若遇到问题，请检查磁盘权限和 Java 环境路径配置。
