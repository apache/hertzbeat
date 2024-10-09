"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[67792],{15680:(t,e,a)=>{a.d(e,{xA:()=>m,yg:()=>s});var r=a(96540);function n(t,e,a){return e in t?Object.defineProperty(t,e,{value:a,enumerable:!0,configurable:!0,writable:!0}):t[e]=a,t}function l(t,e){var a=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),a.push.apply(a,r)}return a}function i(t){for(var e=1;e<arguments.length;e++){var a=null!=arguments[e]?arguments[e]:{};e%2?l(Object(a),!0).forEach((function(e){n(t,e,a[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(a,e))}))}return t}function g(t,e){if(null==t)return{};var a,r,n=function(t,e){if(null==t)return{};var a,r,n={},l=Object.keys(t);for(r=0;r<l.length;r++)a=l[r],e.indexOf(a)>=0||(n[a]=t[a]);return n}(t,e);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(t);for(r=0;r<l.length;r++)a=l[r],e.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(t,a)&&(n[a]=t[a])}return n}var o=r.createContext({}),p=function(t){var e=r.useContext(o),a=e;return t&&(a="function"==typeof t?t(e):i(i({},e),t)),a},m=function(t){var e=p(t.components);return r.createElement(o.Provider,{value:e},t.children)},y={inlineCode:"code",wrapper:function(t){var e=t.children;return r.createElement(r.Fragment,{},e)}},d=r.forwardRef((function(t,e){var a=t.components,n=t.mdxType,l=t.originalType,o=t.parentName,m=g(t,["components","mdxType","originalType","parentName"]),d=p(a),s=n,c=d["".concat(o,".").concat(s)]||d[s]||y[s]||l;return a?r.createElement(c,i(i({ref:e},m),{},{components:a})):r.createElement(c,i({ref:e},m))}));function s(t,e){var a=arguments,n=e&&e.mdxType;if("string"==typeof t||n){var l=a.length,i=new Array(l);i[0]=d;var g={};for(var o in e)hasOwnProperty.call(e,o)&&(g[o]=e[o]);g.originalType=t,g.mdxType="string"==typeof t?t:n,i[1]=g;for(var p=2;p<l;p++)i[p]=a[p];return r.createElement.apply(null,i)}return r.createElement.apply(null,a)}d.displayName="MDXCreateElement"},13e3:(t,e,a)=>{a.r(e),a.d(e,{assets:()=>o,contentTitle:()=>i,default:()=>y,frontMatter:()=>l,metadata:()=>g,toc:()=>p});var r=a(58168),n=(a(96540),a(15680));const l={id:"windows_script",title:"Monitoring\uff1aUsing Scripts to Monitor Windows Operating System",sidebar_label:"Using Scripts to Monitor Windows OS",keywords:["open source monitoring system","open source network monitoring","using scripts to monitor Windows OS"]},i=void 0,g={unversionedId:"help/windows_script",id:"help/windows_script",title:"Monitoring\uff1aUsing Scripts to Monitor Windows Operating System",description:"Preparation",source:"@site/docs/help/windows_script.md",sourceDirName:"help",slug:"/help/windows_script",permalink:"/docs/help/windows_script",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/help/windows_script.md",tags:[],version:"current",frontMatter:{id:"windows_script",title:"Monitoring\uff1aUsing Scripts to Monitor Windows Operating System",sidebar_label:"Using Scripts to Monitor Windows OS",keywords:["open source monitoring system","open source network monitoring","using scripts to monitor Windows OS"]},sidebar:"docs",previous:{title:"Using Scripts to Monitor Linux OS",permalink:"/docs/help/linux_script"},next:{title:"Zookeeper Monitor",permalink:"/docs/help/zookeeper"}},o={},p=[{value:"Preparation",id:"preparation",level:3},{value:"Configuration Parameters",id:"configuration-parameters",level:3},{value:"Metrics Collection",id:"metrics-collection",level:3},{value:"Metric Set: basic",id:"metric-set-basic",level:4},{value:"Metric Set: cpu",id:"metric-set-cpu",level:4},{value:"Metric Set: memory",id:"metric-set-memory",level:4},{value:"Metric Set: disk",id:"metric-set-disk",level:4},{value:"Metric Set: disk_free",id:"metric-set-disk_free",level:4},{value:"Metric Set: Top 10 Programs by CPU Usage",id:"metric-set-top-10-programs-by-cpu-usage",level:4},{value:"Metric Set: Top 10 Programs by Memory Usage",id:"metric-set-top-10-programs-by-memory-usage",level:4}],m={toc:p};function y(t){let{components:e,...a}=t;return(0,n.yg)("wrapper",(0,r.A)({},m,a,{components:e,mdxType:"MDXLayout"}),(0,n.yg)("h3",{id:"preparation"},"Preparation"),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"To monitor the local machine, simply deploy Hertzbeat. To monitor other hosts, you need to deploy a collector on the target host. Refer to ",(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat?tab=readme-ov-file#2install-via-package"},"this link")," for step 5 of the installation process.\nWhen creating a monitoring task and selecting a collector, choose the corresponding collector deployed on the target host.")),(0,n.yg)("h3",{id:"configuration-parameters"},"Configuration Parameters"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:"left"},"Parameter Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Parameter Description"),(0,n.yg)("th",{parentName:"tr",align:null}))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:"left"},"Monitor Host"),(0,n.yg)("td",{parentName:"tr",align:null},"The IPv4, IPv6, or domain of the monitored endpoint. Note \u26a0\ufe0f Do not include protocol headers (e.g., https://, http://)."),(0,n.yg)("td",{parentName:"tr",align:null})),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:"left"},"Task Name"),(0,n.yg)("td",{parentName:"tr",align:null},"The name identifying this monitoring task, which needs to be unique."),(0,n.yg)("td",{parentName:"tr",align:null})),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:"left"},"Collector"),(0,n.yg)("td",{parentName:"tr",align:null},"Specifies which collector will be used for data collection in this monitoring task."),(0,n.yg)("td",{parentName:"tr",align:null})),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:"left"},"Monitoring Interval"),(0,n.yg)("td",{parentName:"tr",align:null},"The time interval for periodic data collection, in seconds."),(0,n.yg)("td",{parentName:"tr",align:null})),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:"left"},"Binding Tag"),(0,n.yg)("td",{parentName:"tr",align:null},"Classification management tags for monitoring resources."),(0,n.yg)("td",{parentName:"tr",align:null})),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:"left"},"Description Notes"),(0,n.yg)("td",{parentName:"tr",align:null},"Additional notes to describe this monitoring task. Users can add remarks here."),(0,n.yg)("td",{parentName:"tr",align:null})))),(0,n.yg)("h3",{id:"metrics-collection"},"Metrics Collection"),(0,n.yg)("h4",{id:"metric-set-basic"},"Metric Set: basic"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"hostname"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Name of the host")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"version"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Operating system version")))),(0,n.yg)("h4",{id:"metric-set-cpu"},"Metric Set: cpu"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"info"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"CPU model")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"cores"),(0,n.yg)("td",{parentName:"tr",align:null},"Number"),(0,n.yg)("td",{parentName:"tr",align:null},"Number of CPU cores")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"interrupt"),(0,n.yg)("td",{parentName:"tr",align:null},"Count"),(0,n.yg)("td",{parentName:"tr",align:null},"Number of CPU interrupts")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"load"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Average recent CPU load")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"context_switch"),(0,n.yg)("td",{parentName:"tr",align:null},"Count"),(0,n.yg)("td",{parentName:"tr",align:null},"Current number of context switches")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"usage"),(0,n.yg)("td",{parentName:"tr",align:null},"%"),(0,n.yg)("td",{parentName:"tr",align:null},"CPU usage percentage")))),(0,n.yg)("h4",{id:"metric-set-memory"},"Metric Set: memory"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"totalPhysical"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Total physical memory capacity")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"freePhysical"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Free physical memory capacity")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"totalVirtual"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Total virtual memory capacity")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"freeVirtual"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Free virtual memory capacity")))),(0,n.yg)("h4",{id:"metric-set-disk"},"Metric Set: disk"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"Model"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Disk model")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"Size"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Disk size")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"BytesPerSector"),(0,n.yg)("td",{parentName:"tr",align:null},"Bytes"),(0,n.yg)("td",{parentName:"tr",align:null},"Number of bytes per sector")))),(0,n.yg)("h4",{id:"metric-set-disk_free"},"Metric Set: disk_free"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"Caption"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Disk label")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"FreeSpace"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Available disk space")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"Size"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Total disk space")))),(0,n.yg)("h4",{id:"metric-set-top-10-programs-by-cpu-usage"},"Metric Set: Top 10 Programs by CPU Usage"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"name"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Process name")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"id"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Process ID")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"cpu"),(0,n.yg)("td",{parentName:"tr",align:null},"Seconds"),(0,n.yg)("td",{parentName:"tr",align:null},"CPU usage time")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"ws"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Memory usage")))),(0,n.yg)("h4",{id:"metric-set-top-10-programs-by-memory-usage"},"Metric Set: Top 10 Programs by Memory Usage"),(0,n.yg)("table",null,(0,n.yg)("thead",{parentName:"table"},(0,n.yg)("tr",{parentName:"thead"},(0,n.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,n.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,n.yg)("tbody",{parentName:"table"},(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"name"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Process name")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"id"),(0,n.yg)("td",{parentName:"tr",align:null},"None"),(0,n.yg)("td",{parentName:"tr",align:null},"Process ID")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"cpu"),(0,n.yg)("td",{parentName:"tr",align:null},"Seconds"),(0,n.yg)("td",{parentName:"tr",align:null},"CPU usage time")),(0,n.yg)("tr",{parentName:"tbody"},(0,n.yg)("td",{parentName:"tr",align:null},"ws"),(0,n.yg)("td",{parentName:"tr",align:null},"Mb"),(0,n.yg)("td",{parentName:"tr",align:null},"Memory usage")))))}y.isMDXComponent=!0}}]);