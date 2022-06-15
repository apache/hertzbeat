---
id: extend-ssh  
title: SSH协议自定义监控  
sidebar_label: SSH协议自定义监控    
---
> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用SSH协议自定义指标监控。 
> SSH协议自定义监控可以让我们很方便的通过写sh命令脚本就能监控采集到我们想监控的Linux指标     

### SSH协议采集流程    
【**系统直连Linux**】->【**运行SHELL命令脚本语句**】->【**响应数据解析:oneRow, multiRow**】->【**指标数据提取**】   

由流程可见，我们自定义一个SSH协议的监控类型，需要配置SSH请求参数，配置获取哪些指标，配置查询脚本语句。

### 数据解析方式   
SHELL脚本查询回来的数据字段和我们需要的指标映射，就能获取对应的指标数据，目前映射解析方式有两种：oneRow, multiRow，能满足绝大部分指标需求。

#### **oneRow**   
> 查询出一列数据, 通过查询返回结果集的字段值(一行一个值)与字段映射    

例如：     
需要查询Linux的指标 hostname-主机名称，uptime-启动时间     
主机名称原始查询命令：`hostname`     
启动时间原始查询命令：`uptime | awk -F "," '{print $1}'`   
则在hertzbeat对应的这两个指标的查询脚本为(用`;`将其连接到一起)：       
`hostname; uptime | awk -F "," '{print $1}'`     
终端响应的数据为：    
```
tombook
14:00:15 up 72 days  
```  
则最后采集到的指标数据一一映射为：   
hostname值为 `tombook`   
uptime值为 `14:00:15 up 72 days`      

这里指标字段就能和响应数据一一映射为一行采集数据。     

#### **multiRow**
> 查询多行数据, 通过查询返回结果集的列名称，和查询的指标字段映射  

例如：   
查询的Linux内存相关指标字段：total-内存总量 used-已使用内存 free-空闲内存 buff-cache-缓存大小 available-可用内存    
内存指标原始查询命令为：`free -m`, 控制台响应：  
```shell
              total        used        free      shared  buff/cache   available
Mem:           7962        4065         333           1        3562        3593
Swap:          8191          33        8158
```
在heartbeat中multiRow格式解析需要响应数据列名称和指标值一一映射，则对应的查询SHELL脚本为：  
`free -m | grep Mem | awk 'BEGIN{print "total used free buff_cache available"} {print $2,$3,$4,$6,$7}'`     
控制台响应为：  
```shell
total  used  free  buff_cache  available
7962   4066  331   3564        3592
```

这里指标字段就能和响应数据一一映射为采集数据。

### 自定义步骤  

配置自定义监控类型需新增配置两个YML文件
1. 用监控类型命名的监控配置定义文件 - 例如：example_linux.yml 需位于安装目录 /hertzbeat/define/app/ 下
2. 用监控类型命名的监控参数定义文件 - 例如：example_linux.yml 需位于安装目录 /hertzbeat/define/param/ 下
3. 重启hertzbeat系统，我们就适配好了一个新的自定义监控类型。

------- 
下面详细介绍下这俩文件的配置用法，请注意看使用注释。   

### 监控配置定义文件   

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数映射, 指标信息, 采集协议配置信息*等。  

样例：自定义一个名称为example_linux的自定义监控类型，其使用SSH协议采集指标数据。    
文件名称: example_linux.yml 位于 /define/app/example_linux.yml   

```yaml
# 此监控类型所属类别：service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控
category: os
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example_linux
name:
  zh-CN: 模拟LINUX应用类型
  en-US: LINUX EXAMPLE APP
# 参数映射map. 这些为输入参数变量，即可以用^_^host^_^的形式写到后面的配置中，系统自动变量值替换
# type是参数类型: 0-number数字, 1-string明文字符串, 2-secret加密字符串
# 强制固定必须参数 - host
configmap:
  - key: host
    type: 1
  - key: port
    type: 0
  - key: username
    type: 1
  - key: password
    type: 2
# 指标组列表
metrics:
  # 第一个监控指标组 basic
  # 注意：内置监控指标有 (responseTime - 响应时间)
  - name: basic
    # 指标组调度优先级(0-127)越小优先级越高,优先级低的指标组会等优先级高的指标组采集完成后才会被调度,相同优先级的指标组会并行调度采集
    # 优先级为0的指标组为可用性指标组,即它会被首先调度,采集成功才会继续调度其它指标组,采集失败则中断调度
    priority: 0
    # 指标组中的具体监控指标
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
      - field: hostname
        type: 1
        instance: true
      - field: version
        type: 1
      - field: uptime
        type: 1
    # 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: ssh
    # 当protocol为http协议时具体的采集配置
    ssh:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      script: (uname -r ; hostname ; uptime | awk -F "," '{print $1}' | sed  "s/ //g") | sed ":a;N;s/\n/^/g;ta" | awk -F '^' 'BEGIN{print "version hostname uptime"} {print $1, $2, $3}'
      # 响应数据解析方式：oneRow, multiRow
      parseType: multiRow

  - name: cpu
    priority: 1
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
      - field: info
        type: 1
      - field: cores
        type: 0
        unit: 核数
      - field: interrupt
        type: 0
        unit: 个数
      - field: load
        type: 1
      - field: context_switch
        type: 0
        unit: 个数
    # 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: ssh
    # 当protocol为http协议时具体的采集配置
    ssh:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      script: "LANG=C lscpu | awk -F: '/Model name/ {print $2}';awk '/processor/{core++} END{print core}' /proc/cpuinfo;uptime | sed 's/,/ /g' | awk '{for(i=NF-2;i<=NF;i++)print $i }' | xargs;vmstat 1 1 | awk 'NR==3{print $11}';vmstat 1 1 | awk 'NR==3{print $12}'"
      parseType: oneRow

  - name: memory
    priority: 2
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
      - field: total
        type: 0
        unit: Mb
      - field: used
        type: 0
        unit: Mb
      - field: free
        type: 0
        unit: Mb
      - field: buff_cache
        type: 0
        unit: Mb
      - field: available
        type: 0
        unit: Mb
    # 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: ssh
    # 当protocol为http协议时具体的采集配置
    ssh:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      script: free -m | grep Mem | awk 'BEGIN{print "total used free buff_cache available"} {print $2,$3,$4,$6,$7}'
      parseType: multiRow
```

### 监控参数定义文件

> 监控参数定义文件用于定义 *需要的输入参数字段结构定义(前端页面根据结构渲染输入参数框)*。

样例：自定义一个名称为example_linux的自定义监控类型，其使用SSH协议采集指标数据。    
文件名称: example_linux.yml 位于 /define/param/example_linux.yml   

```yaml
app: example_linux
param:
  - field: host
    name: 主机Host
    type: host
    required: true
  - field: port
    name: 端口
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 22
    placeholder: '请输入端口'
  - field: username
    name: 用户名
    type: text
    limit: 20
    required: true
  - field: password
    name: 密码
    type: password
    required: true
```
