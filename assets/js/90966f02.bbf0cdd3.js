"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[8752],{15680:(e,t,n)=>{n.d(t,{xA:()=>p,yg:()=>d});var r=n(96540);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},l=Object.keys(e);for(r=0;r<l.length;r++)n=l[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(r=0;r<l.length;r++)n=l[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var g=r.createContext({}),m=function(e){var t=r.useContext(g),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},p=function(e){var t=m(e.components);return r.createElement(g.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},y=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,l=e.originalType,g=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),y=m(n),d=a,u=y["".concat(g,".").concat(d)]||y[d]||c[d]||l;return n?r.createElement(u,i(i({ref:t},p),{},{components:n})):r.createElement(u,i({ref:t},p))}));function d(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var l=n.length,i=new Array(l);i[0]=y;var o={};for(var g in t)hasOwnProperty.call(t,g)&&(o[g]=t[g]);o.originalType=e,o.mdxType="string"==typeof e?e:a,i[1]=o;for(var m=2;m<l;m++)i[m]=n[m];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}y.displayName="MDXCreateElement"},26820:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>g,contentTitle:()=>i,default:()=>c,frontMatter:()=>l,metadata:()=>o,toc:()=>m});var r=n(58168),a=(n(96540),n(15680));const l={id:"iceberg",Title:"Monitoring Apache Iceberg",sidebar_label:"Apache Iceberg",keywords:["open source monitoring tool","open source apache hive monitoring tool","monitoring apache iceberg metrics"]},i=void 0,o={unversionedId:"help/iceberg",id:"help/iceberg",title:"iceberg",description:"Collect and monitor the general performance metrics exposed by the Apache Iceberg.",source:"@site/docs/help/iceberg.md",sourceDirName:"help",slug:"/help/iceberg",permalink:"/docs/help/iceberg",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/help/iceberg.md",tags:[],version:"current",frontMatter:{id:"iceberg",Title:"Monitoring Apache Iceberg",sidebar_label:"Apache Iceberg",keywords:["open source monitoring tool","open source apache hive monitoring tool","monitoring apache iceberg metrics"]},sidebar:"docs",previous:{title:"Apache Hive",permalink:"/docs/help/hive"},next:{title:"ClickHouse Database",permalink:"/docs/help/clickhouse"}},g={},m=[{value:"Pre-monitoring operations",id:"pre-monitoring-operations",level:2},{value:"Configure parameters",id:"configure-parameters",level:3},{value:"Collect metrics",id:"collect-metrics",level:3},{value:"metric Collection: basic",id:"metric-collection-basic",level:4},{value:"metric Collection: enviroment",id:"metric-collection-enviroment",level:4},{value:"metric Collection: thread",id:"metric-collection-thread",level:4},{value:"metric Collection: code_cache",id:"metric-collection-code_cache",level:4}],p={toc:m};function c(e){let{components:t,...n}=e;return(0,a.yg)("wrapper",(0,r.A)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"Collect and monitor the general performance metrics exposed by the Apache Iceberg.")),(0,a.yg)("h2",{id:"pre-monitoring-operations"},"Pre-monitoring operations"),(0,a.yg)("p",null,"If you want to monitor information in ",(0,a.yg)("inlineCode",{parentName:"p"},"Apache Iceberg")," with this monitoring type, you need to open your ",(0,a.yg)("inlineCode",{parentName:"p"},"Hive Server2")," in remoting mode."),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},"1\u3001Enable metastore:")),(0,a.yg)("pre",null,(0,a.yg)("code",{parentName:"pre",className:"language-shell"},"hive --service metastore &\n")),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},"2. Enable hive server2:")),(0,a.yg)("pre",null,(0,a.yg)("code",{parentName:"pre",className:"language-shell"},"hive --service hiveserver2 &\n")),(0,a.yg)("h3",{id:"configure-parameters"},"Configure parameters"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,a.yg)("th",{parentName:"tr",align:null},"Parameter Help describes the"),(0,a.yg)("th",{parentName:"tr",align:null}))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Monitor Host"),(0,a.yg)("td",{parentName:"tr",align:null},"THE MONITORED PEER IPV4, IPV6 OR DOMAIN NAME. Note \u26a0\ufe0f that there are no protocol headers (eg: https://, http://)."),(0,a.yg)("td",{parentName:"tr",align:null})),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Monitoring Name"),(0,a.yg)("td",{parentName:"tr",align:null},"A name that identifies this monitoring that needs to be unique."),(0,a.yg)("td",{parentName:"tr",align:null})),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Port"),(0,a.yg)("td",{parentName:"tr",align:null},"The default port provided by the database is 10002."),(0,a.yg)("td",{parentName:"tr",align:null})),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Enable HTTPS"),(0,a.yg)("td",{parentName:"tr",align:null},"Whether to access the website through HTTPS, please note that \u26a0\ufe0f when HTTPS is enabled, the default port needs to be changed to 443"),(0,a.yg)("td",{parentName:"tr",align:null})),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"The acquisition interval is"),(0,a.yg)("td",{parentName:"tr",align:null},"Monitor the periodic data acquisition interval, in seconds, and the minimum interval that can be set is 30 seconds"),(0,a.yg)("td",{parentName:"tr",align:null})),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Whether to probe the"),(0,a.yg)("td",{parentName:"tr",align:null},"Whether to check the availability of the monitoring before adding a monitoring is successful, and the new modification operation"),(0,a.yg)("td",{parentName:"tr",align:null},"will continue only if the probe is successful")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Description Comment"),(0,a.yg)("td",{parentName:"tr",align:null},"For more information identifying and describing the remarks for this monitoring, users can remark the information here"),(0,a.yg)("td",{parentName:"tr",align:null})))),(0,a.yg)("h3",{id:"collect-metrics"},"Collect metrics"),(0,a.yg)("h4",{id:"metric-collection-basic"},"metric Collection: basic"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"metric unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metrics help describe"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"vm_name"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The name of the virtual machine (VM) running HiveServer2.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"vm_vendor"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The vendor or provider of the virtual machine.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"vm_version"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The version of the virtual machine.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"up_time"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The duration for which HiveServer2 has been running.")))),(0,a.yg)("h4",{id:"metric-collection-enviroment"},"metric Collection: enviroment"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"metric unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metrics help describe"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"https_proxyPort"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The port number used for HTTPS proxy communication.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"os_name"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The name of the operating system on which HiveServer2 is running.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"os_version"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The version of the operating system.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"os_arch"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The architecture of the operating system.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"java_runtime_name"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The name of the Java runtime environment used by HiveServer2.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"java_runtime_version"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The version of the Java runtime environment.")))),(0,a.yg)("h4",{id:"metric-collection-thread"},"metric Collection: thread"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"metric unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metrics help describe"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"thread_count"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The current number of threads being used by HiveServer2.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"total_started_thread"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The total count of threads started by HiveServer2 since its launch.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"peak_thread_count"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The highest number of threads used by HiveServer2 at any given time.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"daemon_thread_count"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The number of daemon threads currently active in HiveServer2.")))),(0,a.yg)("h4",{id:"metric-collection-code_cache"},"metric Collection: code_cache"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"metric unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metrics help describe"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"committed"),(0,a.yg)("td",{parentName:"tr",align:null},"MB"),(0,a.yg)("td",{parentName:"tr",align:null},"The amount of memory currently allocated for the memory pool.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"init"),(0,a.yg)("td",{parentName:"tr",align:null},"MB"),(0,a.yg)("td",{parentName:"tr",align:null},"The initial amount of memory requested for the memory pool.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"max"),(0,a.yg)("td",{parentName:"tr",align:null},"MB"),(0,a.yg)("td",{parentName:"tr",align:null},"The maximum amount of memory that can be allocated for the memory pool.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"used"),(0,a.yg)("td",{parentName:"tr",align:null},"MB"),(0,a.yg)("td",{parentName:"tr",align:null},"The amount of memory currently being used by the memory pool.")))))}c.isMDXComponent=!0}}]);