"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[41554],{15680:(e,t,r)=>{r.d(t,{xA:()=>u,yg:()=>m});var o=r(96540);function n(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);t&&(o=o.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,o)}return r}function a(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){n(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function s(e,t){if(null==e)return{};var r,o,n=function(e,t){if(null==e)return{};var r,o,n={},i=Object.keys(e);for(o=0;o<i.length;o++)r=i[o],t.indexOf(r)>=0||(n[r]=e[r]);return n}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(o=0;o<i.length;o++)r=i[o],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(n[r]=e[r])}return n}var l=o.createContext({}),c=function(e){var t=o.useContext(l),r=t;return e&&(r="function"==typeof e?e(t):a(a({},t),e)),r},u=function(e){var t=c(e.components);return o.createElement(l.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return o.createElement(o.Fragment,{},t)}},d=o.forwardRef((function(e,t){var r=e.components,n=e.mdxType,i=e.originalType,l=e.parentName,u=s(e,["components","mdxType","originalType","parentName"]),d=c(r),m=n,h=d["".concat(l,".").concat(m)]||d[m]||p[m]||i;return r?o.createElement(h,a(a({ref:t},u),{},{components:r})):o.createElement(h,a({ref:t},u))}));function m(e,t){var r=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var i=r.length,a=new Array(i);a[0]=d;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s.mdxType="string"==typeof e?e:n,a[1]=s;for(var c=2;c<i;c++)a[c]=r[c];return o.createElement.apply(null,a)}return o.createElement.apply(null,r)}d.displayName="MDXCreateElement"},62599:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>l,contentTitle:()=>a,default:()=>p,frontMatter:()=>i,metadata:()=>s,toc:()=>c});var o=r(58168),n=(r(96540),r(15680));const i={id:"extend-push",title:"Push Style Custom Monitoring",sidebar_label:"Push Style Custom Monitoring"},a=void 0,s={unversionedId:"advanced/extend-push",id:"version-v1.5.x/advanced/extend-push",title:"Push Style Custom Monitoring",description:"Push style curstom monitor is a type of monitor which allow user to configure metrics format and push metrics to hertzbeat with their own service.",source:"@site/versioned_docs/version-v1.5.x/advanced/extend-push.md",sourceDirName:"advanced",slug:"/advanced/extend-push",permalink:"/docs/v1.5.x/advanced/extend-push",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.5.x/advanced/extend-push.md",tags:[],version:"v1.5.x",frontMatter:{id:"extend-push",title:"Push Style Custom Monitoring",sidebar_label:"Push Style Custom Monitoring"},sidebar:"docs",previous:{title:"SNMP Protocol Custom Monitoring",permalink:"/docs/v1.5.x/advanced/extend-snmp"},next:{title:"NGQL Custom Monitoring",permalink:"/docs/v1.5.x/advanced/extend-ngql"}},l={},c=[{value:"Push style custom monitor collection process",id:"push-style-custom-monitor-collection-process",level:3},{value:"Data parsing method",id:"data-parsing-method",level:3},{value:"Create Monitor Steps",id:"create-monitor-steps",level:3},{value:"Monitor Configuration Example",id:"monitor-configuration-example",level:3}],u={toc:c};function p(e){let{components:t,...i}=e;return(0,n.yg)("wrapper",(0,o.A)({},u,i,{components:t,mdxType:"MDXLayout"}),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"Push style curstom monitor is a type of monitor which allow user to configure metrics format and push metrics to hertzbeat with their own service.\nHere we will introduce how to use this feature.")),(0,n.yg)("h3",{id:"push-style-custom-monitor-collection-process"},"Push style custom monitor collection process"),(0,n.yg)("p",null,"\u3010Peer Server Start Pushing Metrics\u3011 -> \u3010HertzBeat Push Module Stage Metrics\u3011-> \u3010HertzBeat Collect Module collect Metrics Periodically\u3011"),(0,n.yg)("h3",{id:"data-parsing-method"},"Data parsing method"),(0,n.yg)("p",null,"HertzBeat will parsing metrics with the format configured by user while adding new monitor."),(0,n.yg)("h3",{id:"create-monitor-steps"},"Create Monitor Steps"),(0,n.yg)("p",null,"HertzBeat DashBoard -> Service Monitor -> Push Style Monitor -> New Push Style Monitor -> set Push Module Host (hertzbeat server ip, usually 127.0.0.1/localhost) -> set Push Module Port (hertzbeat server port, usually 1157) -> configure metrics field (unit: string, type: 0 number / 1 string) -> end"),(0,n.yg)("hr",null),(0,n.yg)("h3",{id:"monitor-configuration-example"},"Monitor Configuration Example"),(0,n.yg)("p",null,(0,n.yg)("img",{alt:"HertzBeat",src:r(40789).A,width:"1310",height:"622"})))}p.isMDXComponent=!0},40789:(e,t,r)=>{r.d(t,{A:()=>o});const o=r.p+"assets/images/extend-push-example-1-ed2ca911aa1f2006d018bff471c83440.png"}}]);