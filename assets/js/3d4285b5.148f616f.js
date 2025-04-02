"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[59946],{15680:(e,t,n)=>{n.d(t,{xA:()=>m,yg:()=>d});var r=n(96540);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var p=r.createContext({}),c=function(e){var t=r.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},m=function(e){var t=c(e.components);return r.createElement(p.Provider,{value:t},e.children)},s={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},g=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,i=e.originalType,p=e.parentName,m=l(e,["components","mdxType","originalType","parentName"]),g=c(n),d=o,u=g["".concat(p,".").concat(d)]||g[d]||s[d]||i;return n?r.createElement(u,a(a({ref:t},m),{},{components:n})):r.createElement(u,a({ref:t},m))}));function d(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var i=n.length,a=new Array(i);a[0]=g;var l={};for(var p in t)hasOwnProperty.call(t,p)&&(l[p]=t[p]);l.originalType=e,l.mdxType="string"==typeof e?e:o,a[1]=l;for(var c=2;c<i;c++)a[c]=n[c];return r.createElement.apply(null,a)}return r.createElement.apply(null,n)}g.displayName="MDXCreateElement"},55856:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>a,default:()=>s,frontMatter:()=>i,metadata:()=>l,toc:()=>c});var r=n(58168),o=(n(96540),n(15680));const i={id:"ping",title:"Monitoring\uff1aPING connectivity",sidebar_label:"PING connectivity",keywords:["open source monitoring tool","open source network monitoring tool","monitoring ping metrics"]},a=void 0,l={unversionedId:"help/ping",id:"version-v1.6.x/help/ping",title:"Monitoring\uff1aPING connectivity",description:"Ping the opposite end HOST address and judge its connectivity.",source:"@site/versioned_docs/version-v1.6.x/help/ping.md",sourceDirName:"help",slug:"/help/ping",permalink:"/docs/v1.6.x/help/ping",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/ping.md",tags:[],version:"v1.6.x",frontMatter:{id:"ping",title:"Monitoring\uff1aPING connectivity",sidebar_label:"PING connectivity",keywords:["open source monitoring tool","open source network monitoring tool","monitoring ping metrics"]},sidebar:"docs",previous:{title:"HTTP API",permalink:"/docs/v1.6.x/help/api"},next:{title:"TCP Port availability",permalink:"/docs/v1.6.x/help/port"}},p={},c=[{value:"Configuration parameter",id:"configuration-parameter",level:3},{value:"Collection Metric",id:"collection-metric",level:3},{value:"Metric set\uff1asummary",id:"metric-setsummary",level:4},{value:"Common Problem",id:"common-problem",level:3}],m={toc:c};function s(e){let{components:t,...n}=e;return(0,o.yg)("wrapper",(0,r.A)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,o.yg)("blockquote",null,(0,o.yg)("p",{parentName:"blockquote"},"Ping the opposite end HOST address and judge its connectivity.")),(0,o.yg)("h3",{id:"configuration-parameter"},"Configuration parameter"),(0,o.yg)("table",null,(0,o.yg)("thead",{parentName:"table"},(0,o.yg)("tr",{parentName:"thead"},(0,o.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,o.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,o.yg)("tbody",{parentName:"table"},(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"Monitoring Host"),(0,o.yg)("td",{parentName:"tr",align:null},"Monitored IPV4, IPV6 or domain name. Note\u26a0\ufe0fWithout protocol header (eg: https://, http://)")),(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"Monitoring name"),(0,o.yg)("td",{parentName:"tr",align:null},"Identify the name of this monitoring. The name needs to be unique")),(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"Ping timeout"),(0,o.yg)("td",{parentName:"tr",align:null},"Set the timeout when Ping does not respond to data, unit:ms, default: 3000ms")),(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"Collection interval"),(0,o.yg)("td",{parentName:"tr",align:null},"Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds")),(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"Whether to detect"),(0,o.yg)("td",{parentName:"tr",align:null},"Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful")),(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"Description remarks"),(0,o.yg)("td",{parentName:"tr",align:null},"For more information about identifying and describing this monitoring, users can note information here")))),(0,o.yg)("h3",{id:"collection-metric"},"Collection Metric"),(0,o.yg)("h4",{id:"metric-setsummary"},"Metric set\uff1asummary"),(0,o.yg)("table",null,(0,o.yg)("thead",{parentName:"table"},(0,o.yg)("tr",{parentName:"thead"},(0,o.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,o.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,o.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,o.yg)("tbody",{parentName:"table"},(0,o.yg)("tr",{parentName:"tbody"},(0,o.yg)("td",{parentName:"tr",align:null},"responseTime"),(0,o.yg)("td",{parentName:"tr",align:null},"ms"),(0,o.yg)("td",{parentName:"tr",align:null},"Website response time")))),(0,o.yg)("h3",{id:"common-problem"},"Common Problem"),(0,o.yg)("ol",null,(0,o.yg)("li",{parentName:"ol"},"Ping connectivity monitoring exception when installing hertzbeat for package deployment.",(0,o.yg)("br",{parentName:"li"}),"The hertzbeat installed and deployed by the installation package is not available for ping connectivity monitoring, but local direct ping is available \u3002")),(0,o.yg)("blockquote",null,(0,o.yg)("p",{parentName:"blockquote"},"The deployment of the installation package requires configuring the root permission of the Java virtual machine to start hertzbeat to use ICMP. If the root permission is not enabled, judge whether port 7 of telnet opposite end is opened.\nWhen you install HertzBeat via DockerDocker root is enabled by default. No such problem.\nSee ",(0,o.yg)("a",{parentName:"p",href:"https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address"},"https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address"))))}s.isMDXComponent=!0}}]);