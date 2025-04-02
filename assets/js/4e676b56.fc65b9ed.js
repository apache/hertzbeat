"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[52054],{15680:(e,t,o)=>{o.d(t,{xA:()=>d,yg:()=>g});var a=o(96540);function r(e,t,o){return t in e?Object.defineProperty(e,t,{value:o,enumerable:!0,configurable:!0,writable:!0}):e[t]=o,e}function n(e,t){var o=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),o.push.apply(o,a)}return o}function i(e){for(var t=1;t<arguments.length;t++){var o=null!=arguments[t]?arguments[t]:{};t%2?n(Object(o),!0).forEach((function(t){r(e,t,o[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(o)):n(Object(o)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(o,t))}))}return e}function c(e,t){if(null==e)return{};var o,a,r=function(e,t){if(null==e)return{};var o,a,r={},n=Object.keys(e);for(a=0;a<n.length;a++)o=n[a],t.indexOf(o)>=0||(r[o]=e[o]);return r}(e,t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);for(a=0;a<n.length;a++)o=n[a],t.indexOf(o)>=0||Object.prototype.propertyIsEnumerable.call(e,o)&&(r[o]=e[o])}return r}var l=a.createContext({}),s=function(e){var t=a.useContext(l),o=t;return e&&(o="function"==typeof e?e(t):i(i({},t),e)),o},d=function(e){var t=s(e.components);return a.createElement(l.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},h=a.forwardRef((function(e,t){var o=e.components,r=e.mdxType,n=e.originalType,l=e.parentName,d=c(e,["components","mdxType","originalType","parentName"]),h=s(o),g=r,m=h["".concat(l,".").concat(g)]||h[g]||p[g]||n;return o?a.createElement(m,i(i({ref:t},d),{},{components:o})):a.createElement(m,i({ref:t},d))}));function g(e,t){var o=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var n=o.length,i=new Array(n);i[0]=h;var c={};for(var l in t)hasOwnProperty.call(t,l)&&(c[l]=t[l]);c.originalType=e,c.mdxType="string"==typeof e?e:r,i[1]=c;for(var s=2;s<n;s++)i[s]=o[s];return a.createElement.apply(null,i)}return a.createElement.apply(null,o)}h.displayName="MDXCreateElement"},33671:(e,t,o)=>{o.r(t),o.d(t,{assets:()=>l,contentTitle:()=>i,default:()=>p,frontMatter:()=>n,metadata:()=>c,toc:()=>s});var a=o(58168),r=(o(96540),o(15680));const n={id:"alert_discord",title:"Alert Discord Bot Notifications",sidebar_label:"Alert Discord bot notification",keywords:["open source monitoring tool","open source alerter","open source Discord bot notification"]},i=void 0,c={unversionedId:"help/alert_discord",id:"version-v1.6.x/help/alert_discord",title:"Alert Discord Bot Notifications",description:"Send an alarm message after the threshold is triggered, and notify the recipient through the Discord robot.",source:"@site/versioned_docs/version-v1.6.x/help/alert_discord.md",sourceDirName:"help",slug:"/help/alert_discord",permalink:"/docs/v1.6.x/help/alert_discord",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/alert_discord.md",tags:[],version:"v1.6.x",frontMatter:{id:"alert_discord",title:"Alert Discord Bot Notifications",sidebar_label:"Alert Discord bot notification",keywords:["open source monitoring tool","open source alerter","open source Discord bot notification"]},sidebar:"docs",previous:{title:"Alert webHook notification",permalink:"/docs/v1.6.x/help/alert_webhook"},next:{title:"Alert Slack Webhook Notification",permalink:"/docs/v1.6.x/help/alert_slack"}},l={},s=[{value:"Steps",id:"steps",level:2},{value:"Create an application in Discord, create a robot under the application, and get the robot Token",id:"create-an-application-in-discord-create-a-robot-under-the-application-and-get-the-robot-token",level:3},{value:"Enable developer mode and get Channel ID",id:"enable-developer-mode-and-get-channel-id",level:3},{value:"Add an alarm notification person in HertzBeat, the notification method is Discord Bot",id:"add-an-alarm-notification-person-in-hertzbeat-the-notification-method-is-discord-bot",level:3},{value:"Discord Bot Notification FAQ",id:"discord-bot-notification-faq",level:3}],d={toc:s};function p(e){let{components:t,...n}=e;return(0,r.yg)("wrapper",(0,a.A)({},d,n,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Send an alarm message after the threshold is triggered, and notify the recipient through the Discord robot.")),(0,r.yg)("h2",{id:"steps"},"Steps"),(0,r.yg)("h3",{id:"create-an-application-in-discord-create-a-robot-under-the-application-and-get-the-robot-token"},"Create an application in Discord, create a robot under the application, and get the robot Token"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Visit ",(0,r.yg)("a",{parentName:"p",href:"https://discord.com/developers/applications"},"https://discord.com/developers/applications")," to create an application"),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(15794).A,width:"3808",height:"510"}))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Create a robot under the application and get the robot Token"),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(6505).A,width:"3800",height:"948"})),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(51680).A,width:"3806",height:"1556"}))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Authorize the bot to the chat server"),(0,r.yg)("blockquote",{parentName:"li"},(0,r.yg)("p",{parentName:"blockquote"},"Authorize the robot under the OAuth2 menu, select ",(0,r.yg)("inlineCode",{parentName:"p"},"bot")," for ",(0,r.yg)("inlineCode",{parentName:"p"},"SCOPES"),", ",(0,r.yg)("inlineCode",{parentName:"p"},"BOT PERMISSIONS")," select ",(0,r.yg)("inlineCode",{parentName:"p"},"Send Messages"))),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(3007).A,width:"3556",height:"1684"})),(0,r.yg)("blockquote",{parentName:"li"},(0,r.yg)("p",{parentName:"blockquote"},"Obtain the URL generated at the bottom, and the browser accesses this URL to officially authorize the robot, that is, to set which chat server the robot will join."))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Check if your chat server has joined robot members"),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(6678).A,width:"2784",height:"1664"})))),(0,r.yg)("h3",{id:"enable-developer-mode-and-get-channel-id"},"Enable developer mode and get Channel ID"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Personal Settings -> Advanced Settings -> Enable Developer Mode"),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(88301).A,width:"2784",height:"1664"}))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Get channel Channel ID"),(0,r.yg)("blockquote",{parentName:"li"},(0,r.yg)("p",{parentName:"blockquote"},"Right-click the chat channel you want to send the robot message to, click the COPY ID button to get the Channel ID")),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"bot",src:o(48356).A,width:"2784",height:"1664"})))),(0,r.yg)("h3",{id:"add-an-alarm-notification-person-in-hertzbeat-the-notification-method-is-discord-bot"},"Add an alarm notification person in HertzBeat, the notification method is Discord Bot"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("strong",{parentName:"p"},"[Alarm notification]"," -> ","[Add recipient]"," -> ","[Select Discord robot notification method]"," -> ","[Set robot Token and ChannelId]"," -> ","[OK]")),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"email",src:o(6019).A,width:"3816",height:"1110"}))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("strong",{parentName:"p"},"Configure the associated alarm notification strategy\u26a0\ufe0f ","[Add notification strategy]"," -> ","[Associate the recipient just set]"," -> ","[OK]")),(0,r.yg)("blockquote",{parentName:"li"},(0,r.yg)("p",{parentName:"blockquote"},(0,r.yg)("strong",{parentName:"p"},"Note \u26a0\ufe0f Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients"),".")),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("img",{alt:"email",src:o(82174).A,width:"3778",height:"1284"})))),(0,r.yg)("h3",{id:"discord-bot-notification-faq"},"Discord Bot Notification FAQ"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Discord doesn't receive bot alert notifications"),(0,r.yg)("blockquote",{parentName:"li"},(0,r.yg)("p",{parentName:"blockquote"},"Please check whether the alarm information has been triggered in the alarm center",(0,r.yg)("br",{parentName:"p"}),"\n","Please check whether the robot Token and ChannelId are configured correctly, and whether the alarm policy association has been configured",(0,r.yg)("br",{parentName:"p"}),"\n","Please check whether the bot is properly authorized by the Discord chat server  ")))),(0,r.yg)("p",null,"Other questions can be fed back through the communication group ISSUE!"))}p.isMDXComponent=!0},82174:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/alert-notice-policy-a44e898a35d581c7bb8f52bd2499387f.png"},15794:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-1-9d0b65e14924ead1442e6116e31bf4c2.png"},6505:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-2-7907568f2095b25da09696cad8de72d1.png"},51680:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-3-bc899ee5c9b15a1f5b85690764670d86.png"},3007:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-4-757e196258496be2d97af0c5f44b57a8.png"},6678:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-5-71ca8be9f969c09f246a517b04eceaad.png"},88301:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-6-cae99ad2f0afb31a246d6370968cb5d1.png"},48356:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-7-436fdcda3b47272b26262b8ee85eb7b2.png"},6019:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/discord-bot-8-fa3ec9bd0f55406493696a0bce0267db.png"}}]);