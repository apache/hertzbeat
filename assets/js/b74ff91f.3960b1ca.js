"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[71622],{15680:(e,t,a)=>{a.d(t,{xA:()=>p,yg:()=>c});var n=a(96540);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function o(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function l(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)a=i[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),m=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):o(o({},t),e)),a},p=function(e){var t=m(e.components);return n.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},g=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),g=m(a),c=r,u=g["".concat(s,".").concat(c)]||g[c]||d[c]||i;return a?n.createElement(u,o(o({ref:t},p),{},{components:a})):n.createElement(u,o({ref:t},p))}));function c(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=a.length,o=new Array(i);o[0]=g;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:r,o[1]=l;for(var m=2;m<i;m++)o[m]=a[m];return n.createElement.apply(null,o)}return n.createElement.apply(null,a)}g.displayName="MDXCreateElement"},78868:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>o,default:()=>d,frontMatter:()=>i,metadata:()=>l,toc:()=>m});var n=a(58168),r=(a(96540),a(15680));const i={id:"tidb",title:"Monitoring\uff1aTiDB database monitoring",sidebar_label:"TiDB database",keywords:["open source monitoring tool","open source database monitoring tool","monitoring tidb database metrics"]},o=void 0,l={unversionedId:"help/tidb",id:"version-v1.5.x/help/tidb",title:"Monitoring\uff1aTiDB database monitoring",description:"HertzBeat monitors general performance metrics of TiDB through HTTP and JDBC protocol.",source:"@site/versioned_docs/version-v1.5.x/help/tidb.md",sourceDirName:"help",slug:"/help/tidb",permalink:"/docs/v1.5.x/help/tidb",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.5.x/help/tidb.md",tags:[],version:"v1.5.x",frontMatter:{id:"tidb",title:"Monitoring\uff1aTiDB database monitoring",sidebar_label:"TiDB database",keywords:["open source monitoring tool","open source database monitoring tool","monitoring tidb database metrics"]},sidebar:"docs",previous:{title:"NebulaGraph Cluster",permalink:"/docs/v1.5.x/help/nebulagraph_cluster"},next:{title:"MongoDB database",permalink:"/docs/v1.5.x/help/mongodb"}},s={},m=[{value:"Configuration parameter",id:"configuration-parameter",level:3},{value:"Collection Metric",id:"collection-metric",level:3},{value:"Metric set: global variables",id:"metric-set-global-variables",level:4}],p={toc:m};function d(e){let{components:t,...a}=e;return(0,r.yg)("wrapper",(0,n.A)({},p,a,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"HertzBeat monitors general performance metrics of TiDB through HTTP and JDBC protocol.")),(0,r.yg)("p",null,(0,r.yg)("a",{parentName:"p",href:"https://docs.pingcap.com/tidb/stable/metrics-schema"},"Metrics Schema")),(0,r.yg)("p",null,(0,r.yg)("a",{parentName:"p",href:"https://docs.pingcap.com/tidb/stable/information-schema-metrics-summary"},"METRICS_SUMMARY")),(0,r.yg)("p",null,(0,r.yg)("a",{parentName:"p",href:"https://docs.pingcap.com/tidb/stable/information-schema-metrics-tables"},"METRICS_TABLES")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Protocol Use: HTTP and JDBC")),(0,r.yg)("h3",{id:"configuration-parameter"},"Configuration parameter"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,r.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Target Host"),(0,r.yg)("td",{parentName:"tr",align:null},"Monitored IPV4, IPV6 or domain name. Note\u26a0\ufe0fWithout protocol header (eg: https://, http://)")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Task name"),(0,r.yg)("td",{parentName:"tr",align:null},"Identify the name of this monitoring. The name needs to be unique")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Service Port"),(0,r.yg)("td",{parentName:"tr",align:null},"The port that the TiDB database provides externally for status reporting is 10080 by default")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"PD Port"),(0,r.yg)("td",{parentName:"tr",align:null},"The PD port for the TiDB database, which defaults to 2379")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Query timeout"),(0,r.yg)("td",{parentName:"tr",align:null},"Set the timeout time when SQL query does not respond to data, unit: ms, default: 6000ms")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"JDBC Port"),(0,r.yg)("td",{parentName:"tr",align:null},"The TiDB database externally provides the port used for client requests, which defaults to 4000")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Database name"),(0,r.yg)("td",{parentName:"tr",align:null},"Database instance name, optional")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Username"),(0,r.yg)("td",{parentName:"tr",align:null},"Database connection user name, optional")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Password"),(0,r.yg)("td",{parentName:"tr",align:null},"Database connection password, optional")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"JDBC URL"),(0,r.yg)("td",{parentName:"tr",align:null},"Database using ",(0,r.yg)("a",{parentName:"td",href:"https://docs.pingcap.com/tidb/stable/dev-guide-connect-to-tidb#jdbc"},"JDBC")," connection URL\uff0coptional\uff0cIf configured, the database name, user name, password and other parameters in the URL will overwrite the above configured parameters")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Collection interval"),(0,r.yg)("td",{parentName:"tr",align:null},"Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Whether to detect"),(0,r.yg)("td",{parentName:"tr",align:null},"Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Description remarks"),(0,r.yg)("td",{parentName:"tr",align:null},"For more information about identifying and describing this monitoring, users can note information here")))),(0,r.yg)("h3",{id:"collection-metric"},"Collection Metric"),(0,r.yg)("p",null,"The monitoring template will retrieve the monitoring metrics from the TiDB System Variables table, and the user can retrieve the ",(0,r.yg)("a",{parentName:"p",href:"https://docs.pingcap.com/tidb/stable/system-variables"},"TiDB System Variables Table")," by himself to query the required information or other system variables."),(0,r.yg)("p",null,"Besides, TiDB also provides default monitoring metrics table, see ",(0,r.yg)("a",{parentName:"p",href:"https://docs.pingcap.com/tidb/stable/metrics-schema"},"Metrics Schema")," and ",(0,r.yg)("a",{parentName:"p",href:"https://docs.pingcap.com/tidb/stable/information-schema-metrics-summary"},"METRICS_SUMMARY"),", and users can add their own sql codes according to their needs."),(0,r.yg)("p",null,"Due to the large number of metrics that can be monitored, only the metrics queried in the monitoring template are described below."),(0,r.yg)("h4",{id:"metric-set-global-variables"},"Metric set: global variables"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric Help Description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"version"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The MySQL version, followed by the TiDB version. For example '8.0.11-TiDB-v7.5.1'.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"version_comment"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The TiDB version. For example, 'TiDB Server (Apache License 2.0) Community Edition, MySQL 8.0 compatible'.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"version_compile_machine"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The name of the CPU architecture on which TiDB is running.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"version_compile_os"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The name of the OS on which TiDB is running.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"max_connections"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The maximum number of concurrent connections permitted for a single TiDB instance. This variable can be used for resources control. The default value 0 means no limit. When the value of this variable is larger than 0, and the number of connections reaches the value, the TiDB server rejects new connections from clients.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"datadir"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The location where data is stored. This location can be a local path /tmp/tidb, or point to a PD server if the data is stored on TiKV. A value in the format of ${pd-ip}:${pd-port} indicates the PD server that TiDB connects to on startup.")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"port"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"The port that the tidb-server is listening on when speaking the MySQL protocol.")))))}d.isMDXComponent=!0}}]);