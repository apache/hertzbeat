"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[7491],{15680:(e,t,r)=>{r.d(t,{xA:()=>g,yg:()=>d});var n=r(96540);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function o(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?o(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):o(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function l(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},o=Object.keys(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var p=n.createContext({}),c=function(e){var t=n.useContext(p),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},g=function(e){var t=c(e.components);return n.createElement(p.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},s=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,o=e.originalType,p=e.parentName,g=l(e,["components","mdxType","originalType","parentName"]),s=c(r),d=a,y=s["".concat(p,".").concat(d)]||s[d]||m[d]||o;return r?n.createElement(y,i(i({ref:t},g),{},{components:r})):n.createElement(y,i({ref:t},g))}));function d(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=r.length,i=new Array(o);i[0]=s;var l={};for(var p in t)hasOwnProperty.call(t,p)&&(l[p]=t[p]);l.originalType=e,l.mdxType="string"==typeof e?e:a,i[1]=l;for(var c=2;c<o;c++)i[c]=r[c];return n.createElement.apply(null,i)}return n.createElement.apply(null,r)}s.displayName="MDXCreateElement"},24844:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>p,contentTitle:()=>i,default:()=>m,frontMatter:()=>o,metadata:()=>l,toc:()=>c});var n=r(58168),a=(r(96540),r(15680));const o={id:"ftp",title:"Monitoring FTP",sidebar_label:"FTP Monitor",keywords:["open source monitoring tool","open source ftp server monitoring tool","monitoring ftp metrics"]},i=void 0,l={unversionedId:"help/ftp",id:"version-v1.6.x/help/ftp",title:"Monitoring FTP",description:"Collect and monitor the general performance Metrics of FTP server.",source:"@site/versioned_docs/version-v1.6.x/help/ftp.md",sourceDirName:"help",slug:"/help/ftp",permalink:"/docs/v1.6.x/help/ftp",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/ftp.md",tags:[],version:"v1.6.x",frontMatter:{id:"ftp",title:"Monitoring FTP",sidebar_label:"FTP Monitor",keywords:["open source monitoring tool","open source ftp server monitoring tool","monitoring ftp metrics"]},sidebar:"docs",previous:{title:"DNS Monitor",permalink:"/docs/v1.6.x/help/dns"},next:{title:"Websocket Monitor",permalink:"/docs/v1.6.x/help/websocket"}},p={},c=[{value:"Configuration parameter",id:"configuration-parameter",level:3},{value:"Collection Metrics",id:"collection-metrics",level:3},{value:"Metrics Set\uff1aBasic",id:"metrics-setbasic",level:4}],g={toc:c};function m(e){let{components:t,...r}=e;return(0,a.yg)("wrapper",(0,n.A)({},g,r,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"Collect and monitor the general performance Metrics of FTP server.")),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},"Protocol Use\uff1aFTP")),(0,a.yg)("h3",{id:"configuration-parameter"},"Configuration parameter"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,a.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Target Host"),(0,a.yg)("td",{parentName:"tr",align:null},"Monitored IPV4, IPV6 or domain name. Note\u26a0\ufe0fWithout protocol header (eg: ftp://).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Monitoring name"),(0,a.yg)("td",{parentName:"tr",align:null},"Identify the name of this monitoring, The name needs to be unique.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Port"),(0,a.yg)("td",{parentName:"tr",align:null},"Port provided by FTP server ,default is 21.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Direction"),(0,a.yg)("td",{parentName:"tr",align:null},"Directory on the FTP server.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Timeout"),(0,a.yg)("td",{parentName:"tr",align:null},"Timeout for connecting to FTP server.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Username"),(0,a.yg)("td",{parentName:"tr",align:null},"Username for connecting to the FTP server, optional.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Password"),(0,a.yg)("td",{parentName:"tr",align:null},"Password for connecting to the FTP server, optional.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Collection interval"),(0,a.yg)("td",{parentName:"tr",align:null},"Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Bind Tags"),(0,a.yg)("td",{parentName:"tr",align:null},"Used to classify and manage monitoring resources.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Description remarks"),(0,a.yg)("td",{parentName:"tr",align:null},"For more information about identifying and describing this monitoring, users can note information here.")))),(0,a.yg)("h3",{id:"collection-metrics"},"Collection Metrics"),(0,a.yg)("h4",{id:"metrics-setbasic"},"Metrics Set\uff1aBasic"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Is Active"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Check if the directory exists and has access permission.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Response Time"),(0,a.yg)("td",{parentName:"tr",align:null},"ms"),(0,a.yg)("td",{parentName:"tr",align:null},"Response Time")))))}m.isMDXComponent=!0}}]);