"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[22858],{15680:(e,t,a)=>{a.d(t,{xA:()=>m,yg:()=>s});var n=a(96540);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function o(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function i(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},l=Object.keys(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var d=n.createContext({}),g=function(e){var t=n.useContext(d),a=t;return e&&(a="function"==typeof e?e(t):o(o({},t),e)),a},m=function(e){var t=g(e.components);return n.createElement(d.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},p=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,l=e.originalType,d=e.parentName,m=i(e,["components","mdxType","originalType","parentName"]),p=g(a),s=r,y=p["".concat(d,".").concat(s)]||p[s]||c[s]||l;return a?n.createElement(y,o(o({ref:t},m),{},{components:a})):n.createElement(y,o({ref:t},m))}));function s(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=a.length,o=new Array(l);o[0]=p;var i={};for(var d in t)hasOwnProperty.call(t,d)&&(i[d]=t[d]);i.originalType=e,i.mdxType="string"==typeof e?e:r,o[1]=i;for(var g=2;g<l;g++)o[g]=a[g];return n.createElement.apply(null,o)}return n.createElement.apply(null,a)}p.displayName="MDXCreateElement"},39577:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>d,contentTitle:()=>o,default:()=>c,frontMatter:()=>l,metadata:()=>i,toc:()=>g});var n=a(58168),r=(a(96540),a(15680));const l={id:"oceanbase",title:"Monitoring\uff1aOceanBase database monitoring",sidebar_label:"OceanBase database",keywords:["open source monitoring tool","open source database monitoring tool","monitoring oceanbase database metrics"]},o=void 0,i={unversionedId:"help/oceanbase",id:"version-v1.6.x/help/oceanbase",title:"Monitoring\uff1aOceanBase database monitoring",description:"Collect and monitor the general performance Metrics of OceanBase database. Support OceanBase 4.0+.",source:"@site/versioned_docs/version-v1.6.x/help/oceanbase.md",sourceDirName:"help",slug:"/help/oceanbase",permalink:"/docs/v1.6.x/help/oceanbase",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/oceanbase.md",tags:[],version:"v1.6.x",frontMatter:{id:"oceanbase",title:"Monitoring\uff1aOceanBase database monitoring",sidebar_label:"OceanBase database",keywords:["open source monitoring tool","open source database monitoring tool","monitoring oceanbase database metrics"]},sidebar:"docs",previous:{title:"MongoDB Atlas Database",permalink:"/docs/v1.6.x/help/mongodb_atlas"},next:{title:"REDIS",permalink:"/docs/v1.6.x/help/redis"}},d={},g=[{value:"Attention, Need Add MYSQL jdbc driver jar",id:"attention-need-add-mysql-jdbc-driver-jar",level:3},{value:"Configuration parameter",id:"configuration-parameter",level:3},{value:"Collection Metric",id:"collection-metric",level:3},{value:"Metric set\uff1abasic",id:"metric-setbasic",level:4},{value:"Metric set\uff1astatus",id:"metric-setstatus",level:4},{value:"Metric set\uff1ainnodb",id:"metric-setinnodb",level:4}],m={toc:g};function c(e){let{components:t,...a}=e;return(0,r.yg)("wrapper",(0,n.A)({},m,a,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Collect and monitor the general performance Metrics of OceanBase database. Support OceanBase 4.0+.")),(0,r.yg)("h3",{id:"attention-need-add-mysql-jdbc-driver-jar"},"Attention, Need Add MYSQL jdbc driver jar"),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},"Download the MYSQL jdbc driver jar package, such as mysql-connector-java-8.1.0.jar. ",(0,r.yg)("a",{parentName:"li",href:"https://mvnrepository.com/artifact/com.mysql/mysql-connector-j/8.1.0"},"https://mvnrepository.com/artifact/com.mysql/mysql-connector-j/8.1.0")),(0,r.yg)("li",{parentName:"ul"},"Copy the jar package to the ",(0,r.yg)("inlineCode",{parentName:"li"},"hertzbeat/ext-lib")," directory."),(0,r.yg)("li",{parentName:"ul"},"Restart the HertzBeat service.")),(0,r.yg)("h3",{id:"configuration-parameter"},"Configuration parameter"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,r.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Monitoring Host"),(0,r.yg)("td",{parentName:"tr",align:null},"Monitored IPV4, IPV6 or domain name. Note\u26a0\ufe0fWithout protocol header (eg: https://, http://)")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Monitoring name"),(0,r.yg)("td",{parentName:"tr",align:null},"Identify the name of this monitoring. The name needs to be unique")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Port"),(0,r.yg)("td",{parentName:"tr",align:null},"Port provided by the database. The default is 2881")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Query timeout"),(0,r.yg)("td",{parentName:"tr",align:null},"Set the timeout time when SQL query does not respond to data, unit: ms, default: 6000ms")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Database name"),(0,r.yg)("td",{parentName:"tr",align:null},"Database instance name, optional")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Username"),(0,r.yg)("td",{parentName:"tr",align:null},"Database connection user name, optional")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Password"),(0,r.yg)("td",{parentName:"tr",align:null},"Database connection password, optional")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"URL"),(0,r.yg)("td",{parentName:"tr",align:null},"Database connection URL\uff0coptional\uff0cIf configured, the database name, user name, password and other parameters in the URL will overwrite the above configured parameters")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Collection interval"),(0,r.yg)("td",{parentName:"tr",align:null},"Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Whether to detect"),(0,r.yg)("td",{parentName:"tr",align:null},"Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Description remarks"),(0,r.yg)("td",{parentName:"tr",align:null},"For more information about identifying and describing this monitoring, users can note information here")))),(0,r.yg)("h3",{id:"collection-metric"},"Collection Metric"),(0,r.yg)("h4",{id:"metric-setbasic"},"Metric set\uff1abasic"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"version"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"Database version")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"port"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"Database exposure service port")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"datadir"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"Database storage data disk address")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"max_connections"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"Database maximum connections")))),(0,r.yg)("h4",{id:"metric-setstatus"},"Metric set\uff1astatus"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"threads_created"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"OceanBase created total connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"threads_connected"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"OceanBase connected connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"threads_cached"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"OceanBase current cached connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"threads_running"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"OceanBase current active connections")))),(0,r.yg)("h4",{id:"metric-setinnodb"},"Metric set\uff1ainnodb"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"innodb_data_reads"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"innodb average number of reads from files per second")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"innodb_data_writes"),(0,r.yg)("td",{parentName:"tr",align:null},"none"),(0,r.yg)("td",{parentName:"tr",align:null},"innodb average number of writes from file per second")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"innodb_data_read"),(0,r.yg)("td",{parentName:"tr",align:null},"KB"),(0,r.yg)("td",{parentName:"tr",align:null},"innodb average amount of data read per second")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"innodb_data_written"),(0,r.yg)("td",{parentName:"tr",align:null},"KB"),(0,r.yg)("td",{parentName:"tr",align:null},"innodb average amount of data written per second")))))}c.isMDXComponent=!0}}]);