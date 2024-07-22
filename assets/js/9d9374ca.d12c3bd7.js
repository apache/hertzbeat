"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[89473],{15680:(e,t,n)=>{n.d(t,{xA:()=>c,yg:()=>m});var i=n(96540);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,i)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,i,r=function(e,t){if(null==e)return{};var n,i,r={},a=Object.keys(e);for(i=0;i<a.length;i++)n=a[i],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(i=0;i<a.length;i++)n=a[i],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var p=i.createContext({}),s=function(e){var t=i.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},c=function(e){var t=s(e.components);return i.createElement(p.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return i.createElement(i.Fragment,{},t)}},g=i.forwardRef((function(e,t){var n=e.components,r=e.mdxType,a=e.originalType,p=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),g=s(n),m=r,d=g["".concat(p,".").concat(m)]||g[m]||u[m]||a;return n?i.createElement(d,o(o({ref:t},c),{},{components:n})):i.createElement(d,o({ref:t},c))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var a=n.length,o=new Array(a);o[0]=g;var l={};for(var p in t)hasOwnProperty.call(t,p)&&(l[p]=t[p]);l.originalType=e,l.mdxType="string"==typeof e?e:r,o[1]=l;for(var s=2;s<a;s++)o[s]=n[s];return i.createElement.apply(null,o)}return i.createElement.apply(null,n)}g.displayName="MDXCreateElement"},67266:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>o,default:()=>u,frontMatter:()=>a,metadata:()=>l,toc:()=>s});var i=n(58168),r=(n(96540),n(15680));const a={id:"plugin",title:"Custom plugin",sidebar_label:"Custom plugin"},o=void 0,l={unversionedId:"help/plugin",id:"help/plugin",title:"Custom plugin",description:"Custom plugins",source:"@site/docs/help/plugin.md",sourceDirName:"help",slug:"/help/plugin",permalink:"/docs/help/plugin",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/help/plugin.md",tags:[],version:"current",frontMatter:{id:"plugin",title:"Custom plugin",sidebar_label:"Custom plugin"},sidebar:"docs",previous:{title:"Common issues",permalink:"/docs/help/issue"},next:{title:"Time Expression",permalink:"/docs/help/time_expression"}},p={},s=[{value:"Custom plugins",id:"custom-plugins",level:2},{value:"Introduction",id:"introduction",level:3},{value:"Specific uses",id:"specific-uses",level:3}],c={toc:s};function u(e){let{components:t,...a}=e;return(0,r.yg)("wrapper",(0,i.A)({},c,a,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("h2",{id:"custom-plugins"},"Custom plugins"),(0,r.yg)("h3",{id:"introduction"},"Introduction"),(0,r.yg)("p",null,"Currently, ",(0,r.yg)("inlineCode",{parentName:"p"},"Hertzbeat")," relies on the ",(0,r.yg)("inlineCode",{parentName:"p"},"alert")," module to notify the user, and then the user can take actions such as sending requests, executing ",(0,r.yg)("inlineCode",{parentName:"p"},"sql"),", executing ",(0,r.yg)("inlineCode",{parentName:"p"},"shell")," scripts, etc. However, this can only be automated manually or by ",(0,r.yg)("inlineCode",{parentName:"p"},"webhook")," to receive the alert message.\nHowever, at present, it is only possible to automate the process by receiving alert messages manually or through a ",(0,r.yg)("inlineCode",{parentName:"p"},"webhook"),". For this reason, ",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," has added a new ",(0,r.yg)("inlineCode",{parentName:"p"},"plugin")," module, which has a generic interface ",(0,r.yg)("inlineCode",{parentName:"p"},"Plugin"),", which allows users to implement the ",(0,r.yg)("inlineCode",{parentName:"p"},"alert")," method of this interface and receive the ",(0,r.yg)("inlineCode",{parentName:"p"},"Alert")," class as a parameter to customize the operation.\nAfter adding the customized code, you only need to package the ",(0,r.yg)("inlineCode",{parentName:"p"},"plugin")," module, copy it to the ",(0,r.yg)("inlineCode",{parentName:"p"},"/ext-lib")," folder under the installation directory, restart the ",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," main program, and then you can execute the customized function after the alert, without having to re-package and deploy the whole program by yourself.\nCurrently, ",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," only set up the trigger ",(0,r.yg)("inlineCode",{parentName:"p"},"alert")," method after alarm, if you need to set up the trigger method at the time of acquisition, startup program, etc., please mention ",(0,r.yg)("inlineCode",{parentName:"p"},"Task")," in ",(0,r.yg)("inlineCode",{parentName:"p"},"https://github.com/apache/hertzbeat/issues/new/choose"),"."),(0,r.yg)("h3",{id:"specific-uses"},"Specific uses"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"Pull the master branch code ",(0,r.yg)("inlineCode",{parentName:"li"},"git clone https://github.com/apache/hertzbeat.git")," and locate the ",(0,r.yg)("inlineCode",{parentName:"li"},"plugin")," module's\n",(0,r.yg)("inlineCode",{parentName:"li"},"Plugin")," interface.\n",(0,r.yg)("img",{alt:"plugin-1.png",src:n(57497).A,width:"1414",height:"802"})),(0,r.yg)("li",{parentName:"ol"},"In the ",(0,r.yg)("inlineCode",{parentName:"li"},"org.apache.hertzbeat.plugin.impl")," directory, create a new interface implementation class, such as ",(0,r.yg)("inlineCode",{parentName:"li"},"org.apache.hertzbeat.plugin.impl.DemoPluginImpl"),", and receive the ",(0,r.yg)("inlineCode",{parentName:"li"},"Alert")," class as a parameter, implement the ",(0,r.yg)("inlineCode",{parentName:"li"},"alert ")," method, the logic is customized by the user, here we simply print the object.\n",(0,r.yg)("img",{alt:"plugin-2.png",src:n(43490).A,width:"900",height:"845"})),(0,r.yg)("li",{parentName:"ol"},"Package the ",(0,r.yg)("inlineCode",{parentName:"li"},"hertzbeat-plugin")," module.\n",(0,r.yg)("img",{alt:"plugin-3.png",src:n(90795).A,width:"437",height:"754"})),(0,r.yg)("li",{parentName:"ol"},"Copy the packaged ",(0,r.yg)("inlineCode",{parentName:"li"},"jar")," package to the ",(0,r.yg)("inlineCode",{parentName:"li"},"ext-lib")," directory under the installation directory (for ",(0,r.yg)("inlineCode",{parentName:"li"},"docker")," installations, mount the ",(0,r.yg)("inlineCode",{parentName:"li"},"ext-lib")," directory first, then copy it there).\n",(0,r.yg)("img",{alt:"plugin-4.png",src:n(15156).A,width:"917",height:"362"})),(0,r.yg)("li",{parentName:"ol"},"Then restart ",(0,r.yg)("inlineCode",{parentName:"li"},"HertzBeat")," to enable the customized post-alert handling policy.")))}u.isMDXComponent=!0},57497:(e,t,n)=>{n.d(t,{A:()=>i});const i=n.p+"assets/images/plugin-1-2895d6c2b5cdb1e30f2dfae90ee2ae27.png"},43490:(e,t,n)=>{n.d(t,{A:()=>i});const i=n.p+"assets/images/plugin-2-7cb158f121cae75afea843c50be78154.png"},90795:(e,t,n)=>{n.d(t,{A:()=>i});const i=n.p+"assets/images/plugin-3-bce1b0e6651562373b70e3c136d82e94.png"},15156:(e,t,n)=>{n.d(t,{A:()=>i});const i=n.p+"assets/images/plugin-4-79e2617040cf26f463157bb27810b9d5.png"}}]);