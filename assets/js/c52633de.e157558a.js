"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[39196],{15680:(e,t,n)=>{n.d(t,{xA:()=>c,yg:()=>d});var r=n(96540);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var p=r.createContext({}),s=function(e){var t=r.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},c=function(e){var t=s(e.components);return r.createElement(p.Provider,{value:t},e.children)},g={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,p=e.parentName,c=i(e,["components","mdxType","originalType","parentName"]),m=s(n),d=a,y=m["".concat(p,".").concat(d)]||m[d]||g[d]||o;return n?r.createElement(y,l(l({ref:t},c),{},{components:n})):r.createElement(y,l({ref:t},c))}));function d(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,l=new Array(o);l[0]=m;var i={};for(var p in t)hasOwnProperty.call(t,p)&&(i[p]=t[p]);i.originalType=e,i.mdxType="string"==typeof e?e:a,l[1]=i;for(var s=2;s<o;s++)l[s]=n[s];return r.createElement.apply(null,l)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},75149:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>l,default:()=>g,frontMatter:()=>o,metadata:()=>i,toc:()=>s});var r=n(58168),a=(n(96540),n(15680));const o={id:"websocket",title:"Monitoring Websocket",sidebar_label:"Websocket Monitor",keywords:["open source monitoring tool","Websocket\u76d1\u63a7"]},l=void 0,i={unversionedId:"help/websocket",id:"version-v1.6.x/help/websocket",title:"Monitoring Websocket",description:"Monitor metrics such as the response of the WebSocket service's first handshake.",source:"@site/versioned_docs/version-v1.6.x/help/websocket.md",sourceDirName:"help",slug:"/help/websocket",permalink:"/docs/v1.6.x/help/websocket",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/websocket.md",tags:[],version:"v1.6.x",frontMatter:{id:"websocket",title:"Monitoring Websocket",sidebar_label:"Websocket Monitor",keywords:["open source monitoring tool","Websocket\u76d1\u63a7"]},sidebar:"docs",previous:{title:"FTP Monitor",permalink:"/docs/v1.6.x/help/ftp"},next:{title:"MQTT Connection",permalink:"/docs/v1.6.x/help/mqtt"}},p={},s=[{value:"Configuration parameter",id:"configuration-parameter",level:3},{value:"Collection Metric",id:"collection-metric",level:3},{value:"Metric set\uff1aSummary",id:"metric-setsummary",level:4}],c={toc:s};function g(e){let{components:t,...n}=e;return(0,a.yg)("wrapper",(0,r.A)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"Monitor metrics such as the response of the WebSocket service's first handshake.")),(0,a.yg)("h3",{id:"configuration-parameter"},"Configuration parameter"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,a.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Host of WebSocket service"),(0,a.yg)("td",{parentName:"tr",align:null},"Monitored IPV4, IPV6 or domain name. Note\u26a0\ufe0fWithout protocol header (eg: https://, http://).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Monitoring name"),(0,a.yg)("td",{parentName:"tr",align:null},"Identify the name of this monitoring. The name needs to be unique.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Port"),(0,a.yg)("td",{parentName:"tr",align:null},"Port of websocket service.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Path of WebSocket service"),(0,a.yg)("td",{parentName:"tr",align:null},"WebSocket endpoint path.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Collection interval"),(0,a.yg)("td",{parentName:"tr",align:null},"Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Bind Tags"),(0,a.yg)("td",{parentName:"tr",align:null},"Used to classify and manage monitoring resources.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Description remarks"),(0,a.yg)("td",{parentName:"tr",align:null},"For more information about identifying and describing this monitoring, users can note information here.")))),(0,a.yg)("h3",{id:"collection-metric"},"Collection Metric"),(0,a.yg)("h4",{id:"metric-setsummary"},"Metric set\uff1aSummary"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"responseTime"),(0,a.yg)("td",{parentName:"tr",align:null},"ms"),(0,a.yg)("td",{parentName:"tr",align:null},"Response time")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"httpVersion"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"HTTP version")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"responseCode"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Response status code")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"statusMessage"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Status messages")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"connection"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Connect type")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"upgrade"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Upgraded protocols")))))}g.isMDXComponent=!0}}]);