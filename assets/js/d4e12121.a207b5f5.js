"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[22805],{15680:(e,t,a)=>{a.d(t,{xA:()=>y,yg:()=>u});var n=a(96540);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function g(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},l=Object.keys(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var o=n.createContext({}),m=function(e){var t=n.useContext(o),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},y=function(e){var t=m(e.components);return n.createElement(o.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,l=e.originalType,o=e.parentName,y=g(e,["components","mdxType","originalType","parentName"]),d=m(a),u=r,s=d["".concat(o,".").concat(u)]||d[u]||p[u]||l;return a?n.createElement(s,i(i({ref:t},y),{},{components:a})):n.createElement(s,i({ref:t},y))}));function u(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=a.length,i=new Array(l);i[0]=d;var g={};for(var o in t)hasOwnProperty.call(t,o)&&(g[o]=t[o]);g.originalType=e,g.mdxType="string"==typeof e?e:r,i[1]=g;for(var m=2;m<l;m++)i[m]=a[m];return n.createElement.apply(null,i)}return n.createElement.apply(null,a)}d.displayName="MDXCreateElement"},13258:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>o,contentTitle:()=>i,default:()=>p,frontMatter:()=>l,metadata:()=>g,toc:()=>m});var n=a(58168),r=(a(96540),a(15680));const l={id:"euleros",title:"Monitoring EulerOS",sidebar_label:"EulerOS",keywords:["Open Source Monitoring System","Open Source OS Monitoring","EulerOS Monitoring"]},i=void 0,g={unversionedId:"help/euleros",id:"version-v1.5.x/help/euleros",title:"Monitoring EulerOS",description:"Collect and monitor general performance metrics for EulerOS (system information, CPU, memory, disk, network interface, file system, top resource processes, etc.).",source:"@site/versioned_docs/version-v1.5.x/help/euleros.md",sourceDirName:"help",slug:"/help/euleros",permalink:"/docs/v1.5.x/help/euleros",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.5.x/help/euleros.md",tags:[],version:"v1.5.x",frontMatter:{id:"euleros",title:"Monitoring EulerOS",sidebar_label:"EulerOS",keywords:["Open Source Monitoring System","Open Source OS Monitoring","EulerOS Monitoring"]},sidebar:"docs",previous:{title:"Rocky Linux Operating System",permalink:"/docs/v1.5.x/help/rockylinux"},next:{title:"Zookeeper Monitor",permalink:"/docs/v1.5.x/help/zookeeper"}},o={},m=[{value:"Configuration Parameters",id:"configuration-parameters",level:3},{value:"Collected Metrics",id:"collected-metrics",level:3},{value:"Metric Set: Basic Info",id:"metric-set-basic-info",level:4},{value:"Metric Set: CPU Info",id:"metric-set-cpu-info",level:4},{value:"Metric Set: Memory Info",id:"metric-set-memory-info",level:4},{value:"Metric Set: Disk Info",id:"metric-set-disk-info",level:4},{value:"Metric Set: Interface Info",id:"metric-set-interface-info",level:4},{value:"Metric Set: Disk Free",id:"metric-set-disk-free",level:4},{value:"Metric Set: Top10 CPU Process",id:"metric-set-top10-cpu-process",level:4},{value:"Metric Set: Top10 Memory Process",id:"metric-set-top10-memory-process",level:4}],y={toc:m};function p(e){let{components:t,...a}=e;return(0,r.yg)("wrapper",(0,n.A)({},y,a,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Collect and monitor general performance metrics for EulerOS (system information, CPU, memory, disk, network interface, file system, top resource processes, etc.).")),(0,r.yg)("h3",{id:"configuration-parameters"},"Configuration Parameters"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Parameter Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Monitoring Host"),(0,r.yg)("td",{parentName:"tr",align:null},"The IP, IPV6, or domain name of the monitored endpoint. Note \u26a0\ufe0f: Do not include protocol headers (eg: https://, http://).")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Task Name"),(0,r.yg)("td",{parentName:"tr",align:null},"Identifies the name of this monitoring, ensuring uniqueness.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Port"),(0,r.yg)("td",{parentName:"tr",align:null},"Port provided by Linux SSH externally, defaults to 22.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Timeout"),(0,r.yg)("td",{parentName:"tr",align:null},"Sets the timeout for connection in milliseconds (ms), defaults to 6000 ms.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Connection Reuse"),(0,r.yg)("td",{parentName:"tr",align:null},"Sets whether the SSH connection is reused, defaults to: false. Creates a new connection for each information retrieval if false.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Username"),(0,r.yg)("td",{parentName:"tr",align:null},"SSH connection username, optional.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Password"),(0,r.yg)("td",{parentName:"tr",align:null},"SSH connection password, optional.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Collector"),(0,r.yg)("td",{parentName:"tr",align:null},"Specifies which collector schedules the collection for this monitoring.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Monitoring Interval"),(0,r.yg)("td",{parentName:"tr",align:null},"Interval for periodically collecting data, in seconds. Minimum interval is 30 seconds.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Binding Tags"),(0,r.yg)("td",{parentName:"tr",align:null},"Used for categorizing and managing monitored resources.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Description"),(0,r.yg)("td",{parentName:"tr",align:null},"Additional remarks and descriptions for this monitoring, for users' reference.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"PrivateKey"),(0,r.yg)("td",{parentName:"tr",align:null},"Key required for connecting to the server.")))),(0,r.yg)("h3",{id:"collected-metrics"},"Collected Metrics"),(0,r.yg)("h4",{id:"metric-set-basic-info"},"Metric Set: Basic Info"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Host Name"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Host name.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"System Version"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Operating system version.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Uptime"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"System uptime.")))),(0,r.yg)("h4",{id:"metric-set-cpu-info"},"Metric Set: CPU Info"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"info"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"CPU model.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"cores"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Number of CPU cores.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"interrupt"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Number of CPU interrupts.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"load"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Average load for the last 1/5/15 minutes.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"context_switch"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Current context switches.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"CPU usage percentage.")))),(0,r.yg)("h4",{id:"metric-set-memory-info"},"Metric Set: Memory Info"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"total"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Total memory capacity.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"used"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Used memory by user programs.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"free"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Free memory capacity.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"buff_cache"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Memory used for buffers and cache.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"available"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Available memory capacity.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"Memory usage percentage.")))),(0,r.yg)("h4",{id:"metric-set-disk-info"},"Metric Set: Disk Info"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"disk_num"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Total number of disks.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"partition_num"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Total number of partitions.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"block_write"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Total blocks written to disk.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"block_read"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Total blocks read from disk.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"write_rate"),(0,r.yg)("td",{parentName:"tr",align:null},"iops"),(0,r.yg)("td",{parentName:"tr",align:null},"Rate of blocks written per second.")))),(0,r.yg)("h4",{id:"metric-set-interface-info"},"Metric Set: Interface Info"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"interface_name"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Name of the network interface.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"receive_bytes"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Inbound data traffic.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"transmit_bytes"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Outbound data traffic.")))),(0,r.yg)("h4",{id:"metric-set-disk-free"},"Metric Set: Disk Free"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"filesystem"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Name of the file system.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"used"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Used disk space.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"available"),(0,r.yg)("td",{parentName:"tr",align:null},"Mb"),(0,r.yg)("td",{parentName:"tr",align:null},"Available disk space.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"Disk usage percentage.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"mounted"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Mount point directory.")))),(0,r.yg)("h4",{id:"metric-set-top10-cpu-process"},"Metric Set: Top10 CPU Process"),(0,r.yg)("p",null,"Top 10 processes consuming CPU. Metrics include: Process ID, CPU usage, Memory usage, Command."),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"pid"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Process ID")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"cpu_usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"CPU usage")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"mem_usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"Memory usage")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"command"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Executed command")))),(0,r.yg)("h4",{id:"metric-set-top10-memory-process"},"Metric Set: Top10 Memory Process"),(0,r.yg)("p",null,"Top 10 processes consuming memory. Metrics include: Process ID, Memory usage, CPU usage, Command."),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"pid"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Process ID")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"mem_usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"Memory usage")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"cpu_usage"),(0,r.yg)("td",{parentName:"tr",align:null},"%"),(0,r.yg)("td",{parentName:"tr",align:null},"CPU usage")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"command"),(0,r.yg)("td",{parentName:"tr",align:null},"None"),(0,r.yg)("td",{parentName:"tr",align:null},"Executed command")))))}p.isMDXComponent=!0}}]);