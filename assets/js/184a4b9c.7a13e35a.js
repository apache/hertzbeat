"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[47063],{15680:(e,t,r)=>{r.d(t,{xA:()=>s,yg:()=>u});var n=r(96540);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function l(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?l(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):l(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function i(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},l=Object.keys(e);for(n=0;n<l.length;n++)r=l[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)r=l[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var g=n.createContext({}),p=function(e){var t=n.useContext(g),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},s=function(e){var t=p(e.components);return n.createElement(g.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},y=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,l=e.originalType,g=e.parentName,s=i(e,["components","mdxType","originalType","parentName"]),y=p(r),u=a,d=y["".concat(g,".").concat(u)]||y[u]||m[u]||l;return r?n.createElement(d,o(o({ref:t},s),{},{components:r})):n.createElement(d,o({ref:t},s))}));function u(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var l=r.length,o=new Array(l);o[0]=y;var i={};for(var g in t)hasOwnProperty.call(t,g)&&(i[g]=t[g]);i.originalType=e,i.mdxType="string"==typeof e?e:a,o[1]=i;for(var p=2;p<l;p++)o[p]=r[p];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}y.displayName="MDXCreateElement"},98990:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>g,contentTitle:()=>o,default:()=>m,frontMatter:()=>l,metadata:()=>i,toc:()=>p});var n=r(58168),a=(r(96540),r(15680));const l={id:"ipmi",title:"IPMI2 Monitoring",sidebar_label:"Server Monitor",keywords:["open source monitoring tool","open source server Monitoring","IPMI Monitoring"]},o=void 0,i={unversionedId:"help/ipmi",id:"help/ipmi",title:"IPMI2 Monitoring",description:"Collect and monitor the general performance Metrics of Server using IPMI2.",source:"@site/docs/help/ipmi.md",sourceDirName:"help",slug:"/help/ipmi",permalink:"/docs/help/ipmi",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/help/ipmi.md",tags:[],version:"current",frontMatter:{id:"ipmi",title:"IPMI2 Monitoring",sidebar_label:"Server Monitor",keywords:["open source monitoring tool","open source server Monitoring","IPMI Monitoring"]},sidebar:"docs",previous:{title:"Using Scripts to Monitor Windows OS",permalink:"/docs/help/windows_script"},next:{title:"Apache ActiveMQ",permalink:"/docs/help/activemq"}},g={},p=[{value:"Pre-monitoring steps",id:"pre-monitoring-steps",level:2},{value:"Configuration Parameters",id:"configuration-parameters",level:2},{value:"Collected Metrics",id:"collected-metrics",level:3},{value:"Metric Set: Chassis",id:"metric-set-chassis",level:4},{value:"Metric Set: Sensor",id:"metric-set-sensor",level:4}],s={toc:p};function m(e){let{components:t,...r}=e;return(0,a.yg)("wrapper",(0,n.A)({},s,r,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"Collect and monitor the general performance Metrics of Server using IPMI2.")),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},"Protocol: IPMI")),(0,a.yg)("h2",{id:"pre-monitoring-steps"},"Pre-monitoring steps"),(0,a.yg)("ol",null,(0,a.yg)("li",{parentName:"ol"},"The target server supports the ",(0,a.yg)("strong",{parentName:"li"},"IPMI2 protocol"),"."),(0,a.yg)("li",{parentName:"ol"},"The ",(0,a.yg)("strong",{parentName:"li"},"BMC")," (Baseboard Management Controller) has been configured with a network interface, allowing access to the ",(0,a.yg)("strong",{parentName:"li"},"IPMI port"),"."),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("strong",{parentName:"li"},"User accounts")," have been configured, and appropriate ",(0,a.yg)("strong",{parentName:"li"},"permissions")," have been assigned to the accounts.")),(0,a.yg)("p",null,"These are basic checks you can follow, and for further details on enabling and configuring IPMI over LAN, you can consult the specific user manual of the server manufacturer."),(0,a.yg)("h2",{id:"configuration-parameters"},"Configuration Parameters"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Parameter Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Parameter Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Target Host"),(0,a.yg)("td",{parentName:"tr",align:null},"The IPv4, IPv6, or domain name of the monitored peer. Note: without protocol header (e.g., https://, http://).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Port"),(0,a.yg)("td",{parentName:"tr",align:null},"The port number of the server IPMI over LAN, default is 623.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Username"),(0,a.yg)("td",{parentName:"tr",align:null},"IPMI user name")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Password"),(0,a.yg)("td",{parentName:"tr",align:null},"IPMI password")))),(0,a.yg)("h3",{id:"collected-metrics"},"Collected Metrics"),(0,a.yg)("h4",{id:"metric-set-chassis"},"Metric Set: Chassis"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"System Power"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Current Power State. Power is on.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Power Overload"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Power overload. System shutdown because of power overload condition.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Power Interlock"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Power Interlock.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Main Power Fault"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Power fault. Fault detected in main power subsystem.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Power Control Fault"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Power control fault. Controller attempted to turn system power on or off, but systemdid not enter desired state.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Power Restore Policy"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Power restore policy.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Last Power Event"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Last Power Event.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Cooling/Fan Fault"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Cooling/fan fault detected.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Drive Fault"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Drive Fault.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Front-Panel Lockout"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Front Panel Lockout active (power off and reset via chassispush-buttons disabled.)")))),(0,a.yg)("h4",{id:"metric-set-sensor"},"Metric Set: Sensor"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Sensor ID"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Sensor ID.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Entity ID"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Indicates the physical entity that the sensor is monitoring or is otherwiseassociated with the sensor.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Sensor Type"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Sensor Type.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Sensor Reading"),(0,a.yg)("td",{parentName:"tr",align:null},"none"),(0,a.yg)("td",{parentName:"tr",align:null},"Current Sensor Reading.")))))}m.isMDXComponent=!0}}]);