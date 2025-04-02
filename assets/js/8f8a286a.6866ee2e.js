"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[57149],{15680:(e,t,n)=>{n.d(t,{xA:()=>m,yg:()=>d});var r=n(96540);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var p=r.createContext({}),s=function(e){var t=r.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},m=function(e){var t=s(e.components);return r.createElement(p.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},g=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,p=e.parentName,m=i(e,["components","mdxType","originalType","parentName"]),g=s(n),d=a,y=g["".concat(p,".").concat(d)]||g[d]||c[d]||o;return n?r.createElement(y,l(l({ref:t},m),{},{components:n})):r.createElement(y,l({ref:t},m))}));function d(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,l=new Array(o);l[0]=g;var i={};for(var p in t)hasOwnProperty.call(t,p)&&(i[p]=t[p]);i.originalType=e,i.mdxType="string"==typeof e?e:a,l[1]=i;for(var s=2;s<o;s++)l[s]=n[s];return r.createElement.apply(null,l)}return r.createElement.apply(null,n)}g.displayName="MDXCreateElement"},50750:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>l,default:()=>c,frontMatter:()=>o,metadata:()=>i,toc:()=>s});var r=n(58168),a=(n(96540),n(15680));const o={id:"mqtt",title:"Monitoring MQTT Connection",sidebar_label:"MQTT Connection",keywords:["Open Source Monitoring System","MQTT Connection Monitoring"]},l=void 0,i={unversionedId:"help/mqtt",id:"version-v1.6.x/help/mqtt",title:"Monitoring MQTT Connection",description:"Monitor MQTT connection status, supporting MQTT5 and MQTT3.1.1 protocols.",source:"@site/versioned_docs/version-v1.6.x/help/mqtt.md",sourceDirName:"help",slug:"/help/mqtt",permalink:"/docs/v1.6.x/help/mqtt",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/mqtt.md",tags:[],version:"v1.6.x",frontMatter:{id:"mqtt",title:"Monitoring MQTT Connection",sidebar_label:"MQTT Connection",keywords:["Open Source Monitoring System","MQTT Connection Monitoring"]},sidebar:"docs",previous:{title:"Websocket Monitor",permalink:"/docs/v1.6.x/help/websocket"},next:{title:"Modbus Monitor",permalink:"/docs/v1.6.x/help/modbus"}},p={},s=[{value:"Configuration Parameters",id:"configuration-parameters",level:3},{value:"Collected Metrics",id:"collected-metrics",level:3},{value:"Metric Set: Summary",id:"metric-set-summary",level:4}],m={toc:s};function c(e){let{components:t,...n}=e;return(0,a.yg)("wrapper",(0,r.A)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"Monitor MQTT connection status, supporting MQTT5 and MQTT3.1.1 protocols.")),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},"Protocol used: mqtt")),(0,a.yg)("admonition",{type:"tip"},(0,a.yg)("p",{parentName:"admonition"},"To check if topics can be subscribed to normally, HertzBeat will subscribe to a topic and then immediately unsubscribe; to verify if messages can be published correctly, HertzBeat will send a test\nmessage to a topic (if the test message parameter is empty, this check will not be performed).",(0,a.yg)("br",{parentName:"p"}),"\n","Please ensure that these operations will not affect your system.")),(0,a.yg)("h3",{id:"configuration-parameters"},"Configuration Parameters"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Parameter Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Parameter Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Target Host"),(0,a.yg)("td",{parentName:"tr",align:null},"The monitored target's IPv4, IPv6, or domain name. Note \u26a0\ufe0f: Do not include protocol headers (e.g., https://, http://).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Task Name"),(0,a.yg)("td",{parentName:"tr",align:null},"The name of this monitoring task, which needs to be unique.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Port"),(0,a.yg)("td",{parentName:"tr",align:null},"The port where the MQTT service is open, default is 1883.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Protocol Version"),(0,a.yg)("td",{parentName:"tr",align:null},"The MQTT protocol version, supporting MQTT5 and MQTT3.1.1.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Connection Timeout(ms)"),(0,a.yg)("td",{parentName:"tr",align:null},"Connection timeout in milliseconds, default is 6000 ms.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Client Id"),(0,a.yg)("td",{parentName:"tr",align:null},"MQTT client ID, default is ",(0,a.yg)("inlineCode",{parentName:"td"},"hertzbeat-mqtt-client"),".")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Topic"),(0,a.yg)("td",{parentName:"tr",align:null},"The topic to be monitored.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Test Message"),(0,a.yg)("td",{parentName:"tr",align:null},"Message content used to test whether a topic can be published to normally (optional; if empty, ",(0,a.yg)("inlineCode",{parentName:"td"},"canPublish")," will always be false).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Username"),(0,a.yg)("td",{parentName:"tr",align:null},"MQTT authentication username (optional).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Password"),(0,a.yg)("td",{parentName:"tr",align:null},"MQTT authentication password (optional).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Intervals"),(0,a.yg)("td",{parentName:"tr",align:null},"Interval for periodic data collection, in seconds; the minimum interval that can be set is 30 seconds.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Binding Tag"),(0,a.yg)("td",{parentName:"tr",align:null},"Used for classification and management of monitoring resources.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Description"),(0,a.yg)("td",{parentName:"tr",align:null},"Additional notes to identify and describe this monitoring task, users can leave notes here.")))),(0,a.yg)("h3",{id:"collected-metrics"},"Collected Metrics"),(0,a.yg)("h4",{id:"metric-set-summary"},"Metric Set: Summary"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"responseTime"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Response time")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"canPublish"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Whether messages can be published to the topic normally")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"canSubscribe"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Whether the topic can be subscribed to normally")))))}c.isMDXComponent=!0}}]);