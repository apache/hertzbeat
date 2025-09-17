---
id: risc-v
title: HertzBeat Running in RISC-V Architecture Environment
sidebar_label: RISC-V
keywords: [ Open Source Monitoring System, RISC-V Architecture, RISC-V Running HertzBeat ]
---

> How to Set Up a RISC-V Environment and Run HertzBeat on RISC-V Architecture.

## RISC-V Environment Setup

Ensure your RISC-V development environment is properly configured, including compatible hardware or emulators. This guide uses the QEMU emulator on Ubuntu to simulate RISC-V architecture.

**1. Install QEMU and Required Packages**

```shell
sudo apt update
sudo apt install opensbi qemu-system-misc u-boot-qemu
```

**2. Download Ubuntu Image for RISC-V Architecture**

Download link: <https://ubuntu.com/download/risc-v>
Select the `QEMU Emulator` version and download your preferred release.

**3. Install Ubuntu on QEMU**

> Use QEMU to boot Ubuntu and emulate RISC-V architecture. Parameters (e.g., boot settings, disk size) can be customized.

```shell
# Decompress the image
xz -dk ubuntu-24.04.2-preinstalled-server-riscv64.img.xz

# Optional: Expand the disk size
qemu-img resize -f raw ubuntu-24.04-preinstalled-server-riscv64.img +5G

# Start the VM using u-boot-qemu
qemu-system-riscv64 \
    -machine virt -nographic -m 2048 -smp 4 \
    -kernel /usr/lib/u-boot/qemu-riscv64_smode/uboot.elf \
    -device virtio-net-device,netdev=eth0 -netdev user,id=eth0 \
    -device virtio-rng-pci \
    -drive file=ubuntu-24.04.2-preinstalled-server-riscv64.img,format=raw,if=virtio
```

After the console output completes, log in with username ubuntu and default password ubuntu. You will be prompted to set a new password.
Reference: [Ubuntu Official Documentation](https://canonical-ubuntu-boards.readthedocs-hosted.com/en/latest/how-to/qemu-riscv/)

## Install and Configure RISC-V-Compatible JDK

> Configure a JDK that supports RISC-V architecture. Here we use Temurin JDK 17.

**1. Download Temurin JDK**
Download link: <https://adoptium.net/temurin/releases>

**2. Configure JDK Environment**

> Adjust commands based on your downloaded JDK version.

```shell
# Install tools
sudo apt update
sudo apt install -y tar wget

# Create installation directory
sudo mkdir -p /usr/lib/jvm

# Extract to system directory
sudo tar -xzf OpenJDK17U-jdk_riscv64_linux_hotspot_17.0.15_6.tar.gz -C /usr/lib/jvm

# Edit environment variables
sudo nano /etc/profile.d/java.sh
export JAVA_HOME=/usr/lib/jvm/jdk-17.0.15+6
export PATH=$JAVA_HOME/bin:$PATH

# Apply configuration
source /etc/profile.d/java.sh

# Verify installation
java -version
```

## Run HertzBeat

> Download the installer from [HertzBeat Official Site](https://hertzbeat.apache.org/zh-cn/docs/download/) and follow the deployment guide. Example for v1.7.2 .

```shell
cd apache-hertzbeat-1.7.2-incubating-bin/bin/
./startup.sh
```

> Notes:
>
> 1. Replace `OpenJDK17U-jdk_riscv64_linux_hotspot_17.0.15_6.tar.gz` with your actual JDK filename.
> 2. Ensure the emulator has internet access to download HertzBeat.
> 3. If issues arise, verify disk permissions and Java environment paths.
