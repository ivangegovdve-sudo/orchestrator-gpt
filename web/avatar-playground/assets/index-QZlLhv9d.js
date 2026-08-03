var Tc=Object.defineProperty;var Mc=(e,t,n)=>t in e?Tc(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var Zt=(e,t,n)=>Mc(e,typeof t!="symbol"?t+"":t,n);import{T as Lc}from"./three-PrYIpVMW.js";import{l as Oc}from"./lottie-D_akyxJo.js";import{g as zc}from"./gsap-SFc2wnMY.js";import{a as Ac}from"./anime-BNELU3II.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(i){if(i.ep)return;i.ep=!0;const l=n(i);fetch(i.href,l)}})();var fs={exports:{}},Ei={},ps={exports:{}},R={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var yr=Symbol.for("react.element"),jc=Symbol.for("react.portal"),Rc=Symbol.for("react.fragment"),Ic=Symbol.for("react.strict_mode"),Dc=Symbol.for("react.profiler"),Fc=Symbol.for("react.provider"),Uc=Symbol.for("react.context"),$c=Symbol.for("react.forward_ref"),Bc=Symbol.for("react.suspense"),Hc=Symbol.for("react.memo"),Vc=Symbol.for("react.lazy"),na=Symbol.iterator;function Wc(e){return e===null||typeof e!="object"?null:(e=na&&e[na]||e["@@iterator"],typeof e=="function"?e:null)}var ms={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},hs=Object.assign,vs={};function Pn(e,t,n){this.props=e,this.context=t,this.refs=vs,this.updater=n||ms}Pn.prototype.isReactComponent={};Pn.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Pn.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function gs(){}gs.prototype=Pn.prototype;function ao(e,t,n){this.props=e,this.context=t,this.refs=vs,this.updater=n||ms}var so=ao.prototype=new gs;so.constructor=ao;hs(so,Pn.prototype);so.isPureReactComponent=!0;var ra=Array.isArray,ys=Object.prototype.hasOwnProperty,uo={current:null},ws={key:!0,ref:!0,__self:!0,__source:!0};function ks(e,t,n){var r,i={},l=null,o=null;if(t!=null)for(r in t.ref!==void 0&&(o=t.ref),t.key!==void 0&&(l=""+t.key),t)ys.call(t,r)&&!ws.hasOwnProperty(r)&&(i[r]=t[r]);var a=arguments.length-2;if(a===1)i.children=n;else if(1<a){for(var s=Array(a),u=0;u<a;u++)s[u]=arguments[u+2];i.children=s}if(e&&e.defaultProps)for(r in a=e.defaultProps,a)i[r]===void 0&&(i[r]=a[r]);return{$$typeof:yr,type:e,key:l,ref:o,props:i,_owner:uo.current}}function Qc(e,t){return{$$typeof:yr,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function co(e){return typeof e=="object"&&e!==null&&e.$$typeof===yr}function Gc(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var ia=/\/+/g;function Hi(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Gc(""+e.key):t.toString(36)}function Br(e,t,n,r,i){var l=typeof e;(l==="undefined"||l==="boolean")&&(e=null);var o=!1;if(e===null)o=!0;else switch(l){case"string":case"number":o=!0;break;case"object":switch(e.$$typeof){case yr:case jc:o=!0}}if(o)return o=e,i=i(o),e=r===""?"."+Hi(o,0):r,ra(i)?(n="",e!=null&&(n=e.replace(ia,"$&/")+"/"),Br(i,t,n,"",function(u){return u})):i!=null&&(co(i)&&(i=Qc(i,n+(!i.key||o&&o.key===i.key?"":(""+i.key).replace(ia,"$&/")+"/")+e)),t.push(i)),1;if(o=0,r=r===""?".":r+":",ra(e))for(var a=0;a<e.length;a++){l=e[a];var s=r+Hi(l,a);o+=Br(l,t,n,s,i)}else if(s=Wc(e),typeof s=="function")for(e=s.call(e),a=0;!(l=e.next()).done;)l=l.value,s=r+Hi(l,a++),o+=Br(l,t,n,s,i);else if(l==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return o}function Cr(e,t,n){if(e==null)return e;var r=[],i=0;return Br(e,r,"","",function(l){return t.call(n,l,i++)}),r}function Yc(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var he={current:null},Hr={transition:null},Xc={ReactCurrentDispatcher:he,ReactCurrentBatchConfig:Hr,ReactCurrentOwner:uo};function Ss(){throw Error("act(...) is not supported in production builds of React.")}R.Children={map:Cr,forEach:function(e,t,n){Cr(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return Cr(e,function(){t++}),t},toArray:function(e){return Cr(e,function(t){return t})||[]},only:function(e){if(!co(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};R.Component=Pn;R.Fragment=Rc;R.Profiler=Dc;R.PureComponent=ao;R.StrictMode=Ic;R.Suspense=Bc;R.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Xc;R.act=Ss;R.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var r=hs({},e.props),i=e.key,l=e.ref,o=e._owner;if(t!=null){if(t.ref!==void 0&&(l=t.ref,o=uo.current),t.key!==void 0&&(i=""+t.key),e.type&&e.type.defaultProps)var a=e.type.defaultProps;for(s in t)ys.call(t,s)&&!ws.hasOwnProperty(s)&&(r[s]=t[s]===void 0&&a!==void 0?a[s]:t[s])}var s=arguments.length-2;if(s===1)r.children=n;else if(1<s){a=Array(s);for(var u=0;u<s;u++)a[u]=arguments[u+2];r.children=a}return{$$typeof:yr,type:e.type,key:i,ref:l,props:r,_owner:o}};R.createContext=function(e){return e={$$typeof:Uc,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Fc,_context:e},e.Consumer=e};R.createElement=ks;R.createFactory=function(e){var t=ks.bind(null,e);return t.type=e,t};R.createRef=function(){return{current:null}};R.forwardRef=function(e){return{$$typeof:$c,render:e}};R.isValidElement=co;R.lazy=function(e){return{$$typeof:Vc,_payload:{_status:-1,_result:e},_init:Yc}};R.memo=function(e,t){return{$$typeof:Hc,type:e,compare:t===void 0?null:t}};R.startTransition=function(e){var t=Hr.transition;Hr.transition={};try{e()}finally{Hr.transition=t}};R.unstable_act=Ss;R.useCallback=function(e,t){return he.current.useCallback(e,t)};R.useContext=function(e){return he.current.useContext(e)};R.useDebugValue=function(){};R.useDeferredValue=function(e){return he.current.useDeferredValue(e)};R.useEffect=function(e,t){return he.current.useEffect(e,t)};R.useId=function(){return he.current.useId()};R.useImperativeHandle=function(e,t,n){return he.current.useImperativeHandle(e,t,n)};R.useInsertionEffect=function(e,t){return he.current.useInsertionEffect(e,t)};R.useLayoutEffect=function(e,t){return he.current.useLayoutEffect(e,t)};R.useMemo=function(e,t){return he.current.useMemo(e,t)};R.useReducer=function(e,t,n){return he.current.useReducer(e,t,n)};R.useRef=function(e){return he.current.useRef(e)};R.useState=function(e){return he.current.useState(e)};R.useSyncExternalStore=function(e,t,n){return he.current.useSyncExternalStore(e,t,n)};R.useTransition=function(){return he.current.useTransition()};R.version="18.3.1";ps.exports=R;var b=ps.exports;/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Kc=b,Zc=Symbol.for("react.element"),Jc=Symbol.for("react.fragment"),qc=Object.prototype.hasOwnProperty,bc=Kc.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,ed={key:!0,ref:!0,__self:!0,__source:!0};function xs(e,t,n){var r,i={},l=null,o=null;n!==void 0&&(l=""+n),t.key!==void 0&&(l=""+t.key),t.ref!==void 0&&(o=t.ref);for(r in t)qc.call(t,r)&&!ed.hasOwnProperty(r)&&(i[r]=t[r]);if(e&&e.defaultProps)for(r in t=e.defaultProps,t)i[r]===void 0&&(i[r]=t[r]);return{$$typeof:Zc,type:e,key:l,ref:o,props:i,_owner:bc.current}}Ei.Fragment=Jc;Ei.jsx=xs;Ei.jsxs=xs;fs.exports=Ei;var _=fs.exports,Es={exports:{}},Te={},Cs={exports:{}},Ps={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(e){function t(E,O){var A=E.length;E.push(O);e:for(;0<A;){var W=A-1>>>1,J=E[W];if(0<i(J,O))E[W]=O,E[A]=J,A=W;else break e}}function n(E){return E.length===0?null:E[0]}function r(E){if(E.length===0)return null;var O=E[0],A=E.pop();if(A!==O){E[0]=A;e:for(var W=0,J=E.length,D=J>>>1;W<D;){var $=2*(W+1)-1,xe=E[$],fe=$+1,Ee=E[fe];if(0>i(xe,A))fe<J&&0>i(Ee,xe)?(E[W]=Ee,E[fe]=A,W=fe):(E[W]=xe,E[$]=A,W=$);else if(fe<J&&0>i(Ee,A))E[W]=Ee,E[fe]=A,W=fe;else break e}}return O}function i(E,O){var A=E.sortIndex-O.sortIndex;return A!==0?A:E.id-O.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;e.unstable_now=function(){return l.now()}}else{var o=Date,a=o.now();e.unstable_now=function(){return o.now()-a}}var s=[],u=[],h=1,m=null,p=3,y=!1,v=!1,w=!1,L=typeof setTimeout=="function"?setTimeout:null,d=typeof clearTimeout=="function"?clearTimeout:null,c=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function f(E){for(var O=n(u);O!==null;){if(O.callback===null)r(u);else if(O.startTime<=E)r(u),O.sortIndex=O.expirationTime,t(s,O);else break;O=n(u)}}function g(E){if(w=!1,f(E),!v)if(n(s)!==null)v=!0,at(x);else{var O=n(u);O!==null&&zt(g,O.startTime-E)}}function x(E,O){v=!1,w&&(w=!1,d(S),S=-1),y=!0;var A=p;try{for(f(O),m=n(s);m!==null&&(!(m.expirationTime>O)||E&&!U());){var W=m.callback;if(typeof W=="function"){m.callback=null,p=m.priorityLevel;var J=W(m.expirationTime<=O);O=e.unstable_now(),typeof J=="function"?m.callback=J:m===n(s)&&r(s),f(O)}else r(s);m=n(s)}if(m!==null)var D=!0;else{var $=n(u);$!==null&&zt(g,$.startTime-O),D=!1}return D}finally{m=null,p=A,y=!1}}var P=!1,N=null,S=-1,z=5,T=-1;function U(){return!(e.unstable_now()-T<z)}function Le(){if(N!==null){var E=e.unstable_now();T=E;var O=!0;try{O=N(!0,E)}finally{O?ot():(P=!1,N=null)}}else P=!1}var ot;if(typeof c=="function")ot=function(){c(Le)};else if(typeof MessageChannel<"u"){var On=new MessageChannel,Ot=On.port2;On.port1.onmessage=Le,ot=function(){Ot.postMessage(null)}}else ot=function(){L(Le,0)};function at(E){N=E,P||(P=!0,ot())}function zt(E,O){S=L(function(){E(e.unstable_now())},O)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(E){E.callback=null},e.unstable_continueExecution=function(){v||y||(v=!0,at(x))},e.unstable_forceFrameRate=function(E){0>E||125<E?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):z=0<E?Math.floor(1e3/E):5},e.unstable_getCurrentPriorityLevel=function(){return p},e.unstable_getFirstCallbackNode=function(){return n(s)},e.unstable_next=function(E){switch(p){case 1:case 2:case 3:var O=3;break;default:O=p}var A=p;p=O;try{return E()}finally{p=A}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(E,O){switch(E){case 1:case 2:case 3:case 4:case 5:break;default:E=3}var A=p;p=E;try{return O()}finally{p=A}},e.unstable_scheduleCallback=function(E,O,A){var W=e.unstable_now();switch(typeof A=="object"&&A!==null?(A=A.delay,A=typeof A=="number"&&0<A?W+A:W):A=W,E){case 1:var J=-1;break;case 2:J=250;break;case 5:J=1073741823;break;case 4:J=1e4;break;default:J=5e3}return J=A+J,E={id:h++,callback:O,priorityLevel:E,startTime:A,expirationTime:J,sortIndex:-1},A>W?(E.sortIndex=A,t(u,E),n(s)===null&&E===n(u)&&(w?(d(S),S=-1):w=!0,zt(g,A-W))):(E.sortIndex=J,t(s,E),v||y||(v=!0,at(x))),E},e.unstable_shouldYield=U,e.unstable_wrapCallback=function(E){var O=p;return function(){var A=p;p=O;try{return E.apply(this,arguments)}finally{p=A}}}})(Ps);Cs.exports=Ps;var td=Cs.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var nd=b,_e=td;function k(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Ns=new Set,tr={};function Gt(e,t){yn(e,t),yn(e+"Capture",t)}function yn(e,t){for(tr[e]=t,e=0;e<t.length;e++)Ns.add(t[e])}var tt=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),ml=Object.prototype.hasOwnProperty,rd=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,la={},oa={};function id(e){return ml.call(oa,e)?!0:ml.call(la,e)?!1:rd.test(e)?oa[e]=!0:(la[e]=!0,!1)}function ld(e,t,n,r){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function od(e,t,n,r){if(t===null||typeof t>"u"||ld(e,t,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function ve(e,t,n,r,i,l,o){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=r,this.attributeNamespace=i,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=l,this.removeEmptyString=o}var ae={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){ae[e]=new ve(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];ae[t]=new ve(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){ae[e]=new ve(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){ae[e]=new ve(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){ae[e]=new ve(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){ae[e]=new ve(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){ae[e]=new ve(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){ae[e]=new ve(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){ae[e]=new ve(e,5,!1,e.toLowerCase(),null,!1,!1)});var fo=/[\-:]([a-z])/g;function po(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(fo,po);ae[t]=new ve(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(fo,po);ae[t]=new ve(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(fo,po);ae[t]=new ve(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){ae[e]=new ve(e,1,!1,e.toLowerCase(),null,!1,!1)});ae.xlinkHref=new ve("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){ae[e]=new ve(e,1,!1,e.toLowerCase(),null,!0,!0)});function mo(e,t,n,r){var i=ae.hasOwnProperty(t)?ae[t]:null;(i!==null?i.type!==0:r||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(od(t,n,i,r)&&(n=null),r||i===null?id(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):i.mustUseProperty?e[i.propertyName]=n===null?i.type===3?!1:"":n:(t=i.attributeName,r=i.attributeNamespace,n===null?e.removeAttribute(t):(i=i.type,n=i===3||i===4&&n===!0?"":""+n,r?e.setAttributeNS(r,t,n):e.setAttribute(t,n))))}var lt=nd.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Pr=Symbol.for("react.element"),bt=Symbol.for("react.portal"),en=Symbol.for("react.fragment"),ho=Symbol.for("react.strict_mode"),hl=Symbol.for("react.profiler"),_s=Symbol.for("react.provider"),Ts=Symbol.for("react.context"),vo=Symbol.for("react.forward_ref"),vl=Symbol.for("react.suspense"),gl=Symbol.for("react.suspense_list"),go=Symbol.for("react.memo"),dt=Symbol.for("react.lazy"),Ms=Symbol.for("react.offscreen"),aa=Symbol.iterator;function zn(e){return e===null||typeof e!="object"?null:(e=aa&&e[aa]||e["@@iterator"],typeof e=="function"?e:null)}var K=Object.assign,Vi;function Hn(e){if(Vi===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);Vi=t&&t[1]||""}return`
`+Vi+e}var Wi=!1;function Qi(e,t){if(!e||Wi)return"";Wi=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(u){var r=u}Reflect.construct(e,[],t)}else{try{t.call()}catch(u){r=u}e.call(t.prototype)}else{try{throw Error()}catch(u){r=u}e()}}catch(u){if(u&&r&&typeof u.stack=="string"){for(var i=u.stack.split(`
`),l=r.stack.split(`
`),o=i.length-1,a=l.length-1;1<=o&&0<=a&&i[o]!==l[a];)a--;for(;1<=o&&0<=a;o--,a--)if(i[o]!==l[a]){if(o!==1||a!==1)do if(o--,a--,0>a||i[o]!==l[a]){var s=`
`+i[o].replace(" at new "," at ");return e.displayName&&s.includes("<anonymous>")&&(s=s.replace("<anonymous>",e.displayName)),s}while(1<=o&&0<=a);break}}}finally{Wi=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?Hn(e):""}function ad(e){switch(e.tag){case 5:return Hn(e.type);case 16:return Hn("Lazy");case 13:return Hn("Suspense");case 19:return Hn("SuspenseList");case 0:case 2:case 15:return e=Qi(e.type,!1),e;case 11:return e=Qi(e.type.render,!1),e;case 1:return e=Qi(e.type,!0),e;default:return""}}function yl(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case en:return"Fragment";case bt:return"Portal";case hl:return"Profiler";case ho:return"StrictMode";case vl:return"Suspense";case gl:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case Ts:return(e.displayName||"Context")+".Consumer";case _s:return(e._context.displayName||"Context")+".Provider";case vo:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case go:return t=e.displayName||null,t!==null?t:yl(e.type)||"Memo";case dt:t=e._payload,e=e._init;try{return yl(e(t))}catch{}}return null}function sd(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return yl(t);case 8:return t===ho?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Nt(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function Ls(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function ud(e){var t=Ls(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),r=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var i=n.get,l=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return i.call(this)},set:function(o){r=""+o,l.call(this,o)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(o){r=""+o},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Nr(e){e._valueTracker||(e._valueTracker=ud(e))}function Os(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),r="";return e&&(r=Ls(e)?e.checked?"true":"false":e.value),e=r,e!==n?(t.setValue(e),!0):!1}function br(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function wl(e,t){var n=t.checked;return K({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function sa(e,t){var n=t.defaultValue==null?"":t.defaultValue,r=t.checked!=null?t.checked:t.defaultChecked;n=Nt(t.value!=null?t.value:n),e._wrapperState={initialChecked:r,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function zs(e,t){t=t.checked,t!=null&&mo(e,"checked",t,!1)}function kl(e,t){zs(e,t);var n=Nt(t.value),r=t.type;if(n!=null)r==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(r==="submit"||r==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?Sl(e,t.type,n):t.hasOwnProperty("defaultValue")&&Sl(e,t.type,Nt(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function ua(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var r=t.type;if(!(r!=="submit"&&r!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function Sl(e,t,n){(t!=="number"||br(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}var Vn=Array.isArray;function fn(e,t,n,r){if(e=e.options,t){t={};for(var i=0;i<n.length;i++)t["$"+n[i]]=!0;for(n=0;n<e.length;n++)i=t.hasOwnProperty("$"+e[n].value),e[n].selected!==i&&(e[n].selected=i),i&&r&&(e[n].defaultSelected=!0)}else{for(n=""+Nt(n),t=null,i=0;i<e.length;i++){if(e[i].value===n){e[i].selected=!0,r&&(e[i].defaultSelected=!0);return}t!==null||e[i].disabled||(t=e[i])}t!==null&&(t.selected=!0)}}function xl(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(k(91));return K({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function ca(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(k(92));if(Vn(n)){if(1<n.length)throw Error(k(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:Nt(n)}}function As(e,t){var n=Nt(t.value),r=Nt(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),r!=null&&(e.defaultValue=""+r)}function da(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function js(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function El(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?js(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var _r,Rs=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,r,i){MSApp.execUnsafeLocalFunction(function(){return e(t,n,r,i)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(_r=_r||document.createElement("div"),_r.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=_r.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function nr(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var Gn={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},cd=["Webkit","ms","Moz","O"];Object.keys(Gn).forEach(function(e){cd.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Gn[t]=Gn[e]})});function Is(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||Gn.hasOwnProperty(e)&&Gn[e]?(""+t).trim():t+"px"}function Ds(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var r=n.indexOf("--")===0,i=Is(n,t[n],r);n==="float"&&(n="cssFloat"),r?e.setProperty(n,i):e[n]=i}}var dd=K({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Cl(e,t){if(t){if(dd[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(k(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(k(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(k(61))}if(t.style!=null&&typeof t.style!="object")throw Error(k(62))}}function Pl(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Nl=null;function yo(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var _l=null,pn=null,mn=null;function fa(e){if(e=Sr(e)){if(typeof _l!="function")throw Error(k(280));var t=e.stateNode;t&&(t=Ti(t),_l(e.stateNode,e.type,t))}}function Fs(e){pn?mn?mn.push(e):mn=[e]:pn=e}function Us(){if(pn){var e=pn,t=mn;if(mn=pn=null,fa(e),t)for(e=0;e<t.length;e++)fa(t[e])}}function $s(e,t){return e(t)}function Bs(){}var Gi=!1;function Hs(e,t,n){if(Gi)return e(t,n);Gi=!0;try{return $s(e,t,n)}finally{Gi=!1,(pn!==null||mn!==null)&&(Bs(),Us())}}function rr(e,t){var n=e.stateNode;if(n===null)return null;var r=Ti(n);if(r===null)return null;n=r[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(e=e.type,r=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!r;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(k(231,t,typeof n));return n}var Tl=!1;if(tt)try{var An={};Object.defineProperty(An,"passive",{get:function(){Tl=!0}}),window.addEventListener("test",An,An),window.removeEventListener("test",An,An)}catch{Tl=!1}function fd(e,t,n,r,i,l,o,a,s){var u=Array.prototype.slice.call(arguments,3);try{t.apply(n,u)}catch(h){this.onError(h)}}var Yn=!1,ei=null,ti=!1,Ml=null,pd={onError:function(e){Yn=!0,ei=e}};function md(e,t,n,r,i,l,o,a,s){Yn=!1,ei=null,fd.apply(pd,arguments)}function hd(e,t,n,r,i,l,o,a,s){if(md.apply(this,arguments),Yn){if(Yn){var u=ei;Yn=!1,ei=null}else throw Error(k(198));ti||(ti=!0,Ml=u)}}function Yt(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function Vs(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function pa(e){if(Yt(e)!==e)throw Error(k(188))}function vd(e){var t=e.alternate;if(!t){if(t=Yt(e),t===null)throw Error(k(188));return t!==e?null:e}for(var n=e,r=t;;){var i=n.return;if(i===null)break;var l=i.alternate;if(l===null){if(r=i.return,r!==null){n=r;continue}break}if(i.child===l.child){for(l=i.child;l;){if(l===n)return pa(i),e;if(l===r)return pa(i),t;l=l.sibling}throw Error(k(188))}if(n.return!==r.return)n=i,r=l;else{for(var o=!1,a=i.child;a;){if(a===n){o=!0,n=i,r=l;break}if(a===r){o=!0,r=i,n=l;break}a=a.sibling}if(!o){for(a=l.child;a;){if(a===n){o=!0,n=l,r=i;break}if(a===r){o=!0,r=l,n=i;break}a=a.sibling}if(!o)throw Error(k(189))}}if(n.alternate!==r)throw Error(k(190))}if(n.tag!==3)throw Error(k(188));return n.stateNode.current===n?e:t}function Ws(e){return e=vd(e),e!==null?Qs(e):null}function Qs(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=Qs(e);if(t!==null)return t;e=e.sibling}return null}var Gs=_e.unstable_scheduleCallback,ma=_e.unstable_cancelCallback,gd=_e.unstable_shouldYield,yd=_e.unstable_requestPaint,q=_e.unstable_now,wd=_e.unstable_getCurrentPriorityLevel,wo=_e.unstable_ImmediatePriority,Ys=_e.unstable_UserBlockingPriority,ni=_e.unstable_NormalPriority,kd=_e.unstable_LowPriority,Xs=_e.unstable_IdlePriority,Ci=null,Xe=null;function Sd(e){if(Xe&&typeof Xe.onCommitFiberRoot=="function")try{Xe.onCommitFiberRoot(Ci,e,void 0,(e.current.flags&128)===128)}catch{}}var Be=Math.clz32?Math.clz32:Cd,xd=Math.log,Ed=Math.LN2;function Cd(e){return e>>>=0,e===0?32:31-(xd(e)/Ed|0)|0}var Tr=64,Mr=4194304;function Wn(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function ri(e,t){var n=e.pendingLanes;if(n===0)return 0;var r=0,i=e.suspendedLanes,l=e.pingedLanes,o=n&268435455;if(o!==0){var a=o&~i;a!==0?r=Wn(a):(l&=o,l!==0&&(r=Wn(l)))}else o=n&~i,o!==0?r=Wn(o):l!==0&&(r=Wn(l));if(r===0)return 0;if(t!==0&&t!==r&&!(t&i)&&(i=r&-r,l=t&-t,i>=l||i===16&&(l&4194240)!==0))return t;if(r&4&&(r|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=r;0<t;)n=31-Be(t),i=1<<n,r|=e[n],t&=~i;return r}function Pd(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Nd(e,t){for(var n=e.suspendedLanes,r=e.pingedLanes,i=e.expirationTimes,l=e.pendingLanes;0<l;){var o=31-Be(l),a=1<<o,s=i[o];s===-1?(!(a&n)||a&r)&&(i[o]=Pd(a,t)):s<=t&&(e.expiredLanes|=a),l&=~a}}function Ll(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Ks(){var e=Tr;return Tr<<=1,!(Tr&4194240)&&(Tr=64),e}function Yi(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function wr(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Be(t),e[t]=n}function _d(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var r=e.eventTimes;for(e=e.expirationTimes;0<n;){var i=31-Be(n),l=1<<i;t[i]=0,r[i]=-1,e[i]=-1,n&=~l}}function ko(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var r=31-Be(n),i=1<<r;i&t|e[r]&t&&(e[r]|=t),n&=~i}}var F=0;function Zs(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var Js,So,qs,bs,eu,Ol=!1,Lr=[],yt=null,wt=null,kt=null,ir=new Map,lr=new Map,mt=[],Td="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function ha(e,t){switch(e){case"focusin":case"focusout":yt=null;break;case"dragenter":case"dragleave":wt=null;break;case"mouseover":case"mouseout":kt=null;break;case"pointerover":case"pointerout":ir.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":lr.delete(t.pointerId)}}function jn(e,t,n,r,i,l){return e===null||e.nativeEvent!==l?(e={blockedOn:t,domEventName:n,eventSystemFlags:r,nativeEvent:l,targetContainers:[i]},t!==null&&(t=Sr(t),t!==null&&So(t)),e):(e.eventSystemFlags|=r,t=e.targetContainers,i!==null&&t.indexOf(i)===-1&&t.push(i),e)}function Md(e,t,n,r,i){switch(t){case"focusin":return yt=jn(yt,e,t,n,r,i),!0;case"dragenter":return wt=jn(wt,e,t,n,r,i),!0;case"mouseover":return kt=jn(kt,e,t,n,r,i),!0;case"pointerover":var l=i.pointerId;return ir.set(l,jn(ir.get(l)||null,e,t,n,r,i)),!0;case"gotpointercapture":return l=i.pointerId,lr.set(l,jn(lr.get(l)||null,e,t,n,r,i)),!0}return!1}function tu(e){var t=It(e.target);if(t!==null){var n=Yt(t);if(n!==null){if(t=n.tag,t===13){if(t=Vs(n),t!==null){e.blockedOn=t,eu(e.priority,function(){qs(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Vr(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=zl(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var r=new n.constructor(n.type,n);Nl=r,n.target.dispatchEvent(r),Nl=null}else return t=Sr(n),t!==null&&So(t),e.blockedOn=n,!1;t.shift()}return!0}function va(e,t,n){Vr(e)&&n.delete(t)}function Ld(){Ol=!1,yt!==null&&Vr(yt)&&(yt=null),wt!==null&&Vr(wt)&&(wt=null),kt!==null&&Vr(kt)&&(kt=null),ir.forEach(va),lr.forEach(va)}function Rn(e,t){e.blockedOn===t&&(e.blockedOn=null,Ol||(Ol=!0,_e.unstable_scheduleCallback(_e.unstable_NormalPriority,Ld)))}function or(e){function t(i){return Rn(i,e)}if(0<Lr.length){Rn(Lr[0],e);for(var n=1;n<Lr.length;n++){var r=Lr[n];r.blockedOn===e&&(r.blockedOn=null)}}for(yt!==null&&Rn(yt,e),wt!==null&&Rn(wt,e),kt!==null&&Rn(kt,e),ir.forEach(t),lr.forEach(t),n=0;n<mt.length;n++)r=mt[n],r.blockedOn===e&&(r.blockedOn=null);for(;0<mt.length&&(n=mt[0],n.blockedOn===null);)tu(n),n.blockedOn===null&&mt.shift()}var hn=lt.ReactCurrentBatchConfig,ii=!0;function Od(e,t,n,r){var i=F,l=hn.transition;hn.transition=null;try{F=1,xo(e,t,n,r)}finally{F=i,hn.transition=l}}function zd(e,t,n,r){var i=F,l=hn.transition;hn.transition=null;try{F=4,xo(e,t,n,r)}finally{F=i,hn.transition=l}}function xo(e,t,n,r){if(ii){var i=zl(e,t,n,r);if(i===null)rl(e,t,r,li,n),ha(e,r);else if(Md(i,e,t,n,r))r.stopPropagation();else if(ha(e,r),t&4&&-1<Td.indexOf(e)){for(;i!==null;){var l=Sr(i);if(l!==null&&Js(l),l=zl(e,t,n,r),l===null&&rl(e,t,r,li,n),l===i)break;i=l}i!==null&&r.stopPropagation()}else rl(e,t,r,null,n)}}var li=null;function zl(e,t,n,r){if(li=null,e=yo(r),e=It(e),e!==null)if(t=Yt(e),t===null)e=null;else if(n=t.tag,n===13){if(e=Vs(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return li=e,null}function nu(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(wd()){case wo:return 1;case Ys:return 4;case ni:case kd:return 16;case Xs:return 536870912;default:return 16}default:return 16}}var vt=null,Eo=null,Wr=null;function ru(){if(Wr)return Wr;var e,t=Eo,n=t.length,r,i="value"in vt?vt.value:vt.textContent,l=i.length;for(e=0;e<n&&t[e]===i[e];e++);var o=n-e;for(r=1;r<=o&&t[n-r]===i[l-r];r++);return Wr=i.slice(e,1<r?1-r:void 0)}function Qr(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function Or(){return!0}function ga(){return!1}function Me(e){function t(n,r,i,l,o){this._reactName=n,this._targetInst=i,this.type=r,this.nativeEvent=l,this.target=o,this.currentTarget=null;for(var a in e)e.hasOwnProperty(a)&&(n=e[a],this[a]=n?n(l):l[a]);return this.isDefaultPrevented=(l.defaultPrevented!=null?l.defaultPrevented:l.returnValue===!1)?Or:ga,this.isPropagationStopped=ga,this}return K(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=Or)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=Or)},persist:function(){},isPersistent:Or}),t}var Nn={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Co=Me(Nn),kr=K({},Nn,{view:0,detail:0}),Ad=Me(kr),Xi,Ki,In,Pi=K({},kr,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Po,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==In&&(In&&e.type==="mousemove"?(Xi=e.screenX-In.screenX,Ki=e.screenY-In.screenY):Ki=Xi=0,In=e),Xi)},movementY:function(e){return"movementY"in e?e.movementY:Ki}}),ya=Me(Pi),jd=K({},Pi,{dataTransfer:0}),Rd=Me(jd),Id=K({},kr,{relatedTarget:0}),Zi=Me(Id),Dd=K({},Nn,{animationName:0,elapsedTime:0,pseudoElement:0}),Fd=Me(Dd),Ud=K({},Nn,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),$d=Me(Ud),Bd=K({},Nn,{data:0}),wa=Me(Bd),Hd={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Vd={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Wd={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Qd(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Wd[e])?!!t[e]:!1}function Po(){return Qd}var Gd=K({},kr,{key:function(e){if(e.key){var t=Hd[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Qr(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?Vd[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Po,charCode:function(e){return e.type==="keypress"?Qr(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Qr(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Yd=Me(Gd),Xd=K({},Pi,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),ka=Me(Xd),Kd=K({},kr,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Po}),Zd=Me(Kd),Jd=K({},Nn,{propertyName:0,elapsedTime:0,pseudoElement:0}),qd=Me(Jd),bd=K({},Pi,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),ef=Me(bd),tf=[9,13,27,32],No=tt&&"CompositionEvent"in window,Xn=null;tt&&"documentMode"in document&&(Xn=document.documentMode);var nf=tt&&"TextEvent"in window&&!Xn,iu=tt&&(!No||Xn&&8<Xn&&11>=Xn),Sa=" ",xa=!1;function lu(e,t){switch(e){case"keyup":return tf.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function ou(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var tn=!1;function rf(e,t){switch(e){case"compositionend":return ou(t);case"keypress":return t.which!==32?null:(xa=!0,Sa);case"textInput":return e=t.data,e===Sa&&xa?null:e;default:return null}}function lf(e,t){if(tn)return e==="compositionend"||!No&&lu(e,t)?(e=ru(),Wr=Eo=vt=null,tn=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return iu&&t.locale!=="ko"?null:t.data;default:return null}}var of={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Ea(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!of[e.type]:t==="textarea"}function au(e,t,n,r){Fs(r),t=oi(t,"onChange"),0<t.length&&(n=new Co("onChange","change",null,n,r),e.push({event:n,listeners:t}))}var Kn=null,ar=null;function af(e){yu(e,0)}function Ni(e){var t=ln(e);if(Os(t))return e}function sf(e,t){if(e==="change")return t}var su=!1;if(tt){var Ji;if(tt){var qi="oninput"in document;if(!qi){var Ca=document.createElement("div");Ca.setAttribute("oninput","return;"),qi=typeof Ca.oninput=="function"}Ji=qi}else Ji=!1;su=Ji&&(!document.documentMode||9<document.documentMode)}function Pa(){Kn&&(Kn.detachEvent("onpropertychange",uu),ar=Kn=null)}function uu(e){if(e.propertyName==="value"&&Ni(ar)){var t=[];au(t,ar,e,yo(e)),Hs(af,t)}}function uf(e,t,n){e==="focusin"?(Pa(),Kn=t,ar=n,Kn.attachEvent("onpropertychange",uu)):e==="focusout"&&Pa()}function cf(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return Ni(ar)}function df(e,t){if(e==="click")return Ni(t)}function ff(e,t){if(e==="input"||e==="change")return Ni(t)}function pf(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Ve=typeof Object.is=="function"?Object.is:pf;function sr(e,t){if(Ve(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),r=Object.keys(t);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var i=n[r];if(!ml.call(t,i)||!Ve(e[i],t[i]))return!1}return!0}function Na(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function _a(e,t){var n=Na(e);e=0;for(var r;n;){if(n.nodeType===3){if(r=e+n.textContent.length,e<=t&&r>=t)return{node:n,offset:t-e};e=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=Na(n)}}function cu(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?cu(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function du(){for(var e=window,t=br();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=br(e.document)}return t}function _o(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function mf(e){var t=du(),n=e.focusedElem,r=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&cu(n.ownerDocument.documentElement,n)){if(r!==null&&_o(n)){if(t=r.start,e=r.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var i=n.textContent.length,l=Math.min(r.start,i);r=r.end===void 0?l:Math.min(r.end,i),!e.extend&&l>r&&(i=r,r=l,l=i),i=_a(n,l);var o=_a(n,r);i&&o&&(e.rangeCount!==1||e.anchorNode!==i.node||e.anchorOffset!==i.offset||e.focusNode!==o.node||e.focusOffset!==o.offset)&&(t=t.createRange(),t.setStart(i.node,i.offset),e.removeAllRanges(),l>r?(e.addRange(t),e.extend(o.node,o.offset)):(t.setEnd(o.node,o.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var hf=tt&&"documentMode"in document&&11>=document.documentMode,nn=null,Al=null,Zn=null,jl=!1;function Ta(e,t,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;jl||nn==null||nn!==br(r)||(r=nn,"selectionStart"in r&&_o(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Zn&&sr(Zn,r)||(Zn=r,r=oi(Al,"onSelect"),0<r.length&&(t=new Co("onSelect","select",null,t,n),e.push({event:t,listeners:r}),t.target=nn)))}function zr(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var rn={animationend:zr("Animation","AnimationEnd"),animationiteration:zr("Animation","AnimationIteration"),animationstart:zr("Animation","AnimationStart"),transitionend:zr("Transition","TransitionEnd")},bi={},fu={};tt&&(fu=document.createElement("div").style,"AnimationEvent"in window||(delete rn.animationend.animation,delete rn.animationiteration.animation,delete rn.animationstart.animation),"TransitionEvent"in window||delete rn.transitionend.transition);function _i(e){if(bi[e])return bi[e];if(!rn[e])return e;var t=rn[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in fu)return bi[e]=t[n];return e}var pu=_i("animationend"),mu=_i("animationiteration"),hu=_i("animationstart"),vu=_i("transitionend"),gu=new Map,Ma="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Tt(e,t){gu.set(e,t),Gt(t,[e])}for(var el=0;el<Ma.length;el++){var tl=Ma[el],vf=tl.toLowerCase(),gf=tl[0].toUpperCase()+tl.slice(1);Tt(vf,"on"+gf)}Tt(pu,"onAnimationEnd");Tt(mu,"onAnimationIteration");Tt(hu,"onAnimationStart");Tt("dblclick","onDoubleClick");Tt("focusin","onFocus");Tt("focusout","onBlur");Tt(vu,"onTransitionEnd");yn("onMouseEnter",["mouseout","mouseover"]);yn("onMouseLeave",["mouseout","mouseover"]);yn("onPointerEnter",["pointerout","pointerover"]);yn("onPointerLeave",["pointerout","pointerover"]);Gt("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Gt("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Gt("onBeforeInput",["compositionend","keypress","textInput","paste"]);Gt("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Gt("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Gt("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Qn="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),yf=new Set("cancel close invalid load scroll toggle".split(" ").concat(Qn));function La(e,t,n){var r=e.type||"unknown-event";e.currentTarget=n,hd(r,t,void 0,e),e.currentTarget=null}function yu(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var r=e[n],i=r.event;r=r.listeners;e:{var l=void 0;if(t)for(var o=r.length-1;0<=o;o--){var a=r[o],s=a.instance,u=a.currentTarget;if(a=a.listener,s!==l&&i.isPropagationStopped())break e;La(i,a,u),l=s}else for(o=0;o<r.length;o++){if(a=r[o],s=a.instance,u=a.currentTarget,a=a.listener,s!==l&&i.isPropagationStopped())break e;La(i,a,u),l=s}}}if(ti)throw e=Ml,ti=!1,Ml=null,e}function H(e,t){var n=t[Ul];n===void 0&&(n=t[Ul]=new Set);var r=e+"__bubble";n.has(r)||(wu(t,e,2,!1),n.add(r))}function nl(e,t,n){var r=0;t&&(r|=4),wu(n,e,r,t)}var Ar="_reactListening"+Math.random().toString(36).slice(2);function ur(e){if(!e[Ar]){e[Ar]=!0,Ns.forEach(function(n){n!=="selectionchange"&&(yf.has(n)||nl(n,!1,e),nl(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[Ar]||(t[Ar]=!0,nl("selectionchange",!1,t))}}function wu(e,t,n,r){switch(nu(t)){case 1:var i=Od;break;case 4:i=zd;break;default:i=xo}n=i.bind(null,t,n,e),i=void 0,!Tl||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(i=!0),r?i!==void 0?e.addEventListener(t,n,{capture:!0,passive:i}):e.addEventListener(t,n,!0):i!==void 0?e.addEventListener(t,n,{passive:i}):e.addEventListener(t,n,!1)}function rl(e,t,n,r,i){var l=r;if(!(t&1)&&!(t&2)&&r!==null)e:for(;;){if(r===null)return;var o=r.tag;if(o===3||o===4){var a=r.stateNode.containerInfo;if(a===i||a.nodeType===8&&a.parentNode===i)break;if(o===4)for(o=r.return;o!==null;){var s=o.tag;if((s===3||s===4)&&(s=o.stateNode.containerInfo,s===i||s.nodeType===8&&s.parentNode===i))return;o=o.return}for(;a!==null;){if(o=It(a),o===null)return;if(s=o.tag,s===5||s===6){r=l=o;continue e}a=a.parentNode}}r=r.return}Hs(function(){var u=l,h=yo(n),m=[];e:{var p=gu.get(e);if(p!==void 0){var y=Co,v=e;switch(e){case"keypress":if(Qr(n)===0)break e;case"keydown":case"keyup":y=Yd;break;case"focusin":v="focus",y=Zi;break;case"focusout":v="blur",y=Zi;break;case"beforeblur":case"afterblur":y=Zi;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":y=ya;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":y=Rd;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":y=Zd;break;case pu:case mu:case hu:y=Fd;break;case vu:y=qd;break;case"scroll":y=Ad;break;case"wheel":y=ef;break;case"copy":case"cut":case"paste":y=$d;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":y=ka}var w=(t&4)!==0,L=!w&&e==="scroll",d=w?p!==null?p+"Capture":null:p;w=[];for(var c=u,f;c!==null;){f=c;var g=f.stateNode;if(f.tag===5&&g!==null&&(f=g,d!==null&&(g=rr(c,d),g!=null&&w.push(cr(c,g,f)))),L)break;c=c.return}0<w.length&&(p=new y(p,v,null,n,h),m.push({event:p,listeners:w}))}}if(!(t&7)){e:{if(p=e==="mouseover"||e==="pointerover",y=e==="mouseout"||e==="pointerout",p&&n!==Nl&&(v=n.relatedTarget||n.fromElement)&&(It(v)||v[nt]))break e;if((y||p)&&(p=h.window===h?h:(p=h.ownerDocument)?p.defaultView||p.parentWindow:window,y?(v=n.relatedTarget||n.toElement,y=u,v=v?It(v):null,v!==null&&(L=Yt(v),v!==L||v.tag!==5&&v.tag!==6)&&(v=null)):(y=null,v=u),y!==v)){if(w=ya,g="onMouseLeave",d="onMouseEnter",c="mouse",(e==="pointerout"||e==="pointerover")&&(w=ka,g="onPointerLeave",d="onPointerEnter",c="pointer"),L=y==null?p:ln(y),f=v==null?p:ln(v),p=new w(g,c+"leave",y,n,h),p.target=L,p.relatedTarget=f,g=null,It(h)===u&&(w=new w(d,c+"enter",v,n,h),w.target=f,w.relatedTarget=L,g=w),L=g,y&&v)t:{for(w=y,d=v,c=0,f=w;f;f=Jt(f))c++;for(f=0,g=d;g;g=Jt(g))f++;for(;0<c-f;)w=Jt(w),c--;for(;0<f-c;)d=Jt(d),f--;for(;c--;){if(w===d||d!==null&&w===d.alternate)break t;w=Jt(w),d=Jt(d)}w=null}else w=null;y!==null&&Oa(m,p,y,w,!1),v!==null&&L!==null&&Oa(m,L,v,w,!0)}}e:{if(p=u?ln(u):window,y=p.nodeName&&p.nodeName.toLowerCase(),y==="select"||y==="input"&&p.type==="file")var x=sf;else if(Ea(p))if(su)x=ff;else{x=cf;var P=uf}else(y=p.nodeName)&&y.toLowerCase()==="input"&&(p.type==="checkbox"||p.type==="radio")&&(x=df);if(x&&(x=x(e,u))){au(m,x,n,h);break e}P&&P(e,p,u),e==="focusout"&&(P=p._wrapperState)&&P.controlled&&p.type==="number"&&Sl(p,"number",p.value)}switch(P=u?ln(u):window,e){case"focusin":(Ea(P)||P.contentEditable==="true")&&(nn=P,Al=u,Zn=null);break;case"focusout":Zn=Al=nn=null;break;case"mousedown":jl=!0;break;case"contextmenu":case"mouseup":case"dragend":jl=!1,Ta(m,n,h);break;case"selectionchange":if(hf)break;case"keydown":case"keyup":Ta(m,n,h)}var N;if(No)e:{switch(e){case"compositionstart":var S="onCompositionStart";break e;case"compositionend":S="onCompositionEnd";break e;case"compositionupdate":S="onCompositionUpdate";break e}S=void 0}else tn?lu(e,n)&&(S="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(S="onCompositionStart");S&&(iu&&n.locale!=="ko"&&(tn||S!=="onCompositionStart"?S==="onCompositionEnd"&&tn&&(N=ru()):(vt=h,Eo="value"in vt?vt.value:vt.textContent,tn=!0)),P=oi(u,S),0<P.length&&(S=new wa(S,e,null,n,h),m.push({event:S,listeners:P}),N?S.data=N:(N=ou(n),N!==null&&(S.data=N)))),(N=nf?rf(e,n):lf(e,n))&&(u=oi(u,"onBeforeInput"),0<u.length&&(h=new wa("onBeforeInput","beforeinput",null,n,h),m.push({event:h,listeners:u}),h.data=N))}yu(m,t)})}function cr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function oi(e,t){for(var n=t+"Capture",r=[];e!==null;){var i=e,l=i.stateNode;i.tag===5&&l!==null&&(i=l,l=rr(e,n),l!=null&&r.unshift(cr(e,l,i)),l=rr(e,t),l!=null&&r.push(cr(e,l,i))),e=e.return}return r}function Jt(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function Oa(e,t,n,r,i){for(var l=t._reactName,o=[];n!==null&&n!==r;){var a=n,s=a.alternate,u=a.stateNode;if(s!==null&&s===r)break;a.tag===5&&u!==null&&(a=u,i?(s=rr(n,l),s!=null&&o.unshift(cr(n,s,a))):i||(s=rr(n,l),s!=null&&o.push(cr(n,s,a)))),n=n.return}o.length!==0&&e.push({event:t,listeners:o})}var wf=/\r\n?/g,kf=/\u0000|\uFFFD/g;function za(e){return(typeof e=="string"?e:""+e).replace(wf,`
`).replace(kf,"")}function jr(e,t,n){if(t=za(t),za(e)!==t&&n)throw Error(k(425))}function ai(){}var Rl=null,Il=null;function Dl(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Fl=typeof setTimeout=="function"?setTimeout:void 0,Sf=typeof clearTimeout=="function"?clearTimeout:void 0,Aa=typeof Promise=="function"?Promise:void 0,xf=typeof queueMicrotask=="function"?queueMicrotask:typeof Aa<"u"?function(e){return Aa.resolve(null).then(e).catch(Ef)}:Fl;function Ef(e){setTimeout(function(){throw e})}function il(e,t){var n=t,r=0;do{var i=n.nextSibling;if(e.removeChild(n),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(r===0){e.removeChild(i),or(t);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=i}while(n);or(t)}function St(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function ja(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}var _n=Math.random().toString(36).slice(2),Ge="__reactFiber$"+_n,dr="__reactProps$"+_n,nt="__reactContainer$"+_n,Ul="__reactEvents$"+_n,Cf="__reactListeners$"+_n,Pf="__reactHandles$"+_n;function It(e){var t=e[Ge];if(t)return t;for(var n=e.parentNode;n;){if(t=n[nt]||n[Ge]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=ja(e);e!==null;){if(n=e[Ge])return n;e=ja(e)}return t}e=n,n=e.parentNode}return null}function Sr(e){return e=e[Ge]||e[nt],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function ln(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(k(33))}function Ti(e){return e[dr]||null}var $l=[],on=-1;function Mt(e){return{current:e}}function V(e){0>on||(e.current=$l[on],$l[on]=null,on--)}function B(e,t){on++,$l[on]=e.current,e.current=t}var _t={},de=Mt(_t),we=Mt(!1),Bt=_t;function wn(e,t){var n=e.type.contextTypes;if(!n)return _t;var r=e.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===t)return r.__reactInternalMemoizedMaskedChildContext;var i={},l;for(l in n)i[l]=t[l];return r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=i),i}function ke(e){return e=e.childContextTypes,e!=null}function si(){V(we),V(de)}function Ra(e,t,n){if(de.current!==_t)throw Error(k(168));B(de,t),B(we,n)}function ku(e,t,n){var r=e.stateNode;if(t=t.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var i in r)if(!(i in t))throw Error(k(108,sd(e)||"Unknown",i));return K({},n,r)}function ui(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||_t,Bt=de.current,B(de,e),B(we,we.current),!0}function Ia(e,t,n){var r=e.stateNode;if(!r)throw Error(k(169));n?(e=ku(e,t,Bt),r.__reactInternalMemoizedMergedChildContext=e,V(we),V(de),B(de,e)):V(we),B(we,n)}var Je=null,Mi=!1,ll=!1;function Su(e){Je===null?Je=[e]:Je.push(e)}function Nf(e){Mi=!0,Su(e)}function Lt(){if(!ll&&Je!==null){ll=!0;var e=0,t=F;try{var n=Je;for(F=1;e<n.length;e++){var r=n[e];do r=r(!0);while(r!==null)}Je=null,Mi=!1}catch(i){throw Je!==null&&(Je=Je.slice(e+1)),Gs(wo,Lt),i}finally{F=t,ll=!1}}return null}var an=[],sn=0,ci=null,di=0,Oe=[],ze=0,Ht=null,qe=1,be="";function jt(e,t){an[sn++]=di,an[sn++]=ci,ci=e,di=t}function xu(e,t,n){Oe[ze++]=qe,Oe[ze++]=be,Oe[ze++]=Ht,Ht=e;var r=qe;e=be;var i=32-Be(r)-1;r&=~(1<<i),n+=1;var l=32-Be(t)+i;if(30<l){var o=i-i%5;l=(r&(1<<o)-1).toString(32),r>>=o,i-=o,qe=1<<32-Be(t)+i|n<<i|r,be=l+e}else qe=1<<l|n<<i|r,be=e}function To(e){e.return!==null&&(jt(e,1),xu(e,1,0))}function Mo(e){for(;e===ci;)ci=an[--sn],an[sn]=null,di=an[--sn],an[sn]=null;for(;e===Ht;)Ht=Oe[--ze],Oe[ze]=null,be=Oe[--ze],Oe[ze]=null,qe=Oe[--ze],Oe[ze]=null}var Ne=null,Pe=null,G=!1,$e=null;function Eu(e,t){var n=Ae(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function Da(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Ne=e,Pe=St(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Ne=e,Pe=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=Ht!==null?{id:qe,overflow:be}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=Ae(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,Ne=e,Pe=null,!0):!1;default:return!1}}function Bl(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Hl(e){if(G){var t=Pe;if(t){var n=t;if(!Da(e,t)){if(Bl(e))throw Error(k(418));t=St(n.nextSibling);var r=Ne;t&&Da(e,t)?Eu(r,n):(e.flags=e.flags&-4097|2,G=!1,Ne=e)}}else{if(Bl(e))throw Error(k(418));e.flags=e.flags&-4097|2,G=!1,Ne=e}}}function Fa(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Ne=e}function Rr(e){if(e!==Ne)return!1;if(!G)return Fa(e),G=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!Dl(e.type,e.memoizedProps)),t&&(t=Pe)){if(Bl(e))throw Cu(),Error(k(418));for(;t;)Eu(e,t),t=St(t.nextSibling)}if(Fa(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(k(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){Pe=St(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}Pe=null}}else Pe=Ne?St(e.stateNode.nextSibling):null;return!0}function Cu(){for(var e=Pe;e;)e=St(e.nextSibling)}function kn(){Pe=Ne=null,G=!1}function Lo(e){$e===null?$e=[e]:$e.push(e)}var _f=lt.ReactCurrentBatchConfig;function Dn(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(k(309));var r=n.stateNode}if(!r)throw Error(k(147,e));var i=r,l=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===l?t.ref:(t=function(o){var a=i.refs;o===null?delete a[l]:a[l]=o},t._stringRef=l,t)}if(typeof e!="string")throw Error(k(284));if(!n._owner)throw Error(k(290,e))}return e}function Ir(e,t){throw e=Object.prototype.toString.call(t),Error(k(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Ua(e){var t=e._init;return t(e._payload)}function Pu(e){function t(d,c){if(e){var f=d.deletions;f===null?(d.deletions=[c],d.flags|=16):f.push(c)}}function n(d,c){if(!e)return null;for(;c!==null;)t(d,c),c=c.sibling;return null}function r(d,c){for(d=new Map;c!==null;)c.key!==null?d.set(c.key,c):d.set(c.index,c),c=c.sibling;return d}function i(d,c){return d=Pt(d,c),d.index=0,d.sibling=null,d}function l(d,c,f){return d.index=f,e?(f=d.alternate,f!==null?(f=f.index,f<c?(d.flags|=2,c):f):(d.flags|=2,c)):(d.flags|=1048576,c)}function o(d){return e&&d.alternate===null&&(d.flags|=2),d}function a(d,c,f,g){return c===null||c.tag!==6?(c=fl(f,d.mode,g),c.return=d,c):(c=i(c,f),c.return=d,c)}function s(d,c,f,g){var x=f.type;return x===en?h(d,c,f.props.children,g,f.key):c!==null&&(c.elementType===x||typeof x=="object"&&x!==null&&x.$$typeof===dt&&Ua(x)===c.type)?(g=i(c,f.props),g.ref=Dn(d,c,f),g.return=d,g):(g=qr(f.type,f.key,f.props,null,d.mode,g),g.ref=Dn(d,c,f),g.return=d,g)}function u(d,c,f,g){return c===null||c.tag!==4||c.stateNode.containerInfo!==f.containerInfo||c.stateNode.implementation!==f.implementation?(c=pl(f,d.mode,g),c.return=d,c):(c=i(c,f.children||[]),c.return=d,c)}function h(d,c,f,g,x){return c===null||c.tag!==7?(c=$t(f,d.mode,g,x),c.return=d,c):(c=i(c,f),c.return=d,c)}function m(d,c,f){if(typeof c=="string"&&c!==""||typeof c=="number")return c=fl(""+c,d.mode,f),c.return=d,c;if(typeof c=="object"&&c!==null){switch(c.$$typeof){case Pr:return f=qr(c.type,c.key,c.props,null,d.mode,f),f.ref=Dn(d,null,c),f.return=d,f;case bt:return c=pl(c,d.mode,f),c.return=d,c;case dt:var g=c._init;return m(d,g(c._payload),f)}if(Vn(c)||zn(c))return c=$t(c,d.mode,f,null),c.return=d,c;Ir(d,c)}return null}function p(d,c,f,g){var x=c!==null?c.key:null;if(typeof f=="string"&&f!==""||typeof f=="number")return x!==null?null:a(d,c,""+f,g);if(typeof f=="object"&&f!==null){switch(f.$$typeof){case Pr:return f.key===x?s(d,c,f,g):null;case bt:return f.key===x?u(d,c,f,g):null;case dt:return x=f._init,p(d,c,x(f._payload),g)}if(Vn(f)||zn(f))return x!==null?null:h(d,c,f,g,null);Ir(d,f)}return null}function y(d,c,f,g,x){if(typeof g=="string"&&g!==""||typeof g=="number")return d=d.get(f)||null,a(c,d,""+g,x);if(typeof g=="object"&&g!==null){switch(g.$$typeof){case Pr:return d=d.get(g.key===null?f:g.key)||null,s(c,d,g,x);case bt:return d=d.get(g.key===null?f:g.key)||null,u(c,d,g,x);case dt:var P=g._init;return y(d,c,f,P(g._payload),x)}if(Vn(g)||zn(g))return d=d.get(f)||null,h(c,d,g,x,null);Ir(c,g)}return null}function v(d,c,f,g){for(var x=null,P=null,N=c,S=c=0,z=null;N!==null&&S<f.length;S++){N.index>S?(z=N,N=null):z=N.sibling;var T=p(d,N,f[S],g);if(T===null){N===null&&(N=z);break}e&&N&&T.alternate===null&&t(d,N),c=l(T,c,S),P===null?x=T:P.sibling=T,P=T,N=z}if(S===f.length)return n(d,N),G&&jt(d,S),x;if(N===null){for(;S<f.length;S++)N=m(d,f[S],g),N!==null&&(c=l(N,c,S),P===null?x=N:P.sibling=N,P=N);return G&&jt(d,S),x}for(N=r(d,N);S<f.length;S++)z=y(N,d,S,f[S],g),z!==null&&(e&&z.alternate!==null&&N.delete(z.key===null?S:z.key),c=l(z,c,S),P===null?x=z:P.sibling=z,P=z);return e&&N.forEach(function(U){return t(d,U)}),G&&jt(d,S),x}function w(d,c,f,g){var x=zn(f);if(typeof x!="function")throw Error(k(150));if(f=x.call(f),f==null)throw Error(k(151));for(var P=x=null,N=c,S=c=0,z=null,T=f.next();N!==null&&!T.done;S++,T=f.next()){N.index>S?(z=N,N=null):z=N.sibling;var U=p(d,N,T.value,g);if(U===null){N===null&&(N=z);break}e&&N&&U.alternate===null&&t(d,N),c=l(U,c,S),P===null?x=U:P.sibling=U,P=U,N=z}if(T.done)return n(d,N),G&&jt(d,S),x;if(N===null){for(;!T.done;S++,T=f.next())T=m(d,T.value,g),T!==null&&(c=l(T,c,S),P===null?x=T:P.sibling=T,P=T);return G&&jt(d,S),x}for(N=r(d,N);!T.done;S++,T=f.next())T=y(N,d,S,T.value,g),T!==null&&(e&&T.alternate!==null&&N.delete(T.key===null?S:T.key),c=l(T,c,S),P===null?x=T:P.sibling=T,P=T);return e&&N.forEach(function(Le){return t(d,Le)}),G&&jt(d,S),x}function L(d,c,f,g){if(typeof f=="object"&&f!==null&&f.type===en&&f.key===null&&(f=f.props.children),typeof f=="object"&&f!==null){switch(f.$$typeof){case Pr:e:{for(var x=f.key,P=c;P!==null;){if(P.key===x){if(x=f.type,x===en){if(P.tag===7){n(d,P.sibling),c=i(P,f.props.children),c.return=d,d=c;break e}}else if(P.elementType===x||typeof x=="object"&&x!==null&&x.$$typeof===dt&&Ua(x)===P.type){n(d,P.sibling),c=i(P,f.props),c.ref=Dn(d,P,f),c.return=d,d=c;break e}n(d,P);break}else t(d,P);P=P.sibling}f.type===en?(c=$t(f.props.children,d.mode,g,f.key),c.return=d,d=c):(g=qr(f.type,f.key,f.props,null,d.mode,g),g.ref=Dn(d,c,f),g.return=d,d=g)}return o(d);case bt:e:{for(P=f.key;c!==null;){if(c.key===P)if(c.tag===4&&c.stateNode.containerInfo===f.containerInfo&&c.stateNode.implementation===f.implementation){n(d,c.sibling),c=i(c,f.children||[]),c.return=d,d=c;break e}else{n(d,c);break}else t(d,c);c=c.sibling}c=pl(f,d.mode,g),c.return=d,d=c}return o(d);case dt:return P=f._init,L(d,c,P(f._payload),g)}if(Vn(f))return v(d,c,f,g);if(zn(f))return w(d,c,f,g);Ir(d,f)}return typeof f=="string"&&f!==""||typeof f=="number"?(f=""+f,c!==null&&c.tag===6?(n(d,c.sibling),c=i(c,f),c.return=d,d=c):(n(d,c),c=fl(f,d.mode,g),c.return=d,d=c),o(d)):n(d,c)}return L}var Sn=Pu(!0),Nu=Pu(!1),fi=Mt(null),pi=null,un=null,Oo=null;function zo(){Oo=un=pi=null}function Ao(e){var t=fi.current;V(fi),e._currentValue=t}function Vl(e,t,n){for(;e!==null;){var r=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,r!==null&&(r.childLanes|=t)):r!==null&&(r.childLanes&t)!==t&&(r.childLanes|=t),e===n)break;e=e.return}}function vn(e,t){pi=e,Oo=un=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(ye=!0),e.firstContext=null)}function Re(e){var t=e._currentValue;if(Oo!==e)if(e={context:e,memoizedValue:t,next:null},un===null){if(pi===null)throw Error(k(308));un=e,pi.dependencies={lanes:0,firstContext:e}}else un=un.next=e;return t}var Dt=null;function jo(e){Dt===null?Dt=[e]:Dt.push(e)}function _u(e,t,n,r){var i=t.interleaved;return i===null?(n.next=n,jo(t)):(n.next=i.next,i.next=n),t.interleaved=n,rt(e,r)}function rt(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}var ft=!1;function Ro(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Tu(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function et(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function xt(e,t,n){var r=e.updateQueue;if(r===null)return null;if(r=r.shared,I&2){var i=r.pending;return i===null?t.next=t:(t.next=i.next,i.next=t),r.pending=t,rt(e,n)}return i=r.interleaved,i===null?(t.next=t,jo(r)):(t.next=i.next,i.next=t),r.interleaved=t,rt(e,n)}function Gr(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,ko(e,n)}}function $a(e,t){var n=e.updateQueue,r=e.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var i=null,l=null;if(n=n.firstBaseUpdate,n!==null){do{var o={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};l===null?i=l=o:l=l.next=o,n=n.next}while(n!==null);l===null?i=l=t:l=l.next=t}else i=l=t;n={baseState:r.baseState,firstBaseUpdate:i,lastBaseUpdate:l,shared:r.shared,effects:r.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function mi(e,t,n,r){var i=e.updateQueue;ft=!1;var l=i.firstBaseUpdate,o=i.lastBaseUpdate,a=i.shared.pending;if(a!==null){i.shared.pending=null;var s=a,u=s.next;s.next=null,o===null?l=u:o.next=u,o=s;var h=e.alternate;h!==null&&(h=h.updateQueue,a=h.lastBaseUpdate,a!==o&&(a===null?h.firstBaseUpdate=u:a.next=u,h.lastBaseUpdate=s))}if(l!==null){var m=i.baseState;o=0,h=u=s=null,a=l;do{var p=a.lane,y=a.eventTime;if((r&p)===p){h!==null&&(h=h.next={eventTime:y,lane:0,tag:a.tag,payload:a.payload,callback:a.callback,next:null});e:{var v=e,w=a;switch(p=t,y=n,w.tag){case 1:if(v=w.payload,typeof v=="function"){m=v.call(y,m,p);break e}m=v;break e;case 3:v.flags=v.flags&-65537|128;case 0:if(v=w.payload,p=typeof v=="function"?v.call(y,m,p):v,p==null)break e;m=K({},m,p);break e;case 2:ft=!0}}a.callback!==null&&a.lane!==0&&(e.flags|=64,p=i.effects,p===null?i.effects=[a]:p.push(a))}else y={eventTime:y,lane:p,tag:a.tag,payload:a.payload,callback:a.callback,next:null},h===null?(u=h=y,s=m):h=h.next=y,o|=p;if(a=a.next,a===null){if(a=i.shared.pending,a===null)break;p=a,a=p.next,p.next=null,i.lastBaseUpdate=p,i.shared.pending=null}}while(!0);if(h===null&&(s=m),i.baseState=s,i.firstBaseUpdate=u,i.lastBaseUpdate=h,t=i.shared.interleaved,t!==null){i=t;do o|=i.lane,i=i.next;while(i!==t)}else l===null&&(i.shared.lanes=0);Wt|=o,e.lanes=o,e.memoizedState=m}}function Ba(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var r=e[t],i=r.callback;if(i!==null){if(r.callback=null,r=n,typeof i!="function")throw Error(k(191,i));i.call(r)}}}var xr={},Ke=Mt(xr),fr=Mt(xr),pr=Mt(xr);function Ft(e){if(e===xr)throw Error(k(174));return e}function Io(e,t){switch(B(pr,t),B(fr,e),B(Ke,xr),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:El(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=El(t,e)}V(Ke),B(Ke,t)}function xn(){V(Ke),V(fr),V(pr)}function Mu(e){Ft(pr.current);var t=Ft(Ke.current),n=El(t,e.type);t!==n&&(B(fr,e),B(Ke,n))}function Do(e){fr.current===e&&(V(Ke),V(fr))}var Y=Mt(0);function hi(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var ol=[];function Fo(){for(var e=0;e<ol.length;e++)ol[e]._workInProgressVersionPrimary=null;ol.length=0}var Yr=lt.ReactCurrentDispatcher,al=lt.ReactCurrentBatchConfig,Vt=0,X=null,te=null,re=null,vi=!1,Jn=!1,mr=0,Tf=0;function se(){throw Error(k(321))}function Uo(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!Ve(e[n],t[n]))return!1;return!0}function $o(e,t,n,r,i,l){if(Vt=l,X=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Yr.current=e===null||e.memoizedState===null?zf:Af,e=n(r,i),Jn){l=0;do{if(Jn=!1,mr=0,25<=l)throw Error(k(301));l+=1,re=te=null,t.updateQueue=null,Yr.current=jf,e=n(r,i)}while(Jn)}if(Yr.current=gi,t=te!==null&&te.next!==null,Vt=0,re=te=X=null,vi=!1,t)throw Error(k(300));return e}function Bo(){var e=mr!==0;return mr=0,e}function Qe(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return re===null?X.memoizedState=re=e:re=re.next=e,re}function Ie(){if(te===null){var e=X.alternate;e=e!==null?e.memoizedState:null}else e=te.next;var t=re===null?X.memoizedState:re.next;if(t!==null)re=t,te=e;else{if(e===null)throw Error(k(310));te=e,e={memoizedState:te.memoizedState,baseState:te.baseState,baseQueue:te.baseQueue,queue:te.queue,next:null},re===null?X.memoizedState=re=e:re=re.next=e}return re}function hr(e,t){return typeof t=="function"?t(e):t}function sl(e){var t=Ie(),n=t.queue;if(n===null)throw Error(k(311));n.lastRenderedReducer=e;var r=te,i=r.baseQueue,l=n.pending;if(l!==null){if(i!==null){var o=i.next;i.next=l.next,l.next=o}r.baseQueue=i=l,n.pending=null}if(i!==null){l=i.next,r=r.baseState;var a=o=null,s=null,u=l;do{var h=u.lane;if((Vt&h)===h)s!==null&&(s=s.next={lane:0,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null}),r=u.hasEagerState?u.eagerState:e(r,u.action);else{var m={lane:h,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null};s===null?(a=s=m,o=r):s=s.next=m,X.lanes|=h,Wt|=h}u=u.next}while(u!==null&&u!==l);s===null?o=r:s.next=a,Ve(r,t.memoizedState)||(ye=!0),t.memoizedState=r,t.baseState=o,t.baseQueue=s,n.lastRenderedState=r}if(e=n.interleaved,e!==null){i=e;do l=i.lane,X.lanes|=l,Wt|=l,i=i.next;while(i!==e)}else i===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function ul(e){var t=Ie(),n=t.queue;if(n===null)throw Error(k(311));n.lastRenderedReducer=e;var r=n.dispatch,i=n.pending,l=t.memoizedState;if(i!==null){n.pending=null;var o=i=i.next;do l=e(l,o.action),o=o.next;while(o!==i);Ve(l,t.memoizedState)||(ye=!0),t.memoizedState=l,t.baseQueue===null&&(t.baseState=l),n.lastRenderedState=l}return[l,r]}function Lu(){}function Ou(e,t){var n=X,r=Ie(),i=t(),l=!Ve(r.memoizedState,i);if(l&&(r.memoizedState=i,ye=!0),r=r.queue,Ho(ju.bind(null,n,r,e),[e]),r.getSnapshot!==t||l||re!==null&&re.memoizedState.tag&1){if(n.flags|=2048,vr(9,Au.bind(null,n,r,i,t),void 0,null),ie===null)throw Error(k(349));Vt&30||zu(n,t,i)}return i}function zu(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function Au(e,t,n,r){t.value=n,t.getSnapshot=r,Ru(t)&&Iu(e)}function ju(e,t,n){return n(function(){Ru(t)&&Iu(e)})}function Ru(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!Ve(e,n)}catch{return!0}}function Iu(e){var t=rt(e,1);t!==null&&He(t,e,1,-1)}function Ha(e){var t=Qe();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:hr,lastRenderedState:e},t.queue=e,e=e.dispatch=Of.bind(null,X,e),[t.memoizedState,e]}function vr(e,t,n,r){return e={tag:e,create:t,destroy:n,deps:r,next:null},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(r=n.next,n.next=e,e.next=r,t.lastEffect=e)),e}function Du(){return Ie().memoizedState}function Xr(e,t,n,r){var i=Qe();X.flags|=e,i.memoizedState=vr(1|t,n,void 0,r===void 0?null:r)}function Li(e,t,n,r){var i=Ie();r=r===void 0?null:r;var l=void 0;if(te!==null){var o=te.memoizedState;if(l=o.destroy,r!==null&&Uo(r,o.deps)){i.memoizedState=vr(t,n,l,r);return}}X.flags|=e,i.memoizedState=vr(1|t,n,l,r)}function Va(e,t){return Xr(8390656,8,e,t)}function Ho(e,t){return Li(2048,8,e,t)}function Fu(e,t){return Li(4,2,e,t)}function Uu(e,t){return Li(4,4,e,t)}function $u(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function Bu(e,t,n){return n=n!=null?n.concat([e]):null,Li(4,4,$u.bind(null,t,e),n)}function Vo(){}function Hu(e,t){var n=Ie();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&Uo(t,r[1])?r[0]:(n.memoizedState=[e,t],e)}function Vu(e,t){var n=Ie();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&Uo(t,r[1])?r[0]:(e=e(),n.memoizedState=[e,t],e)}function Wu(e,t,n){return Vt&21?(Ve(n,t)||(n=Ks(),X.lanes|=n,Wt|=n,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,ye=!0),e.memoizedState=n)}function Mf(e,t){var n=F;F=n!==0&&4>n?n:4,e(!0);var r=al.transition;al.transition={};try{e(!1),t()}finally{F=n,al.transition=r}}function Qu(){return Ie().memoizedState}function Lf(e,t,n){var r=Ct(e);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},Gu(e))Yu(t,n);else if(n=_u(e,t,n,r),n!==null){var i=me();He(n,e,r,i),Xu(n,t,r)}}function Of(e,t,n){var r=Ct(e),i={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(Gu(e))Yu(t,i);else{var l=e.alternate;if(e.lanes===0&&(l===null||l.lanes===0)&&(l=t.lastRenderedReducer,l!==null))try{var o=t.lastRenderedState,a=l(o,n);if(i.hasEagerState=!0,i.eagerState=a,Ve(a,o)){var s=t.interleaved;s===null?(i.next=i,jo(t)):(i.next=s.next,s.next=i),t.interleaved=i;return}}catch{}finally{}n=_u(e,t,i,r),n!==null&&(i=me(),He(n,e,r,i),Xu(n,t,r))}}function Gu(e){var t=e.alternate;return e===X||t!==null&&t===X}function Yu(e,t){Jn=vi=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function Xu(e,t,n){if(n&4194240){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,ko(e,n)}}var gi={readContext:Re,useCallback:se,useContext:se,useEffect:se,useImperativeHandle:se,useInsertionEffect:se,useLayoutEffect:se,useMemo:se,useReducer:se,useRef:se,useState:se,useDebugValue:se,useDeferredValue:se,useTransition:se,useMutableSource:se,useSyncExternalStore:se,useId:se,unstable_isNewReconciler:!1},zf={readContext:Re,useCallback:function(e,t){return Qe().memoizedState=[e,t===void 0?null:t],e},useContext:Re,useEffect:Va,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,Xr(4194308,4,$u.bind(null,t,e),n)},useLayoutEffect:function(e,t){return Xr(4194308,4,e,t)},useInsertionEffect:function(e,t){return Xr(4,2,e,t)},useMemo:function(e,t){var n=Qe();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var r=Qe();return t=n!==void 0?n(t):t,r.memoizedState=r.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},r.queue=e,e=e.dispatch=Lf.bind(null,X,e),[r.memoizedState,e]},useRef:function(e){var t=Qe();return e={current:e},t.memoizedState=e},useState:Ha,useDebugValue:Vo,useDeferredValue:function(e){return Qe().memoizedState=e},useTransition:function(){var e=Ha(!1),t=e[0];return e=Mf.bind(null,e[1]),Qe().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,n){var r=X,i=Qe();if(G){if(n===void 0)throw Error(k(407));n=n()}else{if(n=t(),ie===null)throw Error(k(349));Vt&30||zu(r,t,n)}i.memoizedState=n;var l={value:n,getSnapshot:t};return i.queue=l,Va(ju.bind(null,r,l,e),[e]),r.flags|=2048,vr(9,Au.bind(null,r,l,n,t),void 0,null),n},useId:function(){var e=Qe(),t=ie.identifierPrefix;if(G){var n=be,r=qe;n=(r&~(1<<32-Be(r)-1)).toString(32)+n,t=":"+t+"R"+n,n=mr++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=Tf++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},Af={readContext:Re,useCallback:Hu,useContext:Re,useEffect:Ho,useImperativeHandle:Bu,useInsertionEffect:Fu,useLayoutEffect:Uu,useMemo:Vu,useReducer:sl,useRef:Du,useState:function(){return sl(hr)},useDebugValue:Vo,useDeferredValue:function(e){var t=Ie();return Wu(t,te.memoizedState,e)},useTransition:function(){var e=sl(hr)[0],t=Ie().memoizedState;return[e,t]},useMutableSource:Lu,useSyncExternalStore:Ou,useId:Qu,unstable_isNewReconciler:!1},jf={readContext:Re,useCallback:Hu,useContext:Re,useEffect:Ho,useImperativeHandle:Bu,useInsertionEffect:Fu,useLayoutEffect:Uu,useMemo:Vu,useReducer:ul,useRef:Du,useState:function(){return ul(hr)},useDebugValue:Vo,useDeferredValue:function(e){var t=Ie();return te===null?t.memoizedState=e:Wu(t,te.memoizedState,e)},useTransition:function(){var e=ul(hr)[0],t=Ie().memoizedState;return[e,t]},useMutableSource:Lu,useSyncExternalStore:Ou,useId:Qu,unstable_isNewReconciler:!1};function Fe(e,t){if(e&&e.defaultProps){t=K({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function Wl(e,t,n,r){t=e.memoizedState,n=n(r,t),n=n==null?t:K({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var Oi={isMounted:function(e){return(e=e._reactInternals)?Yt(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var r=me(),i=Ct(e),l=et(r,i);l.payload=t,n!=null&&(l.callback=n),t=xt(e,l,i),t!==null&&(He(t,e,i,r),Gr(t,e,i))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var r=me(),i=Ct(e),l=et(r,i);l.tag=1,l.payload=t,n!=null&&(l.callback=n),t=xt(e,l,i),t!==null&&(He(t,e,i,r),Gr(t,e,i))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=me(),r=Ct(e),i=et(n,r);i.tag=2,t!=null&&(i.callback=t),t=xt(e,i,r),t!==null&&(He(t,e,r,n),Gr(t,e,r))}};function Wa(e,t,n,r,i,l,o){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(r,l,o):t.prototype&&t.prototype.isPureReactComponent?!sr(n,r)||!sr(i,l):!0}function Ku(e,t,n){var r=!1,i=_t,l=t.contextType;return typeof l=="object"&&l!==null?l=Re(l):(i=ke(t)?Bt:de.current,r=t.contextTypes,l=(r=r!=null)?wn(e,i):_t),t=new t(n,l),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=Oi,e.stateNode=t,t._reactInternals=e,r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=i,e.__reactInternalMemoizedMaskedChildContext=l),t}function Qa(e,t,n,r){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,r),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,r),t.state!==e&&Oi.enqueueReplaceState(t,t.state,null)}function Ql(e,t,n,r){var i=e.stateNode;i.props=n,i.state=e.memoizedState,i.refs={},Ro(e);var l=t.contextType;typeof l=="object"&&l!==null?i.context=Re(l):(l=ke(t)?Bt:de.current,i.context=wn(e,l)),i.state=e.memoizedState,l=t.getDerivedStateFromProps,typeof l=="function"&&(Wl(e,t,l,n),i.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof i.getSnapshotBeforeUpdate=="function"||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(t=i.state,typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount(),t!==i.state&&Oi.enqueueReplaceState(i,i.state,null),mi(e,n,i,r),i.state=e.memoizedState),typeof i.componentDidMount=="function"&&(e.flags|=4194308)}function En(e,t){try{var n="",r=t;do n+=ad(r),r=r.return;while(r);var i=n}catch(l){i=`
Error generating stack: `+l.message+`
`+l.stack}return{value:e,source:t,stack:i,digest:null}}function cl(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function Gl(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}var Rf=typeof WeakMap=="function"?WeakMap:Map;function Zu(e,t,n){n=et(-1,n),n.tag=3,n.payload={element:null};var r=t.value;return n.callback=function(){wi||(wi=!0,no=r),Gl(e,t)},n}function Ju(e,t,n){n=et(-1,n),n.tag=3;var r=e.type.getDerivedStateFromError;if(typeof r=="function"){var i=t.value;n.payload=function(){return r(i)},n.callback=function(){Gl(e,t)}}var l=e.stateNode;return l!==null&&typeof l.componentDidCatch=="function"&&(n.callback=function(){Gl(e,t),typeof r!="function"&&(Et===null?Et=new Set([this]):Et.add(this));var o=t.stack;this.componentDidCatch(t.value,{componentStack:o!==null?o:""})}),n}function Ga(e,t,n){var r=e.pingCache;if(r===null){r=e.pingCache=new Rf;var i=new Set;r.set(t,i)}else i=r.get(t),i===void 0&&(i=new Set,r.set(t,i));i.has(n)||(i.add(n),e=Kf.bind(null,e,t,n),t.then(e,e))}function Ya(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Xa(e,t,n,r,i){return e.mode&1?(e.flags|=65536,e.lanes=i,e):(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=et(-1,1),t.tag=2,xt(n,t,1))),n.lanes|=1),e)}var If=lt.ReactCurrentOwner,ye=!1;function pe(e,t,n,r){t.child=e===null?Nu(t,null,n,r):Sn(t,e.child,n,r)}function Ka(e,t,n,r,i){n=n.render;var l=t.ref;return vn(t,i),r=$o(e,t,n,r,l,i),n=Bo(),e!==null&&!ye?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,it(e,t,i)):(G&&n&&To(t),t.flags|=1,pe(e,t,r,i),t.child)}function Za(e,t,n,r,i){if(e===null){var l=n.type;return typeof l=="function"&&!Jo(l)&&l.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=l,qu(e,t,l,r,i)):(e=qr(n.type,null,r,t,t.mode,i),e.ref=t.ref,e.return=t,t.child=e)}if(l=e.child,!(e.lanes&i)){var o=l.memoizedProps;if(n=n.compare,n=n!==null?n:sr,n(o,r)&&e.ref===t.ref)return it(e,t,i)}return t.flags|=1,e=Pt(l,r),e.ref=t.ref,e.return=t,t.child=e}function qu(e,t,n,r,i){if(e!==null){var l=e.memoizedProps;if(sr(l,r)&&e.ref===t.ref)if(ye=!1,t.pendingProps=r=l,(e.lanes&i)!==0)e.flags&131072&&(ye=!0);else return t.lanes=e.lanes,it(e,t,i)}return Yl(e,t,n,r,i)}function bu(e,t,n){var r=t.pendingProps,i=r.children,l=e!==null?e.memoizedState:null;if(r.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},B(dn,Ce),Ce|=n;else{if(!(n&1073741824))return e=l!==null?l.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,B(dn,Ce),Ce|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=l!==null?l.baseLanes:n,B(dn,Ce),Ce|=r}else l!==null?(r=l.baseLanes|n,t.memoizedState=null):r=n,B(dn,Ce),Ce|=r;return pe(e,t,i,n),t.child}function ec(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function Yl(e,t,n,r,i){var l=ke(n)?Bt:de.current;return l=wn(t,l),vn(t,i),n=$o(e,t,n,r,l,i),r=Bo(),e!==null&&!ye?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~i,it(e,t,i)):(G&&r&&To(t),t.flags|=1,pe(e,t,n,i),t.child)}function Ja(e,t,n,r,i){if(ke(n)){var l=!0;ui(t)}else l=!1;if(vn(t,i),t.stateNode===null)Kr(e,t),Ku(t,n,r),Ql(t,n,r,i),r=!0;else if(e===null){var o=t.stateNode,a=t.memoizedProps;o.props=a;var s=o.context,u=n.contextType;typeof u=="object"&&u!==null?u=Re(u):(u=ke(n)?Bt:de.current,u=wn(t,u));var h=n.getDerivedStateFromProps,m=typeof h=="function"||typeof o.getSnapshotBeforeUpdate=="function";m||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==r||s!==u)&&Qa(t,o,r,u),ft=!1;var p=t.memoizedState;o.state=p,mi(t,r,o,i),s=t.memoizedState,a!==r||p!==s||we.current||ft?(typeof h=="function"&&(Wl(t,n,h,r),s=t.memoizedState),(a=ft||Wa(t,n,a,r,p,s,u))?(m||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount()),typeof o.componentDidMount=="function"&&(t.flags|=4194308)):(typeof o.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=r,t.memoizedState=s),o.props=r,o.state=s,o.context=u,r=a):(typeof o.componentDidMount=="function"&&(t.flags|=4194308),r=!1)}else{o=t.stateNode,Tu(e,t),a=t.memoizedProps,u=t.type===t.elementType?a:Fe(t.type,a),o.props=u,m=t.pendingProps,p=o.context,s=n.contextType,typeof s=="object"&&s!==null?s=Re(s):(s=ke(n)?Bt:de.current,s=wn(t,s));var y=n.getDerivedStateFromProps;(h=typeof y=="function"||typeof o.getSnapshotBeforeUpdate=="function")||typeof o.UNSAFE_componentWillReceiveProps!="function"&&typeof o.componentWillReceiveProps!="function"||(a!==m||p!==s)&&Qa(t,o,r,s),ft=!1,p=t.memoizedState,o.state=p,mi(t,r,o,i);var v=t.memoizedState;a!==m||p!==v||we.current||ft?(typeof y=="function"&&(Wl(t,n,y,r),v=t.memoizedState),(u=ft||Wa(t,n,u,r,p,v,s)||!1)?(h||typeof o.UNSAFE_componentWillUpdate!="function"&&typeof o.componentWillUpdate!="function"||(typeof o.componentWillUpdate=="function"&&o.componentWillUpdate(r,v,s),typeof o.UNSAFE_componentWillUpdate=="function"&&o.UNSAFE_componentWillUpdate(r,v,s)),typeof o.componentDidUpdate=="function"&&(t.flags|=4),typeof o.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof o.componentDidUpdate!="function"||a===e.memoizedProps&&p===e.memoizedState||(t.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===e.memoizedProps&&p===e.memoizedState||(t.flags|=1024),t.memoizedProps=r,t.memoizedState=v),o.props=r,o.state=v,o.context=s,r=u):(typeof o.componentDidUpdate!="function"||a===e.memoizedProps&&p===e.memoizedState||(t.flags|=4),typeof o.getSnapshotBeforeUpdate!="function"||a===e.memoizedProps&&p===e.memoizedState||(t.flags|=1024),r=!1)}return Xl(e,t,n,r,l,i)}function Xl(e,t,n,r,i,l){ec(e,t);var o=(t.flags&128)!==0;if(!r&&!o)return i&&Ia(t,n,!1),it(e,t,l);r=t.stateNode,If.current=t;var a=o&&typeof n.getDerivedStateFromError!="function"?null:r.render();return t.flags|=1,e!==null&&o?(t.child=Sn(t,e.child,null,l),t.child=Sn(t,null,a,l)):pe(e,t,a,l),t.memoizedState=r.state,i&&Ia(t,n,!0),t.child}function tc(e){var t=e.stateNode;t.pendingContext?Ra(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Ra(e,t.context,!1),Io(e,t.containerInfo)}function qa(e,t,n,r,i){return kn(),Lo(i),t.flags|=256,pe(e,t,n,r),t.child}var Kl={dehydrated:null,treeContext:null,retryLane:0};function Zl(e){return{baseLanes:e,cachePool:null,transitions:null}}function nc(e,t,n){var r=t.pendingProps,i=Y.current,l=!1,o=(t.flags&128)!==0,a;if((a=o)||(a=e!==null&&e.memoizedState===null?!1:(i&2)!==0),a?(l=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(i|=1),B(Y,i&1),e===null)return Hl(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(o=r.children,e=r.fallback,l?(r=t.mode,l=t.child,o={mode:"hidden",children:o},!(r&1)&&l!==null?(l.childLanes=0,l.pendingProps=o):l=ji(o,r,0,null),e=$t(e,r,n,null),l.return=t,e.return=t,l.sibling=e,t.child=l,t.child.memoizedState=Zl(n),t.memoizedState=Kl,e):Wo(t,o));if(i=e.memoizedState,i!==null&&(a=i.dehydrated,a!==null))return Df(e,t,o,r,a,i,n);if(l){l=r.fallback,o=t.mode,i=e.child,a=i.sibling;var s={mode:"hidden",children:r.children};return!(o&1)&&t.child!==i?(r=t.child,r.childLanes=0,r.pendingProps=s,t.deletions=null):(r=Pt(i,s),r.subtreeFlags=i.subtreeFlags&14680064),a!==null?l=Pt(a,l):(l=$t(l,o,n,null),l.flags|=2),l.return=t,r.return=t,r.sibling=l,t.child=r,r=l,l=t.child,o=e.child.memoizedState,o=o===null?Zl(n):{baseLanes:o.baseLanes|n,cachePool:null,transitions:o.transitions},l.memoizedState=o,l.childLanes=e.childLanes&~n,t.memoizedState=Kl,r}return l=e.child,e=l.sibling,r=Pt(l,{mode:"visible",children:r.children}),!(t.mode&1)&&(r.lanes=n),r.return=t,r.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=r,t.memoizedState=null,r}function Wo(e,t){return t=ji({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function Dr(e,t,n,r){return r!==null&&Lo(r),Sn(t,e.child,null,n),e=Wo(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Df(e,t,n,r,i,l,o){if(n)return t.flags&256?(t.flags&=-257,r=cl(Error(k(422))),Dr(e,t,o,r)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(l=r.fallback,i=t.mode,r=ji({mode:"visible",children:r.children},i,0,null),l=$t(l,i,o,null),l.flags|=2,r.return=t,l.return=t,r.sibling=l,t.child=r,t.mode&1&&Sn(t,e.child,null,o),t.child.memoizedState=Zl(o),t.memoizedState=Kl,l);if(!(t.mode&1))return Dr(e,t,o,null);if(i.data==="$!"){if(r=i.nextSibling&&i.nextSibling.dataset,r)var a=r.dgst;return r=a,l=Error(k(419)),r=cl(l,r,void 0),Dr(e,t,o,r)}if(a=(o&e.childLanes)!==0,ye||a){if(r=ie,r!==null){switch(o&-o){case 4:i=2;break;case 16:i=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:i=32;break;case 536870912:i=268435456;break;default:i=0}i=i&(r.suspendedLanes|o)?0:i,i!==0&&i!==l.retryLane&&(l.retryLane=i,rt(e,i),He(r,e,i,-1))}return Zo(),r=cl(Error(k(421))),Dr(e,t,o,r)}return i.data==="$?"?(t.flags|=128,t.child=e.child,t=Zf.bind(null,e),i._reactRetry=t,null):(e=l.treeContext,Pe=St(i.nextSibling),Ne=t,G=!0,$e=null,e!==null&&(Oe[ze++]=qe,Oe[ze++]=be,Oe[ze++]=Ht,qe=e.id,be=e.overflow,Ht=t),t=Wo(t,r.children),t.flags|=4096,t)}function ba(e,t,n){e.lanes|=t;var r=e.alternate;r!==null&&(r.lanes|=t),Vl(e.return,t,n)}function dl(e,t,n,r,i){var l=e.memoizedState;l===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:i}:(l.isBackwards=t,l.rendering=null,l.renderingStartTime=0,l.last=r,l.tail=n,l.tailMode=i)}function rc(e,t,n){var r=t.pendingProps,i=r.revealOrder,l=r.tail;if(pe(e,t,r.children,n),r=Y.current,r&2)r=r&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&ba(e,n,t);else if(e.tag===19)ba(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}r&=1}if(B(Y,r),!(t.mode&1))t.memoizedState=null;else switch(i){case"forwards":for(n=t.child,i=null;n!==null;)e=n.alternate,e!==null&&hi(e)===null&&(i=n),n=n.sibling;n=i,n===null?(i=t.child,t.child=null):(i=n.sibling,n.sibling=null),dl(t,!1,i,n,l);break;case"backwards":for(n=null,i=t.child,t.child=null;i!==null;){if(e=i.alternate,e!==null&&hi(e)===null){t.child=i;break}e=i.sibling,i.sibling=n,n=i,i=e}dl(t,!0,n,null,l);break;case"together":dl(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function Kr(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function it(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),Wt|=t.lanes,!(n&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(k(153));if(t.child!==null){for(e=t.child,n=Pt(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=Pt(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function Ff(e,t,n){switch(t.tag){case 3:tc(t),kn();break;case 5:Mu(t);break;case 1:ke(t.type)&&ui(t);break;case 4:Io(t,t.stateNode.containerInfo);break;case 10:var r=t.type._context,i=t.memoizedProps.value;B(fi,r._currentValue),r._currentValue=i;break;case 13:if(r=t.memoizedState,r!==null)return r.dehydrated!==null?(B(Y,Y.current&1),t.flags|=128,null):n&t.child.childLanes?nc(e,t,n):(B(Y,Y.current&1),e=it(e,t,n),e!==null?e.sibling:null);B(Y,Y.current&1);break;case 19:if(r=(n&t.childLanes)!==0,e.flags&128){if(r)return rc(e,t,n);t.flags|=128}if(i=t.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),B(Y,Y.current),r)break;return null;case 22:case 23:return t.lanes=0,bu(e,t,n)}return it(e,t,n)}var ic,Jl,lc,oc;ic=function(e,t){for(var n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}};Jl=function(){};lc=function(e,t,n,r){var i=e.memoizedProps;if(i!==r){e=t.stateNode,Ft(Ke.current);var l=null;switch(n){case"input":i=wl(e,i),r=wl(e,r),l=[];break;case"select":i=K({},i,{value:void 0}),r=K({},r,{value:void 0}),l=[];break;case"textarea":i=xl(e,i),r=xl(e,r),l=[];break;default:typeof i.onClick!="function"&&typeof r.onClick=="function"&&(e.onclick=ai)}Cl(n,r);var o;n=null;for(u in i)if(!r.hasOwnProperty(u)&&i.hasOwnProperty(u)&&i[u]!=null)if(u==="style"){var a=i[u];for(o in a)a.hasOwnProperty(o)&&(n||(n={}),n[o]="")}else u!=="dangerouslySetInnerHTML"&&u!=="children"&&u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&u!=="autoFocus"&&(tr.hasOwnProperty(u)?l||(l=[]):(l=l||[]).push(u,null));for(u in r){var s=r[u];if(a=i!=null?i[u]:void 0,r.hasOwnProperty(u)&&s!==a&&(s!=null||a!=null))if(u==="style")if(a){for(o in a)!a.hasOwnProperty(o)||s&&s.hasOwnProperty(o)||(n||(n={}),n[o]="");for(o in s)s.hasOwnProperty(o)&&a[o]!==s[o]&&(n||(n={}),n[o]=s[o])}else n||(l||(l=[]),l.push(u,n)),n=s;else u==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,a=a?a.__html:void 0,s!=null&&a!==s&&(l=l||[]).push(u,s)):u==="children"?typeof s!="string"&&typeof s!="number"||(l=l||[]).push(u,""+s):u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&(tr.hasOwnProperty(u)?(s!=null&&u==="onScroll"&&H("scroll",e),l||a===s||(l=[])):(l=l||[]).push(u,s))}n&&(l=l||[]).push("style",n);var u=l;(t.updateQueue=u)&&(t.flags|=4)}};oc=function(e,t,n,r){n!==r&&(t.flags|=4)};function Fn(e,t){if(!G)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:r.sibling=null}}function ue(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,r=0;if(t)for(var i=e.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags&14680064,r|=i.flags&14680064,i.return=e,i=i.sibling;else for(i=e.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags,r|=i.flags,i.return=e,i=i.sibling;return e.subtreeFlags|=r,e.childLanes=n,t}function Uf(e,t,n){var r=t.pendingProps;switch(Mo(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return ue(t),null;case 1:return ke(t.type)&&si(),ue(t),null;case 3:return r=t.stateNode,xn(),V(we),V(de),Fo(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(e===null||e.child===null)&&(Rr(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,$e!==null&&(lo($e),$e=null))),Jl(e,t),ue(t),null;case 5:Do(t);var i=Ft(pr.current);if(n=t.type,e!==null&&t.stateNode!=null)lc(e,t,n,r,i),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!r){if(t.stateNode===null)throw Error(k(166));return ue(t),null}if(e=Ft(Ke.current),Rr(t)){r=t.stateNode,n=t.type;var l=t.memoizedProps;switch(r[Ge]=t,r[dr]=l,e=(t.mode&1)!==0,n){case"dialog":H("cancel",r),H("close",r);break;case"iframe":case"object":case"embed":H("load",r);break;case"video":case"audio":for(i=0;i<Qn.length;i++)H(Qn[i],r);break;case"source":H("error",r);break;case"img":case"image":case"link":H("error",r),H("load",r);break;case"details":H("toggle",r);break;case"input":sa(r,l),H("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!l.multiple},H("invalid",r);break;case"textarea":ca(r,l),H("invalid",r)}Cl(n,l),i=null;for(var o in l)if(l.hasOwnProperty(o)){var a=l[o];o==="children"?typeof a=="string"?r.textContent!==a&&(l.suppressHydrationWarning!==!0&&jr(r.textContent,a,e),i=["children",a]):typeof a=="number"&&r.textContent!==""+a&&(l.suppressHydrationWarning!==!0&&jr(r.textContent,a,e),i=["children",""+a]):tr.hasOwnProperty(o)&&a!=null&&o==="onScroll"&&H("scroll",r)}switch(n){case"input":Nr(r),ua(r,l,!0);break;case"textarea":Nr(r),da(r);break;case"select":case"option":break;default:typeof l.onClick=="function"&&(r.onclick=ai)}r=i,t.updateQueue=r,r!==null&&(t.flags|=4)}else{o=i.nodeType===9?i:i.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=js(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=o.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof r.is=="string"?e=o.createElement(n,{is:r.is}):(e=o.createElement(n),n==="select"&&(o=e,r.multiple?o.multiple=!0:r.size&&(o.size=r.size))):e=o.createElementNS(e,n),e[Ge]=t,e[dr]=r,ic(e,t,!1,!1),t.stateNode=e;e:{switch(o=Pl(n,r),n){case"dialog":H("cancel",e),H("close",e),i=r;break;case"iframe":case"object":case"embed":H("load",e),i=r;break;case"video":case"audio":for(i=0;i<Qn.length;i++)H(Qn[i],e);i=r;break;case"source":H("error",e),i=r;break;case"img":case"image":case"link":H("error",e),H("load",e),i=r;break;case"details":H("toggle",e),i=r;break;case"input":sa(e,r),i=wl(e,r),H("invalid",e);break;case"option":i=r;break;case"select":e._wrapperState={wasMultiple:!!r.multiple},i=K({},r,{value:void 0}),H("invalid",e);break;case"textarea":ca(e,r),i=xl(e,r),H("invalid",e);break;default:i=r}Cl(n,i),a=i;for(l in a)if(a.hasOwnProperty(l)){var s=a[l];l==="style"?Ds(e,s):l==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,s!=null&&Rs(e,s)):l==="children"?typeof s=="string"?(n!=="textarea"||s!=="")&&nr(e,s):typeof s=="number"&&nr(e,""+s):l!=="suppressContentEditableWarning"&&l!=="suppressHydrationWarning"&&l!=="autoFocus"&&(tr.hasOwnProperty(l)?s!=null&&l==="onScroll"&&H("scroll",e):s!=null&&mo(e,l,s,o))}switch(n){case"input":Nr(e),ua(e,r,!1);break;case"textarea":Nr(e),da(e);break;case"option":r.value!=null&&e.setAttribute("value",""+Nt(r.value));break;case"select":e.multiple=!!r.multiple,l=r.value,l!=null?fn(e,!!r.multiple,l,!1):r.defaultValue!=null&&fn(e,!!r.multiple,r.defaultValue,!0);break;default:typeof i.onClick=="function"&&(e.onclick=ai)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return ue(t),null;case 6:if(e&&t.stateNode!=null)oc(e,t,e.memoizedProps,r);else{if(typeof r!="string"&&t.stateNode===null)throw Error(k(166));if(n=Ft(pr.current),Ft(Ke.current),Rr(t)){if(r=t.stateNode,n=t.memoizedProps,r[Ge]=t,(l=r.nodeValue!==n)&&(e=Ne,e!==null))switch(e.tag){case 3:jr(r.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&jr(r.nodeValue,n,(e.mode&1)!==0)}l&&(t.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[Ge]=t,t.stateNode=r}return ue(t),null;case 13:if(V(Y),r=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(G&&Pe!==null&&t.mode&1&&!(t.flags&128))Cu(),kn(),t.flags|=98560,l=!1;else if(l=Rr(t),r!==null&&r.dehydrated!==null){if(e===null){if(!l)throw Error(k(318));if(l=t.memoizedState,l=l!==null?l.dehydrated:null,!l)throw Error(k(317));l[Ge]=t}else kn(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;ue(t),l=!1}else $e!==null&&(lo($e),$e=null),l=!0;if(!l)return t.flags&65536?t:null}return t.flags&128?(t.lanes=n,t):(r=r!==null,r!==(e!==null&&e.memoizedState!==null)&&r&&(t.child.flags|=8192,t.mode&1&&(e===null||Y.current&1?ne===0&&(ne=3):Zo())),t.updateQueue!==null&&(t.flags|=4),ue(t),null);case 4:return xn(),Jl(e,t),e===null&&ur(t.stateNode.containerInfo),ue(t),null;case 10:return Ao(t.type._context),ue(t),null;case 17:return ke(t.type)&&si(),ue(t),null;case 19:if(V(Y),l=t.memoizedState,l===null)return ue(t),null;if(r=(t.flags&128)!==0,o=l.rendering,o===null)if(r)Fn(l,!1);else{if(ne!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(o=hi(e),o!==null){for(t.flags|=128,Fn(l,!1),r=o.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),t.subtreeFlags=0,r=n,n=t.child;n!==null;)l=n,e=r,l.flags&=14680066,o=l.alternate,o===null?(l.childLanes=0,l.lanes=e,l.child=null,l.subtreeFlags=0,l.memoizedProps=null,l.memoizedState=null,l.updateQueue=null,l.dependencies=null,l.stateNode=null):(l.childLanes=o.childLanes,l.lanes=o.lanes,l.child=o.child,l.subtreeFlags=0,l.deletions=null,l.memoizedProps=o.memoizedProps,l.memoizedState=o.memoizedState,l.updateQueue=o.updateQueue,l.type=o.type,e=o.dependencies,l.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return B(Y,Y.current&1|2),t.child}e=e.sibling}l.tail!==null&&q()>Cn&&(t.flags|=128,r=!0,Fn(l,!1),t.lanes=4194304)}else{if(!r)if(e=hi(o),e!==null){if(t.flags|=128,r=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),Fn(l,!0),l.tail===null&&l.tailMode==="hidden"&&!o.alternate&&!G)return ue(t),null}else 2*q()-l.renderingStartTime>Cn&&n!==1073741824&&(t.flags|=128,r=!0,Fn(l,!1),t.lanes=4194304);l.isBackwards?(o.sibling=t.child,t.child=o):(n=l.last,n!==null?n.sibling=o:t.child=o,l.last=o)}return l.tail!==null?(t=l.tail,l.rendering=t,l.tail=t.sibling,l.renderingStartTime=q(),t.sibling=null,n=Y.current,B(Y,r?n&1|2:n&1),t):(ue(t),null);case 22:case 23:return Ko(),r=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==r&&(t.flags|=8192),r&&t.mode&1?Ce&1073741824&&(ue(t),t.subtreeFlags&6&&(t.flags|=8192)):ue(t),null;case 24:return null;case 25:return null}throw Error(k(156,t.tag))}function $f(e,t){switch(Mo(t),t.tag){case 1:return ke(t.type)&&si(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return xn(),V(we),V(de),Fo(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return Do(t),null;case 13:if(V(Y),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(k(340));kn()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return V(Y),null;case 4:return xn(),null;case 10:return Ao(t.type._context),null;case 22:case 23:return Ko(),null;case 24:return null;default:return null}}var Fr=!1,ce=!1,Bf=typeof WeakSet=="function"?WeakSet:Set,C=null;function cn(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){Z(e,t,r)}else n.current=null}function ql(e,t,n){try{n()}catch(r){Z(e,t,r)}}var es=!1;function Hf(e,t){if(Rl=ii,e=du(),_o(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var i=r.anchorOffset,l=r.focusNode;r=r.focusOffset;try{n.nodeType,l.nodeType}catch{n=null;break e}var o=0,a=-1,s=-1,u=0,h=0,m=e,p=null;t:for(;;){for(var y;m!==n||i!==0&&m.nodeType!==3||(a=o+i),m!==l||r!==0&&m.nodeType!==3||(s=o+r),m.nodeType===3&&(o+=m.nodeValue.length),(y=m.firstChild)!==null;)p=m,m=y;for(;;){if(m===e)break t;if(p===n&&++u===i&&(a=o),p===l&&++h===r&&(s=o),(y=m.nextSibling)!==null)break;m=p,p=m.parentNode}m=y}n=a===-1||s===-1?null:{start:a,end:s}}else n=null}n=n||{start:0,end:0}}else n=null;for(Il={focusedElem:e,selectionRange:n},ii=!1,C=t;C!==null;)if(t=C,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,C=e;else for(;C!==null;){t=C;try{var v=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(v!==null){var w=v.memoizedProps,L=v.memoizedState,d=t.stateNode,c=d.getSnapshotBeforeUpdate(t.elementType===t.type?w:Fe(t.type,w),L);d.__reactInternalSnapshotBeforeUpdate=c}break;case 3:var f=t.stateNode.containerInfo;f.nodeType===1?f.textContent="":f.nodeType===9&&f.documentElement&&f.removeChild(f.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(k(163))}}catch(g){Z(t,t.return,g)}if(e=t.sibling,e!==null){e.return=t.return,C=e;break}C=t.return}return v=es,es=!1,v}function qn(e,t,n){var r=t.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var i=r=r.next;do{if((i.tag&e)===e){var l=i.destroy;i.destroy=void 0,l!==void 0&&ql(t,n,l)}i=i.next}while(i!==r)}}function zi(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var r=n.create;n.destroy=r()}n=n.next}while(n!==t)}}function bl(e){var t=e.ref;if(t!==null){var n=e.stateNode;switch(e.tag){case 5:e=n;break;default:e=n}typeof t=="function"?t(e):t.current=e}}function ac(e){var t=e.alternate;t!==null&&(e.alternate=null,ac(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[Ge],delete t[dr],delete t[Ul],delete t[Cf],delete t[Pf])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function sc(e){return e.tag===5||e.tag===3||e.tag===4}function ts(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||sc(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function eo(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=ai));else if(r!==4&&(e=e.child,e!==null))for(eo(e,t,n),e=e.sibling;e!==null;)eo(e,t,n),e=e.sibling}function to(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(r!==4&&(e=e.child,e!==null))for(to(e,t,n),e=e.sibling;e!==null;)to(e,t,n),e=e.sibling}var le=null,Ue=!1;function ct(e,t,n){for(n=n.child;n!==null;)uc(e,t,n),n=n.sibling}function uc(e,t,n){if(Xe&&typeof Xe.onCommitFiberUnmount=="function")try{Xe.onCommitFiberUnmount(Ci,n)}catch{}switch(n.tag){case 5:ce||cn(n,t);case 6:var r=le,i=Ue;le=null,ct(e,t,n),le=r,Ue=i,le!==null&&(Ue?(e=le,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):le.removeChild(n.stateNode));break;case 18:le!==null&&(Ue?(e=le,n=n.stateNode,e.nodeType===8?il(e.parentNode,n):e.nodeType===1&&il(e,n),or(e)):il(le,n.stateNode));break;case 4:r=le,i=Ue,le=n.stateNode.containerInfo,Ue=!0,ct(e,t,n),le=r,Ue=i;break;case 0:case 11:case 14:case 15:if(!ce&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){i=r=r.next;do{var l=i,o=l.destroy;l=l.tag,o!==void 0&&(l&2||l&4)&&ql(n,t,o),i=i.next}while(i!==r)}ct(e,t,n);break;case 1:if(!ce&&(cn(n,t),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(a){Z(n,t,a)}ct(e,t,n);break;case 21:ct(e,t,n);break;case 22:n.mode&1?(ce=(r=ce)||n.memoizedState!==null,ct(e,t,n),ce=r):ct(e,t,n);break;default:ct(e,t,n)}}function ns(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new Bf),t.forEach(function(r){var i=Jf.bind(null,e,r);n.has(r)||(n.add(r),r.then(i,i))})}}function De(e,t){var n=t.deletions;if(n!==null)for(var r=0;r<n.length;r++){var i=n[r];try{var l=e,o=t,a=o;e:for(;a!==null;){switch(a.tag){case 5:le=a.stateNode,Ue=!1;break e;case 3:le=a.stateNode.containerInfo,Ue=!0;break e;case 4:le=a.stateNode.containerInfo,Ue=!0;break e}a=a.return}if(le===null)throw Error(k(160));uc(l,o,i),le=null,Ue=!1;var s=i.alternate;s!==null&&(s.return=null),i.return=null}catch(u){Z(i,t,u)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)cc(t,e),t=t.sibling}function cc(e,t){var n=e.alternate,r=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(De(t,e),We(e),r&4){try{qn(3,e,e.return),zi(3,e)}catch(w){Z(e,e.return,w)}try{qn(5,e,e.return)}catch(w){Z(e,e.return,w)}}break;case 1:De(t,e),We(e),r&512&&n!==null&&cn(n,n.return);break;case 5:if(De(t,e),We(e),r&512&&n!==null&&cn(n,n.return),e.flags&32){var i=e.stateNode;try{nr(i,"")}catch(w){Z(e,e.return,w)}}if(r&4&&(i=e.stateNode,i!=null)){var l=e.memoizedProps,o=n!==null?n.memoizedProps:l,a=e.type,s=e.updateQueue;if(e.updateQueue=null,s!==null)try{a==="input"&&l.type==="radio"&&l.name!=null&&zs(i,l),Pl(a,o);var u=Pl(a,l);for(o=0;o<s.length;o+=2){var h=s[o],m=s[o+1];h==="style"?Ds(i,m):h==="dangerouslySetInnerHTML"?Rs(i,m):h==="children"?nr(i,m):mo(i,h,m,u)}switch(a){case"input":kl(i,l);break;case"textarea":As(i,l);break;case"select":var p=i._wrapperState.wasMultiple;i._wrapperState.wasMultiple=!!l.multiple;var y=l.value;y!=null?fn(i,!!l.multiple,y,!1):p!==!!l.multiple&&(l.defaultValue!=null?fn(i,!!l.multiple,l.defaultValue,!0):fn(i,!!l.multiple,l.multiple?[]:"",!1))}i[dr]=l}catch(w){Z(e,e.return,w)}}break;case 6:if(De(t,e),We(e),r&4){if(e.stateNode===null)throw Error(k(162));i=e.stateNode,l=e.memoizedProps;try{i.nodeValue=l}catch(w){Z(e,e.return,w)}}break;case 3:if(De(t,e),We(e),r&4&&n!==null&&n.memoizedState.isDehydrated)try{or(t.containerInfo)}catch(w){Z(e,e.return,w)}break;case 4:De(t,e),We(e);break;case 13:De(t,e),We(e),i=e.child,i.flags&8192&&(l=i.memoizedState!==null,i.stateNode.isHidden=l,!l||i.alternate!==null&&i.alternate.memoizedState!==null||(Yo=q())),r&4&&ns(e);break;case 22:if(h=n!==null&&n.memoizedState!==null,e.mode&1?(ce=(u=ce)||h,De(t,e),ce=u):De(t,e),We(e),r&8192){if(u=e.memoizedState!==null,(e.stateNode.isHidden=u)&&!h&&e.mode&1)for(C=e,h=e.child;h!==null;){for(m=C=h;C!==null;){switch(p=C,y=p.child,p.tag){case 0:case 11:case 14:case 15:qn(4,p,p.return);break;case 1:cn(p,p.return);var v=p.stateNode;if(typeof v.componentWillUnmount=="function"){r=p,n=p.return;try{t=r,v.props=t.memoizedProps,v.state=t.memoizedState,v.componentWillUnmount()}catch(w){Z(r,n,w)}}break;case 5:cn(p,p.return);break;case 22:if(p.memoizedState!==null){is(m);continue}}y!==null?(y.return=p,C=y):is(m)}h=h.sibling}e:for(h=null,m=e;;){if(m.tag===5){if(h===null){h=m;try{i=m.stateNode,u?(l=i.style,typeof l.setProperty=="function"?l.setProperty("display","none","important"):l.display="none"):(a=m.stateNode,s=m.memoizedProps.style,o=s!=null&&s.hasOwnProperty("display")?s.display:null,a.style.display=Is("display",o))}catch(w){Z(e,e.return,w)}}}else if(m.tag===6){if(h===null)try{m.stateNode.nodeValue=u?"":m.memoizedProps}catch(w){Z(e,e.return,w)}}else if((m.tag!==22&&m.tag!==23||m.memoizedState===null||m===e)&&m.child!==null){m.child.return=m,m=m.child;continue}if(m===e)break e;for(;m.sibling===null;){if(m.return===null||m.return===e)break e;h===m&&(h=null),m=m.return}h===m&&(h=null),m.sibling.return=m.return,m=m.sibling}}break;case 19:De(t,e),We(e),r&4&&ns(e);break;case 21:break;default:De(t,e),We(e)}}function We(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(sc(n)){var r=n;break e}n=n.return}throw Error(k(160))}switch(r.tag){case 5:var i=r.stateNode;r.flags&32&&(nr(i,""),r.flags&=-33);var l=ts(e);to(e,l,i);break;case 3:case 4:var o=r.stateNode.containerInfo,a=ts(e);eo(e,a,o);break;default:throw Error(k(161))}}catch(s){Z(e,e.return,s)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function Vf(e,t,n){C=e,dc(e)}function dc(e,t,n){for(var r=(e.mode&1)!==0;C!==null;){var i=C,l=i.child;if(i.tag===22&&r){var o=i.memoizedState!==null||Fr;if(!o){var a=i.alternate,s=a!==null&&a.memoizedState!==null||ce;a=Fr;var u=ce;if(Fr=o,(ce=s)&&!u)for(C=i;C!==null;)o=C,s=o.child,o.tag===22&&o.memoizedState!==null?ls(i):s!==null?(s.return=o,C=s):ls(i);for(;l!==null;)C=l,dc(l),l=l.sibling;C=i,Fr=a,ce=u}rs(e)}else i.subtreeFlags&8772&&l!==null?(l.return=i,C=l):rs(e)}}function rs(e){for(;C!==null;){var t=C;if(t.flags&8772){var n=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:ce||zi(5,t);break;case 1:var r=t.stateNode;if(t.flags&4&&!ce)if(n===null)r.componentDidMount();else{var i=t.elementType===t.type?n.memoizedProps:Fe(t.type,n.memoizedProps);r.componentDidUpdate(i,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var l=t.updateQueue;l!==null&&Ba(t,l,r);break;case 3:var o=t.updateQueue;if(o!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}Ba(t,o,n)}break;case 5:var a=t.stateNode;if(n===null&&t.flags&4){n=a;var s=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":s.autoFocus&&n.focus();break;case"img":s.src&&(n.src=s.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var u=t.alternate;if(u!==null){var h=u.memoizedState;if(h!==null){var m=h.dehydrated;m!==null&&or(m)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(k(163))}ce||t.flags&512&&bl(t)}catch(p){Z(t,t.return,p)}}if(t===e){C=null;break}if(n=t.sibling,n!==null){n.return=t.return,C=n;break}C=t.return}}function is(e){for(;C!==null;){var t=C;if(t===e){C=null;break}var n=t.sibling;if(n!==null){n.return=t.return,C=n;break}C=t.return}}function ls(e){for(;C!==null;){var t=C;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{zi(4,t)}catch(s){Z(t,n,s)}break;case 1:var r=t.stateNode;if(typeof r.componentDidMount=="function"){var i=t.return;try{r.componentDidMount()}catch(s){Z(t,i,s)}}var l=t.return;try{bl(t)}catch(s){Z(t,l,s)}break;case 5:var o=t.return;try{bl(t)}catch(s){Z(t,o,s)}}}catch(s){Z(t,t.return,s)}if(t===e){C=null;break}var a=t.sibling;if(a!==null){a.return=t.return,C=a;break}C=t.return}}var Wf=Math.ceil,yi=lt.ReactCurrentDispatcher,Qo=lt.ReactCurrentOwner,je=lt.ReactCurrentBatchConfig,I=0,ie=null,ee=null,oe=0,Ce=0,dn=Mt(0),ne=0,gr=null,Wt=0,Ai=0,Go=0,bn=null,ge=null,Yo=0,Cn=1/0,Ze=null,wi=!1,no=null,Et=null,Ur=!1,gt=null,ki=0,er=0,ro=null,Zr=-1,Jr=0;function me(){return I&6?q():Zr!==-1?Zr:Zr=q()}function Ct(e){return e.mode&1?I&2&&oe!==0?oe&-oe:_f.transition!==null?(Jr===0&&(Jr=Ks()),Jr):(e=F,e!==0||(e=window.event,e=e===void 0?16:nu(e.type)),e):1}function He(e,t,n,r){if(50<er)throw er=0,ro=null,Error(k(185));wr(e,n,r),(!(I&2)||e!==ie)&&(e===ie&&(!(I&2)&&(Ai|=n),ne===4&&ht(e,oe)),Se(e,r),n===1&&I===0&&!(t.mode&1)&&(Cn=q()+500,Mi&&Lt()))}function Se(e,t){var n=e.callbackNode;Nd(e,t);var r=ri(e,e===ie?oe:0);if(r===0)n!==null&&ma(n),e.callbackNode=null,e.callbackPriority=0;else if(t=r&-r,e.callbackPriority!==t){if(n!=null&&ma(n),t===1)e.tag===0?Nf(os.bind(null,e)):Su(os.bind(null,e)),xf(function(){!(I&6)&&Lt()}),n=null;else{switch(Zs(r)){case 1:n=wo;break;case 4:n=Ys;break;case 16:n=ni;break;case 536870912:n=Xs;break;default:n=ni}n=wc(n,fc.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function fc(e,t){if(Zr=-1,Jr=0,I&6)throw Error(k(327));var n=e.callbackNode;if(gn()&&e.callbackNode!==n)return null;var r=ri(e,e===ie?oe:0);if(r===0)return null;if(r&30||r&e.expiredLanes||t)t=Si(e,r);else{t=r;var i=I;I|=2;var l=mc();(ie!==e||oe!==t)&&(Ze=null,Cn=q()+500,Ut(e,t));do try{Yf();break}catch(a){pc(e,a)}while(!0);zo(),yi.current=l,I=i,ee!==null?t=0:(ie=null,oe=0,t=ne)}if(t!==0){if(t===2&&(i=Ll(e),i!==0&&(r=i,t=io(e,i))),t===1)throw n=gr,Ut(e,0),ht(e,r),Se(e,q()),n;if(t===6)ht(e,r);else{if(i=e.current.alternate,!(r&30)&&!Qf(i)&&(t=Si(e,r),t===2&&(l=Ll(e),l!==0&&(r=l,t=io(e,l))),t===1))throw n=gr,Ut(e,0),ht(e,r),Se(e,q()),n;switch(e.finishedWork=i,e.finishedLanes=r,t){case 0:case 1:throw Error(k(345));case 2:Rt(e,ge,Ze);break;case 3:if(ht(e,r),(r&130023424)===r&&(t=Yo+500-q(),10<t)){if(ri(e,0)!==0)break;if(i=e.suspendedLanes,(i&r)!==r){me(),e.pingedLanes|=e.suspendedLanes&i;break}e.timeoutHandle=Fl(Rt.bind(null,e,ge,Ze),t);break}Rt(e,ge,Ze);break;case 4:if(ht(e,r),(r&4194240)===r)break;for(t=e.eventTimes,i=-1;0<r;){var o=31-Be(r);l=1<<o,o=t[o],o>i&&(i=o),r&=~l}if(r=i,r=q()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*Wf(r/1960))-r,10<r){e.timeoutHandle=Fl(Rt.bind(null,e,ge,Ze),r);break}Rt(e,ge,Ze);break;case 5:Rt(e,ge,Ze);break;default:throw Error(k(329))}}}return Se(e,q()),e.callbackNode===n?fc.bind(null,e):null}function io(e,t){var n=bn;return e.current.memoizedState.isDehydrated&&(Ut(e,t).flags|=256),e=Si(e,t),e!==2&&(t=ge,ge=n,t!==null&&lo(t)),e}function lo(e){ge===null?ge=e:ge.push.apply(ge,e)}function Qf(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var i=n[r],l=i.getSnapshot;i=i.value;try{if(!Ve(l(),i))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function ht(e,t){for(t&=~Go,t&=~Ai,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Be(t),r=1<<n;e[n]=-1,t&=~r}}function os(e){if(I&6)throw Error(k(327));gn();var t=ri(e,0);if(!(t&1))return Se(e,q()),null;var n=Si(e,t);if(e.tag!==0&&n===2){var r=Ll(e);r!==0&&(t=r,n=io(e,r))}if(n===1)throw n=gr,Ut(e,0),ht(e,t),Se(e,q()),n;if(n===6)throw Error(k(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,Rt(e,ge,Ze),Se(e,q()),null}function Xo(e,t){var n=I;I|=1;try{return e(t)}finally{I=n,I===0&&(Cn=q()+500,Mi&&Lt())}}function Qt(e){gt!==null&&gt.tag===0&&!(I&6)&&gn();var t=I;I|=1;var n=je.transition,r=F;try{if(je.transition=null,F=1,e)return e()}finally{F=r,je.transition=n,I=t,!(I&6)&&Lt()}}function Ko(){Ce=dn.current,V(dn)}function Ut(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,Sf(n)),ee!==null)for(n=ee.return;n!==null;){var r=n;switch(Mo(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&si();break;case 3:xn(),V(we),V(de),Fo();break;case 5:Do(r);break;case 4:xn();break;case 13:V(Y);break;case 19:V(Y);break;case 10:Ao(r.type._context);break;case 22:case 23:Ko()}n=n.return}if(ie=e,ee=e=Pt(e.current,null),oe=Ce=t,ne=0,gr=null,Go=Ai=Wt=0,ge=bn=null,Dt!==null){for(t=0;t<Dt.length;t++)if(n=Dt[t],r=n.interleaved,r!==null){n.interleaved=null;var i=r.next,l=n.pending;if(l!==null){var o=l.next;l.next=i,r.next=o}n.pending=r}Dt=null}return e}function pc(e,t){do{var n=ee;try{if(zo(),Yr.current=gi,vi){for(var r=X.memoizedState;r!==null;){var i=r.queue;i!==null&&(i.pending=null),r=r.next}vi=!1}if(Vt=0,re=te=X=null,Jn=!1,mr=0,Qo.current=null,n===null||n.return===null){ne=1,gr=t,ee=null;break}e:{var l=e,o=n.return,a=n,s=t;if(t=oe,a.flags|=32768,s!==null&&typeof s=="object"&&typeof s.then=="function"){var u=s,h=a,m=h.tag;if(!(h.mode&1)&&(m===0||m===11||m===15)){var p=h.alternate;p?(h.updateQueue=p.updateQueue,h.memoizedState=p.memoizedState,h.lanes=p.lanes):(h.updateQueue=null,h.memoizedState=null)}var y=Ya(o);if(y!==null){y.flags&=-257,Xa(y,o,a,l,t),y.mode&1&&Ga(l,u,t),t=y,s=u;var v=t.updateQueue;if(v===null){var w=new Set;w.add(s),t.updateQueue=w}else v.add(s);break e}else{if(!(t&1)){Ga(l,u,t),Zo();break e}s=Error(k(426))}}else if(G&&a.mode&1){var L=Ya(o);if(L!==null){!(L.flags&65536)&&(L.flags|=256),Xa(L,o,a,l,t),Lo(En(s,a));break e}}l=s=En(s,a),ne!==4&&(ne=2),bn===null?bn=[l]:bn.push(l),l=o;do{switch(l.tag){case 3:l.flags|=65536,t&=-t,l.lanes|=t;var d=Zu(l,s,t);$a(l,d);break e;case 1:a=s;var c=l.type,f=l.stateNode;if(!(l.flags&128)&&(typeof c.getDerivedStateFromError=="function"||f!==null&&typeof f.componentDidCatch=="function"&&(Et===null||!Et.has(f)))){l.flags|=65536,t&=-t,l.lanes|=t;var g=Ju(l,a,t);$a(l,g);break e}}l=l.return}while(l!==null)}vc(n)}catch(x){t=x,ee===n&&n!==null&&(ee=n=n.return);continue}break}while(!0)}function mc(){var e=yi.current;return yi.current=gi,e===null?gi:e}function Zo(){(ne===0||ne===3||ne===2)&&(ne=4),ie===null||!(Wt&268435455)&&!(Ai&268435455)||ht(ie,oe)}function Si(e,t){var n=I;I|=2;var r=mc();(ie!==e||oe!==t)&&(Ze=null,Ut(e,t));do try{Gf();break}catch(i){pc(e,i)}while(!0);if(zo(),I=n,yi.current=r,ee!==null)throw Error(k(261));return ie=null,oe=0,ne}function Gf(){for(;ee!==null;)hc(ee)}function Yf(){for(;ee!==null&&!gd();)hc(ee)}function hc(e){var t=yc(e.alternate,e,Ce);e.memoizedProps=e.pendingProps,t===null?vc(e):ee=t,Qo.current=null}function vc(e){var t=e;do{var n=t.alternate;if(e=t.return,t.flags&32768){if(n=$f(n,t),n!==null){n.flags&=32767,ee=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{ne=6,ee=null;return}}else if(n=Uf(n,t,Ce),n!==null){ee=n;return}if(t=t.sibling,t!==null){ee=t;return}ee=t=e}while(t!==null);ne===0&&(ne=5)}function Rt(e,t,n){var r=F,i=je.transition;try{je.transition=null,F=1,Xf(e,t,n,r)}finally{je.transition=i,F=r}return null}function Xf(e,t,n,r){do gn();while(gt!==null);if(I&6)throw Error(k(327));n=e.finishedWork;var i=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(k(177));e.callbackNode=null,e.callbackPriority=0;var l=n.lanes|n.childLanes;if(_d(e,l),e===ie&&(ee=ie=null,oe=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||Ur||(Ur=!0,wc(ni,function(){return gn(),null})),l=(n.flags&15990)!==0,n.subtreeFlags&15990||l){l=je.transition,je.transition=null;var o=F;F=1;var a=I;I|=4,Qo.current=null,Hf(e,n),cc(n,e),mf(Il),ii=!!Rl,Il=Rl=null,e.current=n,Vf(n),yd(),I=a,F=o,je.transition=l}else e.current=n;if(Ur&&(Ur=!1,gt=e,ki=i),l=e.pendingLanes,l===0&&(Et=null),Sd(n.stateNode),Se(e,q()),t!==null)for(r=e.onRecoverableError,n=0;n<t.length;n++)i=t[n],r(i.value,{componentStack:i.stack,digest:i.digest});if(wi)throw wi=!1,e=no,no=null,e;return ki&1&&e.tag!==0&&gn(),l=e.pendingLanes,l&1?e===ro?er++:(er=0,ro=e):er=0,Lt(),null}function gn(){if(gt!==null){var e=Zs(ki),t=je.transition,n=F;try{if(je.transition=null,F=16>e?16:e,gt===null)var r=!1;else{if(e=gt,gt=null,ki=0,I&6)throw Error(k(331));var i=I;for(I|=4,C=e.current;C!==null;){var l=C,o=l.child;if(C.flags&16){var a=l.deletions;if(a!==null){for(var s=0;s<a.length;s++){var u=a[s];for(C=u;C!==null;){var h=C;switch(h.tag){case 0:case 11:case 15:qn(8,h,l)}var m=h.child;if(m!==null)m.return=h,C=m;else for(;C!==null;){h=C;var p=h.sibling,y=h.return;if(ac(h),h===u){C=null;break}if(p!==null){p.return=y,C=p;break}C=y}}}var v=l.alternate;if(v!==null){var w=v.child;if(w!==null){v.child=null;do{var L=w.sibling;w.sibling=null,w=L}while(w!==null)}}C=l}}if(l.subtreeFlags&2064&&o!==null)o.return=l,C=o;else e:for(;C!==null;){if(l=C,l.flags&2048)switch(l.tag){case 0:case 11:case 15:qn(9,l,l.return)}var d=l.sibling;if(d!==null){d.return=l.return,C=d;break e}C=l.return}}var c=e.current;for(C=c;C!==null;){o=C;var f=o.child;if(o.subtreeFlags&2064&&f!==null)f.return=o,C=f;else e:for(o=c;C!==null;){if(a=C,a.flags&2048)try{switch(a.tag){case 0:case 11:case 15:zi(9,a)}}catch(x){Z(a,a.return,x)}if(a===o){C=null;break e}var g=a.sibling;if(g!==null){g.return=a.return,C=g;break e}C=a.return}}if(I=i,Lt(),Xe&&typeof Xe.onPostCommitFiberRoot=="function")try{Xe.onPostCommitFiberRoot(Ci,e)}catch{}r=!0}return r}finally{F=n,je.transition=t}}return!1}function as(e,t,n){t=En(n,t),t=Zu(e,t,1),e=xt(e,t,1),t=me(),e!==null&&(wr(e,1,t),Se(e,t))}function Z(e,t,n){if(e.tag===3)as(e,e,n);else for(;t!==null;){if(t.tag===3){as(t,e,n);break}else if(t.tag===1){var r=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(Et===null||!Et.has(r))){e=En(n,e),e=Ju(t,e,1),t=xt(t,e,1),e=me(),t!==null&&(wr(t,1,e),Se(t,e));break}}t=t.return}}function Kf(e,t,n){var r=e.pingCache;r!==null&&r.delete(t),t=me(),e.pingedLanes|=e.suspendedLanes&n,ie===e&&(oe&n)===n&&(ne===4||ne===3&&(oe&130023424)===oe&&500>q()-Yo?Ut(e,0):Go|=n),Se(e,t)}function gc(e,t){t===0&&(e.mode&1?(t=Mr,Mr<<=1,!(Mr&130023424)&&(Mr=4194304)):t=1);var n=me();e=rt(e,t),e!==null&&(wr(e,t,n),Se(e,n))}function Zf(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),gc(e,n)}function Jf(e,t){var n=0;switch(e.tag){case 13:var r=e.stateNode,i=e.memoizedState;i!==null&&(n=i.retryLane);break;case 19:r=e.stateNode;break;default:throw Error(k(314))}r!==null&&r.delete(t),gc(e,n)}var yc;yc=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||we.current)ye=!0;else{if(!(e.lanes&n)&&!(t.flags&128))return ye=!1,Ff(e,t,n);ye=!!(e.flags&131072)}else ye=!1,G&&t.flags&1048576&&xu(t,di,t.index);switch(t.lanes=0,t.tag){case 2:var r=t.type;Kr(e,t),e=t.pendingProps;var i=wn(t,de.current);vn(t,n),i=$o(null,t,r,e,i,n);var l=Bo();return t.flags|=1,typeof i=="object"&&i!==null&&typeof i.render=="function"&&i.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,ke(r)?(l=!0,ui(t)):l=!1,t.memoizedState=i.state!==null&&i.state!==void 0?i.state:null,Ro(t),i.updater=Oi,t.stateNode=i,i._reactInternals=t,Ql(t,r,e,n),t=Xl(null,t,r,!0,l,n)):(t.tag=0,G&&l&&To(t),pe(null,t,i,n),t=t.child),t;case 16:r=t.elementType;e:{switch(Kr(e,t),e=t.pendingProps,i=r._init,r=i(r._payload),t.type=r,i=t.tag=bf(r),e=Fe(r,e),i){case 0:t=Yl(null,t,r,e,n);break e;case 1:t=Ja(null,t,r,e,n);break e;case 11:t=Ka(null,t,r,e,n);break e;case 14:t=Za(null,t,r,Fe(r.type,e),n);break e}throw Error(k(306,r,""))}return t;case 0:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:Fe(r,i),Yl(e,t,r,i,n);case 1:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:Fe(r,i),Ja(e,t,r,i,n);case 3:e:{if(tc(t),e===null)throw Error(k(387));r=t.pendingProps,l=t.memoizedState,i=l.element,Tu(e,t),mi(t,r,null,n);var o=t.memoizedState;if(r=o.element,l.isDehydrated)if(l={element:r,isDehydrated:!1,cache:o.cache,pendingSuspenseBoundaries:o.pendingSuspenseBoundaries,transitions:o.transitions},t.updateQueue.baseState=l,t.memoizedState=l,t.flags&256){i=En(Error(k(423)),t),t=qa(e,t,r,n,i);break e}else if(r!==i){i=En(Error(k(424)),t),t=qa(e,t,r,n,i);break e}else for(Pe=St(t.stateNode.containerInfo.firstChild),Ne=t,G=!0,$e=null,n=Nu(t,null,r,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(kn(),r===i){t=it(e,t,n);break e}pe(e,t,r,n)}t=t.child}return t;case 5:return Mu(t),e===null&&Hl(t),r=t.type,i=t.pendingProps,l=e!==null?e.memoizedProps:null,o=i.children,Dl(r,i)?o=null:l!==null&&Dl(r,l)&&(t.flags|=32),ec(e,t),pe(e,t,o,n),t.child;case 6:return e===null&&Hl(t),null;case 13:return nc(e,t,n);case 4:return Io(t,t.stateNode.containerInfo),r=t.pendingProps,e===null?t.child=Sn(t,null,r,n):pe(e,t,r,n),t.child;case 11:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:Fe(r,i),Ka(e,t,r,i,n);case 7:return pe(e,t,t.pendingProps,n),t.child;case 8:return pe(e,t,t.pendingProps.children,n),t.child;case 12:return pe(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(r=t.type._context,i=t.pendingProps,l=t.memoizedProps,o=i.value,B(fi,r._currentValue),r._currentValue=o,l!==null)if(Ve(l.value,o)){if(l.children===i.children&&!we.current){t=it(e,t,n);break e}}else for(l=t.child,l!==null&&(l.return=t);l!==null;){var a=l.dependencies;if(a!==null){o=l.child;for(var s=a.firstContext;s!==null;){if(s.context===r){if(l.tag===1){s=et(-1,n&-n),s.tag=2;var u=l.updateQueue;if(u!==null){u=u.shared;var h=u.pending;h===null?s.next=s:(s.next=h.next,h.next=s),u.pending=s}}l.lanes|=n,s=l.alternate,s!==null&&(s.lanes|=n),Vl(l.return,n,t),a.lanes|=n;break}s=s.next}}else if(l.tag===10)o=l.type===t.type?null:l.child;else if(l.tag===18){if(o=l.return,o===null)throw Error(k(341));o.lanes|=n,a=o.alternate,a!==null&&(a.lanes|=n),Vl(o,n,t),o=l.sibling}else o=l.child;if(o!==null)o.return=l;else for(o=l;o!==null;){if(o===t){o=null;break}if(l=o.sibling,l!==null){l.return=o.return,o=l;break}o=o.return}l=o}pe(e,t,i.children,n),t=t.child}return t;case 9:return i=t.type,r=t.pendingProps.children,vn(t,n),i=Re(i),r=r(i),t.flags|=1,pe(e,t,r,n),t.child;case 14:return r=t.type,i=Fe(r,t.pendingProps),i=Fe(r.type,i),Za(e,t,r,i,n);case 15:return qu(e,t,t.type,t.pendingProps,n);case 17:return r=t.type,i=t.pendingProps,i=t.elementType===r?i:Fe(r,i),Kr(e,t),t.tag=1,ke(r)?(e=!0,ui(t)):e=!1,vn(t,n),Ku(t,r,i),Ql(t,r,i,n),Xl(null,t,r,!0,e,n);case 19:return rc(e,t,n);case 22:return bu(e,t,n)}throw Error(k(156,t.tag))};function wc(e,t){return Gs(e,t)}function qf(e,t,n,r){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Ae(e,t,n,r){return new qf(e,t,n,r)}function Jo(e){return e=e.prototype,!(!e||!e.isReactComponent)}function bf(e){if(typeof e=="function")return Jo(e)?1:0;if(e!=null){if(e=e.$$typeof,e===vo)return 11;if(e===go)return 14}return 2}function Pt(e,t){var n=e.alternate;return n===null?(n=Ae(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function qr(e,t,n,r,i,l){var o=2;if(r=e,typeof e=="function")Jo(e)&&(o=1);else if(typeof e=="string")o=5;else e:switch(e){case en:return $t(n.children,i,l,t);case ho:o=8,i|=8;break;case hl:return e=Ae(12,n,t,i|2),e.elementType=hl,e.lanes=l,e;case vl:return e=Ae(13,n,t,i),e.elementType=vl,e.lanes=l,e;case gl:return e=Ae(19,n,t,i),e.elementType=gl,e.lanes=l,e;case Ms:return ji(n,i,l,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case _s:o=10;break e;case Ts:o=9;break e;case vo:o=11;break e;case go:o=14;break e;case dt:o=16,r=null;break e}throw Error(k(130,e==null?e:typeof e,""))}return t=Ae(o,n,t,i),t.elementType=e,t.type=r,t.lanes=l,t}function $t(e,t,n,r){return e=Ae(7,e,r,t),e.lanes=n,e}function ji(e,t,n,r){return e=Ae(22,e,r,t),e.elementType=Ms,e.lanes=n,e.stateNode={isHidden:!1},e}function fl(e,t,n){return e=Ae(6,e,null,t),e.lanes=n,e}function pl(e,t,n){return t=Ae(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function ep(e,t,n,r,i){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Yi(0),this.expirationTimes=Yi(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Yi(0),this.identifierPrefix=r,this.onRecoverableError=i,this.mutableSourceEagerHydrationData=null}function qo(e,t,n,r,i,l,o,a,s){return e=new ep(e,t,n,a,s),t===1?(t=1,l===!0&&(t|=8)):t=0,l=Ae(3,null,null,t),e.current=l,l.stateNode=e,l.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},Ro(l),e}function tp(e,t,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:bt,key:r==null?null:""+r,children:e,containerInfo:t,implementation:n}}function kc(e){if(!e)return _t;e=e._reactInternals;e:{if(Yt(e)!==e||e.tag!==1)throw Error(k(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(ke(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(k(171))}if(e.tag===1){var n=e.type;if(ke(n))return ku(e,n,t)}return t}function Sc(e,t,n,r,i,l,o,a,s){return e=qo(n,r,!0,e,i,l,o,a,s),e.context=kc(null),n=e.current,r=me(),i=Ct(n),l=et(r,i),l.callback=t??null,xt(n,l,i),e.current.lanes=i,wr(e,i,r),Se(e,r),e}function Ri(e,t,n,r){var i=t.current,l=me(),o=Ct(i);return n=kc(n),t.context===null?t.context=n:t.pendingContext=n,t=et(l,o),t.payload={element:e},r=r===void 0?null:r,r!==null&&(t.callback=r),e=xt(i,t,o),e!==null&&(He(e,i,o,l),Gr(e,i,o)),o}function xi(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function ss(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function bo(e,t){ss(e,t),(e=e.alternate)&&ss(e,t)}function np(){return null}var xc=typeof reportError=="function"?reportError:function(e){console.error(e)};function ea(e){this._internalRoot=e}Ii.prototype.render=ea.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(k(409));Ri(e,t,null,null)};Ii.prototype.unmount=ea.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;Qt(function(){Ri(null,e,null,null)}),t[nt]=null}};function Ii(e){this._internalRoot=e}Ii.prototype.unstable_scheduleHydration=function(e){if(e){var t=bs();e={blockedOn:null,target:e,priority:t};for(var n=0;n<mt.length&&t!==0&&t<mt[n].priority;n++);mt.splice(n,0,e),n===0&&tu(e)}};function ta(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function Di(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function us(){}function rp(e,t,n,r,i){if(i){if(typeof r=="function"){var l=r;r=function(){var u=xi(o);l.call(u)}}var o=Sc(t,r,e,0,null,!1,!1,"",us);return e._reactRootContainer=o,e[nt]=o.current,ur(e.nodeType===8?e.parentNode:e),Qt(),o}for(;i=e.lastChild;)e.removeChild(i);if(typeof r=="function"){var a=r;r=function(){var u=xi(s);a.call(u)}}var s=qo(e,0,!1,null,null,!1,!1,"",us);return e._reactRootContainer=s,e[nt]=s.current,ur(e.nodeType===8?e.parentNode:e),Qt(function(){Ri(t,s,n,r)}),s}function Fi(e,t,n,r,i){var l=n._reactRootContainer;if(l){var o=l;if(typeof i=="function"){var a=i;i=function(){var s=xi(o);a.call(s)}}Ri(t,o,e,i)}else o=rp(n,t,e,i,r);return xi(o)}Js=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=Wn(t.pendingLanes);n!==0&&(ko(t,n|1),Se(t,q()),!(I&6)&&(Cn=q()+500,Lt()))}break;case 13:Qt(function(){var r=rt(e,1);if(r!==null){var i=me();He(r,e,1,i)}}),bo(e,1)}};So=function(e){if(e.tag===13){var t=rt(e,134217728);if(t!==null){var n=me();He(t,e,134217728,n)}bo(e,134217728)}};qs=function(e){if(e.tag===13){var t=Ct(e),n=rt(e,t);if(n!==null){var r=me();He(n,e,t,r)}bo(e,t)}};bs=function(){return F};eu=function(e,t){var n=F;try{return F=e,t()}finally{F=n}};_l=function(e,t,n){switch(t){case"input":if(kl(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var r=n[t];if(r!==e&&r.form===e.form){var i=Ti(r);if(!i)throw Error(k(90));Os(r),kl(r,i)}}}break;case"textarea":As(e,n);break;case"select":t=n.value,t!=null&&fn(e,!!n.multiple,t,!1)}};$s=Xo;Bs=Qt;var ip={usingClientEntryPoint:!1,Events:[Sr,ln,Ti,Fs,Us,Xo]},Un={findFiberByHostInstance:It,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},lp={bundleType:Un.bundleType,version:Un.version,rendererPackageName:Un.rendererPackageName,rendererConfig:Un.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:lt.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=Ws(e),e===null?null:e.stateNode},findFiberByHostInstance:Un.findFiberByHostInstance||np,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var $r=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!$r.isDisabled&&$r.supportsFiber)try{Ci=$r.inject(lp),Xe=$r}catch{}}Te.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ip;Te.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!ta(t))throw Error(k(200));return tp(e,t,null,n)};Te.createRoot=function(e,t){if(!ta(e))throw Error(k(299));var n=!1,r="",i=xc;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(r=t.identifierPrefix),t.onRecoverableError!==void 0&&(i=t.onRecoverableError)),t=qo(e,1,!1,null,null,n,!1,r,i),e[nt]=t.current,ur(e.nodeType===8?e.parentNode:e),new ea(t)};Te.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(k(188)):(e=Object.keys(e).join(","),Error(k(268,e)));return e=Ws(t),e=e===null?null:e.stateNode,e};Te.flushSync=function(e){return Qt(e)};Te.hydrate=function(e,t,n){if(!Di(t))throw Error(k(200));return Fi(null,e,t,!0,n)};Te.hydrateRoot=function(e,t,n){if(!ta(e))throw Error(k(405));var r=n!=null&&n.hydratedSources||null,i=!1,l="",o=xc;if(n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(l=n.identifierPrefix),n.onRecoverableError!==void 0&&(o=n.onRecoverableError)),t=Sc(t,null,e,1,n??null,i,!1,l,o),e[nt]=t.current,ur(e),r)for(e=0;e<r.length;e++)n=r[e],i=n._getVersion,i=i(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,i]:t.mutableSourceEagerHydrationData.push(n,i);return new Ii(t)};Te.render=function(e,t,n){if(!Di(t))throw Error(k(200));return Fi(null,e,t,!1,n)};Te.unmountComponentAtNode=function(e){if(!Di(e))throw Error(k(40));return e._reactRootContainer?(Qt(function(){Fi(null,null,e,!1,function(){e._reactRootContainer=null,e[nt]=null})}),!0):!1};Te.unstable_batchedUpdates=Xo;Te.unstable_renderSubtreeIntoContainer=function(e,t,n,r){if(!Di(n))throw Error(k(200));if(e==null||e._reactInternals===void 0)throw Error(k(38));return Fi(e,t,n,!1,r)};Te.version="18.3.1-next-f1338f8080-20240426";function Ec(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Ec)}catch(e){console.error(e)}}Ec(),Es.exports=Te;var op=Es.exports,Cc,cs=op;Cc=cs.createRoot,cs.hydrateRoot;function ap(e,t,n={}){const r=Object.assign({color:"#8fa3c8",particleCount:2400,size:.055,speed:1,radius:1.5},n),i={idle:{spin:.06,pulseAmp:.035,pulseFreq:1.6,spread:.6,jitter:0,drift:1,tilt:0,flash:0,color:null},listening:{spin:.12,pulseAmp:.11,pulseFreq:3.2,spread:0,jitter:0,drift:.3,tilt:0,flash:0,color:"#43d9ad"},thinking:{spin:1.6,pulseAmp:.02,pulseFreq:1,spread:0,jitter:0,drift:.2,tilt:1,flash:0,color:"#a78bfa"},speaking:{spin:.18,pulseAmp:.17,pulseFreq:7,spread:6.3,jitter:0,drift:.3,tilt:0,flash:0,color:"#fbbf24"},error:{spin:0,pulseAmp:.02,pulseFreq:8,spread:0,jitter:.05,drift:.1,tilt:0,flash:1,color:"#ef4444"}},l={idle:.1,listening:1,thinking:0,speaking:.9,error:0},o=typeof matchMedia<"u"?matchMedia("(prefers-reduced-motion: reduce)"):null;let a=o&&o.matches?.15:1;const s=D=>{a=D.matches?.15:1};o&&o.addEventListener("change",s);const u=new e.Scene,h=new e.PerspectiveCamera(50,1,.1,100);h.position.z=4.6;const m=new e.WebGLRenderer({antialias:!0,alpha:!0});m.setPixelRatio(Math.min(devicePixelRatio||1,2)),m.domElement.style.display="block",t.appendChild(m.domElement);const p=document.createElement("canvas");p.width=p.height=64;const y=p.getContext("2d"),v=y.createRadialGradient(32,32,0,32,32,32);v.addColorStop(0,"rgba(255,255,255,1)"),v.addColorStop(.35,"rgba(255,255,255,0.8)"),v.addColorStop(1,"rgba(255,255,255,0)"),y.fillStyle=v,y.fillRect(0,0,64,64);const w=new e.CanvasTexture(p),L=new e.PointsMaterial({size:r.size,map:w,color:new e.Color(r.color),transparent:!0,opacity:.95,depthWrite:!1,blending:e.AdditiveBlending});let d=null,c=null,f=null,g=null;function x(){d&&(u.remove(d),c.dispose());const D=Math.min(2e4,Math.max(10,Math.round(r.particleCount)));f=new Float32Array(D*3),g=new Float32Array(D);for(let $=0;$<D;$++){const xe=Math.random(),fe=r.radius*(.18+.82*Math.pow(xe,.9)),Ee=Math.random()*Math.PI*2,At=Math.random()*2-1,Er=Math.sqrt(1-At*At);f[$*3]=fe*Er*Math.cos(Ee),f[$*3+1]=fe*Er*Math.sin(Ee),f[$*3+2]=fe*At,g[$]=Math.random()*Math.PI*2}c=new e.BufferGeometry,c.setAttribute("position",new e.BufferAttribute(f.slice(),3)),d=new e.Points(c,L),u.add(d)}x();let P="idle";const N=D=>new e.Color(i[D].color||r.color);let S=Object.assign({},i.idle),z=Object.assign({},i.idle),T=N("idle"),U=0,Le=0,ot=-1,On=-1;function Ot(){const D=t.clientWidth||1,$=t.clientHeight||1;D===ot&&$===On||(ot=D,On=$,m.setSize(D,$,!1),m.domElement.style.width="100%",m.domElement.style.height="100%",h.aspect=D/$,h.updateProjectionMatrix())}Ot();const at=typeof ResizeObserver<"u"?new ResizeObserver(Ot):null;at&&at.observe(t),window.addEventListener("resize",Ot);let zt=0,E=performance.now(),O=0;const A=["spin","pulseAmp","pulseFreq","spread","jitter","drift","tilt","flash"],W=new e.Color;function J(D){zt=requestAnimationFrame(J),Ot();const $=Math.min((D-E)/1e3,.05);E=D,O+=$*r.speed;const xe=1-Math.exp(-$*4.5);for(let st=0;st<A.length;st++){const ut=A[st];z[ut]+=(S[ut]-z[ut])*xe}L.color.lerp(T,xe),z.flash>.01&&(W.setHSL(0,.85,.45+.18*Math.sin(O*11)),L.color.lerp(W,z.flash*.6));const fe=U>Le?1-Math.exp(-$*30):1-Math.exp(-$*8);Le+=(U-Le)*fe;const Ee=Le*(l[P]||0)*.3*a,At=c.attributes.position.array,Er=g.length,Nc=z.pulseAmp*a,Xt=z.jitter*a,$i=z.drift*a;for(let st=0;st<Er;st++){const ut=g[st],Bi=1+Ee+Nc*Math.sin(O*z.pulseFreq+ut*z.spread),Kt=st*3;At[Kt]=f[Kt]*Bi+Math.sin(O*.31+ut*7.1)*.05*$i+(Xt?(Math.random()-.5)*Xt:0),At[Kt+1]=f[Kt+1]*Bi+Math.sin(O*.27+ut*5.3)*.05*$i+(Xt?(Math.random()-.5)*Xt:0),At[Kt+2]=f[Kt+2]*Bi+Math.sin(O*.23+ut*3.7)*.05*$i+(Xt?(Math.random()-.5)*Xt:0)}c.attributes.position.needsUpdate=!0,d.rotation.y+=z.spin*$*r.speed*a;const _c=Math.sin(O*.8)*.35*z.tilt*a;d.rotation.x+=(_c-d.rotation.x)*xe,m.render(u,h)}return zt=requestAnimationFrame(J),{setState(D){i[D]&&(P=D,S=Object.assign({},i[D]),T=N(D),D==="error"&&(z=Object.assign({},i[D]),L.color.copy(T)))},getState(){return P},setAudioLevel(D){U=Math.max(0,Math.min(1,D))},setParams(D){const $=r.particleCount,xe=r.radius;if(Object.assign(r,D),L.size=r.size,r.particleCount!==$)x();else if(r.radius!==xe&&xe>0){const fe=r.radius/xe;for(let Ee=0;Ee<f.length;Ee++)f[Ee]*=fe}T=N(P)},destroy(){cancelAnimationFrame(zt),window.removeEventListener("resize",Ot),o&&o.removeEventListener("change",s),at&&at.disconnect(),c.dispose(),L.dispose(),w.dispose(),m.dispose(),m.forceContextLoss(),m.domElement.remove()}}}function sp(e,t={}){const n=Object.assign({hue:220,speed:1,rings:3,glow:.6},t),r={idle:null,listening:165,thinking:260,speaking:38,error:0},i=document.createElement("div");i.className="cssav state-idle";const l=document.createElement("style");l.textContent=`
.cssav {
  --h: 220; --spd: 1; --glow: 0.6;
  position: relative; width: 100%; height: 100%;
  display: grid; place-items: center; overflow: hidden;
  container-type: size; /* cqmin sizes rings/orb off the MIN dimension */
}
.cssav .orb-wrap {
  width: 26cqmin; aspect-ratio: 1; display: grid; place-items: center;
  /* audio-reactive + contraction layer: no keyframe animation touches this element */
  transform: scale(calc(var(--contract, 1) * (1 + var(--amp, 0) * var(--sens, 0) * 0.18)));
  transition: transform 90ms linear;
}
.cssav .orb {
  width: 100%; height: 100%; border-radius: 50%;
  background: radial-gradient(circle at 38% 34%,
    hsl(var(--h) 85% 72%), hsl(var(--h) 70% 52%) 55%, hsl(var(--h) 60% 34%));
  box-shadow:
    0 0 calc(50px * var(--glow)) calc(6px * var(--glow)) hsl(var(--h) 80% 60% / 0.55),
    inset 0 0 24px hsl(var(--h) 90% 80% / 0.35);
  transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.35s ease;
}
.cssav .ring {
  position: absolute; aspect-ratio: 1; border-radius: 50%;
  border: 1.5px solid hsl(var(--h) 75% 62% / 0.45);
  border-top-color: hsl(var(--h) 90% 72% / 0.95);
  transition: border-color 0.4s ease, opacity 0.4s ease, transform 0.4s ease;
  opacity: 0.35;
}
@keyframes cssav-breath { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
@keyframes cssav-ring-drift { 0%,100% { transform: rotate(0deg) scale(1) } 50% { transform: rotate(12deg) scale(1.015) } }
@keyframes cssav-ripple {
  0% { transform: scale(0.72); opacity: 0.85 }
  100% { transform: scale(1.22); opacity: 0 }
}
@keyframes cssav-spin { to { transform: rotate(360deg) } }
@keyframes cssav-speak {
  0%,100% { transform: scale(1) }
  22% { transform: scale(1.14) }
  40% { transform: scale(0.99) }
  62% { transform: scale(1.1) }
  80% { transform: scale(1.02) }
}
@keyframes cssav-shake {
  0%,100% { transform: translateX(0) }
  15% { transform: translateX(-9px) } 35% { transform: translateX(8px) }
  55% { transform: translateX(-5px) } 75% { transform: translateX(4px) }
}
@keyframes cssav-flash {
  0%,100% { box-shadow: 0 0 26px 3px hsl(0 85% 58% / 0.45) }
  50% { box-shadow: 0 0 64px 14px hsl(0 90% 60% / 0.85) }
}

.cssav.state-idle { --sens: 0.1 }
.cssav.state-idle .orb { animation: cssav-breath calc(4s / var(--spd)) ease-in-out infinite }
.cssav.state-idle .ring { animation: cssav-ring-drift calc(7s / var(--spd)) ease-in-out infinite }

.cssav.state-listening { --sens: 1 }
.cssav.state-listening .orb { animation: cssav-breath calc(1.4s / var(--spd)) ease-in-out infinite }
.cssav.state-listening .ring {
  animation: cssav-ripple calc(1.8s / var(--spd)) ease-out infinite;
  animation-delay: calc(var(--i) * 0.45s / var(--spd));
}

.cssav.state-thinking { --contract: 0.92 }
.cssav.state-thinking .orb { animation: cssav-breath calc(5s / var(--spd)) ease-in-out infinite }
.cssav.state-thinking .ring {
  border-style: dashed; opacity: 0.75;
  animation: cssav-spin calc(3.2s / var(--spd)) linear infinite;
  animation-delay: calc(var(--i) * -0.6s);
  animation-direction: var(--dir, normal);
}

.cssav.state-speaking { --sens: 0.9 }
.cssav.state-speaking .orb { animation: cssav-speak calc(0.62s / var(--spd)) ease-in-out infinite }
.cssav.state-speaking .ring {
  opacity: 0.6;
  animation: cssav-breath calc(0.62s / var(--spd)) ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.08s);
}

.cssav.state-error { animation: cssav-shake 0.42s ease-out 1 }
.cssav.state-error .orb { transform: scale(0.94); animation: cssav-flash calc(1.3s / var(--spd)) ease-in-out infinite }
.cssav.state-error .ring { opacity: 0.25 }

@media (prefers-reduced-motion: reduce) {
  .cssav, .cssav .orb, .cssav .ring { animation: none !important }
  .cssav .orb-wrap { transform: none !important }
}
`,i.appendChild(l);const o=document.createElement("div");o.className="orb-wrap";const a=document.createElement("div");a.className="orb",o.appendChild(a),i.appendChild(o);let s=[];function u(){for(const y of s)y.remove();s=[];const p=Math.max(0,Math.round(n.rings));for(let y=0;y<p;y++){const v=document.createElement("div");v.className="ring";const w=40+(y+1)*52/p;v.style.width=w+"cqmin",v.style.setProperty("--i",String(y)),v.style.setProperty("--dir",y%2?"reverse":"normal"),i.appendChild(v),s.push(v)}}let h="idle";function m(){const p=r[h]==null?n.hue:r[h];i.style.setProperty("--h",String(p)),i.style.setProperty("--spd",String(n.speed)),i.style.setProperty("--glow",String(n.glow))}return u(),m(),e.appendChild(i),{setState(p){p in r&&(h=p,i.className="cssav state-"+p,m())},getState(){return h},setAudioLevel(p){i.style.setProperty("--amp",String(Math.max(0,Math.min(1,p))))},setParams(p){const y=n.rings;Object.assign(n,p),n.rings!==y&&u(),m()},destroy(){i.remove()}}}function up(e,t,n,r={}){const i=Object.assign({speed:1,hueShift:0,scale:.8},r),l={idle:[0,120],listening:[120,240],thinking:[240,360],speaking:[360,480],error:[480,600]},o={idle:.1,listening:1,thinking:0,speaking:.9,error:0},a=typeof matchMedia<"u"&&matchMedia("(prefers-reduced-motion: reduce)").matches,s=document.createElement("div");s.style.cssText="width:100%;height:100%;display:grid;place-items:center";const u=document.createElement("div");s.appendChild(u),t.appendChild(s);function h(){u.style.width=Math.round(i.scale*100)+"%",u.style.maxWidth="440px",u.style.aspectRatio="1",u.style.filter=i.hueShift?`hue-rotate(${i.hueShift}deg)`:"",u.style.transition="transform 90ms linear"}h();const m=e.loadAnimation({container:u,renderer:"svg",loop:!0,autoplay:!0,animationData:JSON.parse(JSON.stringify(n)),initialSegment:l.idle});let p="idle",y=0;function v(){m.setSpeed(i.speed*(a?.15:1))}v();function w(){if(a)return;const L=y*(o[p]||0);u.style.transform=L>.005?`scale(${1+L*.12})`:""}return{setState(L){l[L]&&(p=L,m.playSegments(l[L],!0),w())},getState(){return p},setAudioLevel(L){y=Math.max(0,Math.min(1,L)),w()},setParams(L){Object.assign(i,L),h(),v()},destroy(){m.destroy(),s.remove()}}}function cp(e,t={}){const n=Object.assign({hue:210,speed:1},t),r={idle:null,listening:165,thinking:260,speaking:38,error:0},i=document.createElement("div");i.className="rivav state-idle",i.innerHTML=`
<style>
.rivav { --h: 210; --spd: 1; --amp: 0; --sens: 0; width:100%; height:100%; display:grid; place-items:center; }
.rivav svg {
  width: 62%; max-width: 340px; overflow: visible;
  transform: scale(calc(1 + var(--amp) * var(--sens) * 0.12));
  transition: transform 90ms linear;
}
.rivav.state-idle { --sens: 0.1 }
.rivav.state-listening { --sens: 1 }
.rivav.state-speaking { --sens: 0.9 }
.rivav .head {
  fill: hsl(var(--h) 30% 16%); stroke: hsl(var(--h) 70% 60%); stroke-width: 2.5;
  transition: fill .4s ease, stroke .4s ease;
}
.rivav .eye { fill: hsl(var(--h) 85% 70%); transition: fill .4s ease; transform-origin: center; transform-box: fill-box; }
.rivav .mouth { fill: hsl(var(--h) 85% 70%); transition: fill .4s ease; transform-origin: center; transform-box: fill-box; }
.rivav .dot, .rivav .arc, .rivav .xeye { opacity: 0; transition: opacity .3s ease }
.rivav .arc { stroke: hsl(var(--h) 85% 70%); fill: none; stroke-width: 3; stroke-linecap: round }
.rivav .dot { fill: hsl(var(--h) 85% 70%) }
.rivav .xeye { stroke: hsl(0 85% 62%); stroke-width: 3.5; stroke-linecap: round }

@keyframes riv-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(0.08) } }
@keyframes riv-talk { 0%,100% { transform: scaleY(0.35) } 30% { transform: scaleY(1.25) } 60% { transform: scaleY(0.6) } 80% { transform: scaleY(1) } }
@keyframes riv-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes riv-dots { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
@keyframes riv-arc-pulse { 0%,100% { opacity: .25; transform: scale(1) } 50% { opacity: 1; transform: scale(1.12) } }
@keyframes riv-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-8px) } 45% { transform: translateX(7px) } 70% { transform: translateX(-4px) } }

.rivav .face { animation: riv-bob calc(3.4s / var(--spd)) ease-in-out infinite }
.rivav .eye { animation: riv-blink calc(4.6s / var(--spd)) ease-in-out infinite }

.rivav.state-listening .eye { transform: scale(1.3); animation: none }
.rivav.state-listening .arc { opacity: 1; transform-origin: center; transform-box: fill-box; animation: riv-arc-pulse calc(1.2s / var(--spd)) ease-in-out infinite }
.rivav.state-listening .arc.a2 { animation-delay: calc(.3s / var(--spd)) }

.rivav.state-thinking .eye { transform: translateY(-7px) scale(0.85); animation: none }
.rivav.state-thinking .mouth { transform: scaleY(0.3) scaleX(0.6) }
.rivav.state-thinking .dot { animation: riv-dots calc(1.4s / var(--spd)) ease-in-out infinite }
.rivav.state-thinking .dot.d2 { animation-delay: calc(.22s / var(--spd)) }
.rivav.state-thinking .dot.d3 { animation-delay: calc(.44s / var(--spd)) }

.rivav.state-speaking .mouth { animation: riv-talk calc(.5s / var(--spd)) ease-in-out infinite }
.rivav.state-speaking .face { animation: riv-bob calc(1.1s / var(--spd)) ease-in-out infinite }

.rivav.state-error { animation: riv-shake .45s ease-out 1 }
.rivav.state-error .face { animation: none }
.rivav.state-error .eye { opacity: 0; animation: none }
.rivav.state-error .xeye { opacity: 1 }
.rivav.state-error .mouth { transform: scaleY(0.25) translateY(6px) }

@media (prefers-reduced-motion: reduce) {
  .rivav, .rivav * { animation: none !important }
  .rivav svg { transform: none !important }
}
</style>
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g class="face">
    <rect class="head" x="40" y="46" width="120" height="108" rx="34"/>
    <circle class="eye" cx="78" cy="92" r="9"/>
    <circle class="eye" cx="122" cy="92" r="9"/>
    <g class="xeye"><line x1="71" y1="85" x2="85" y2="99"/><line x1="85" y1="85" x2="71" y2="99"/></g>
    <g class="xeye"><line x1="115" y1="85" x2="129" y2="99"/><line x1="129" y1="85" x2="115" y2="99"/></g>
    <rect class="mouth" x="82" y="118" width="36" height="14" rx="7"/>
    <circle class="dot d1" cx="76" cy="26" r="5"/>
    <circle class="dot d2" cx="100" cy="20" r="6"/>
    <circle class="dot d3" cx="124" cy="26" r="5"/>
    <path class="arc a1" d="M 26 78 Q 14 100 26 122"/>
    <path class="arc a2" d="M 174 78 Q 186 100 174 122"/>
  </g>
</svg>`;const l=()=>{let u=!1;return{get value(){return u},set value(h){u=!!h,s()}}},o={isListening:l(),isThinking:l(),isSpeaking:l(),errorTrigger:{fire:()=>s("error")},audioLevel:{get value(){return Number(i.style.getPropertyValue("--amp"))||0},set value(u){i.style.setProperty("--amp",String(Math.max(0,Math.min(1,u))))}}};let a="idle";function s(u){const h=u||(o.isSpeaking.value?"speaking":o.isThinking.value?"thinking":o.isListening.value?"listening":"idle");a=h,i.className="rivav state-"+h;const m=r[h]==null?n.hue:r[h];i.style.setProperty("--h",String(m)),i.style.setProperty("--spd",String(n.speed))}return s(),e.appendChild(i),{setState(u){u in r&&(o.isListening.value=u==="listening",o.isThinking.value=u==="thinking",o.isSpeaking.value=u==="speaking",u==="error"?o.errorTrigger.fire():s())},getState(){return a},setAudioLevel(u){o.audioLevel.value=Math.max(0,Math.min(1,u)),i.style.setProperty("--amp",String(o.audioLevel.value))},stateMachineInputs(){return o},setParams(u){Object.assign(n,u),s(a==="error"?"error":void 0)},destroy(){i.remove()}}}function dp(e,t,n={}){const r=Object.assign({color:"#8fa3c8",dots:6,speed:1},n),i={idle:null,listening:"#43d9ad",thinking:"#a78bfa",speaking:"#fbbf24",error:"#ef4444"},l={idle:.1,listening:1,thinking:0,speaking:.9,error:0},o=typeof matchMedia<"u"&&matchMedia("(prefers-reduced-motion: reduce)").matches,a=document.createElement("div");a.style.cssText="width:100%;height:100%;display:grid;place-items:center";const s="http://www.w3.org/2000/svg",u=document.createElementNS(s,"svg");u.setAttribute("viewBox","0 0 200 200"),u.style.cssText="width:70%;max-width:380px;overflow:visible;transition:transform 90ms linear",a.appendChild(u);const h="gsapblur-"+Math.random().toString(36).slice(2,8),m=document.createElementNS(s,"defs");m.innerHTML=`<filter id="${h}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="10"/></filter>`,u.appendChild(m);const p=document.createElementNS(s,"circle");p.setAttribute("cx","100"),p.setAttribute("cy","100"),p.setAttribute("r","36"),p.setAttribute("filter",`url(#${h})`),p.setAttribute("opacity","0.45"),u.appendChild(p);const y=document.createElementNS(s,"g");u.appendChild(y);const v=document.createElementNS(s,"circle");v.setAttribute("cx","100"),v.setAttribute("cy","100"),v.setAttribute("r","30"),u.appendChild(v);let w=[];function L(){for(const z of w)z.remove();w=[];const S=Math.max(0,Math.round(r.dots));for(let z=0;z<S;z++){const T=document.createElementNS(s,"g");T.setAttribute("transform",`rotate(${360/S*z} 100 100)`);const U=document.createElementNS(s,"circle");U.setAttribute("cx","100"),U.setAttribute("cy","38"),U.setAttribute("r","6"),T.appendChild(U),y.appendChild(T),w.push(T)}}L(),t.appendChild(a);let d="idle",c=null,f=0;function g(S){return i[S]||r.color}function x(){if(o)return;const S=f*(l[d]||0);u.style.transform=S>.005?`scale(${1+S*.14})`:""}function P(){return r.speed*(o?.15:1)}function N(S){c&&c.kill(),e.killTweensOf([v,p,y,a,...w.flatMap(U=>[U,U.firstChild])]);const z=g(S),T=w.map(U=>U.firstChild);switch(e.set(y,{rotation:0,transformOrigin:"100px 100px"}),e.set([v,...T],{scale:1,transformOrigin:"100px 100px",x:0,y:0}),e.set(a,{x:0}),e.set(T,{attr:{cy:38},opacity:.55}),S==="error"?e.set([v,p,...T],{fill:z}):e.to([v,p,...T],{fill:z,duration:.4,overwrite:"auto"}),c=e.timeline({repeat:-1}),S){case"idle":c.to(v,{scale:1.06,duration:2,ease:"sine.inOut"}).to(v,{scale:1,duration:2,ease:"sine.inOut"}),c.to(T,{opacity:.3,duration:2,ease:"sine.inOut"},0).to(T,{opacity:.55,duration:2,ease:"sine.inOut"},2);break;case"listening":c.to(T,{attr:{cy:26},opacity:.95,duration:.55,ease:"sine.out"}).to(T,{attr:{cy:38},opacity:.55,duration:.55,ease:"sine.in"}),c.to(v,{scale:1.09,duration:.55,ease:"sine.out"},0).to(v,{scale:1,duration:.55,ease:"sine.in"},.55);break;case"thinking":c.to(y,{rotation:360,duration:3,ease:"none"}),e.set(v,{scale:.92,transformOrigin:"100px 100px"});break;case"speaking":c.to(v,{scale:1.18,duration:.11,ease:"power2.out"}).to(v,{scale:.97,duration:.13,ease:"power2.in"}).to(v,{scale:1.12,duration:.1,ease:"power2.out"}).to(v,{scale:1,duration:.14,ease:"power2.in"}).to(v,{scale:1.2,duration:.12,ease:"power2.out"}).to(v,{scale:1.02,duration:.16,ease:"power2.in"}),c.to(T,{scale:1.25,duration:.38,ease:"sine.inOut",transformOrigin:"100px 100px"},0).to(T,{scale:1,duration:.38,ease:"sine.inOut"},.38);break;case"error":{o||e.timeline().to(a,{x:-9,duration:.06}).to(a,{x:8,duration:.06}).to(a,{x:-5,duration:.06}).to(a,{x:4,duration:.06}).to(a,{x:0,duration:.06}),c.kill(),c=e.timeline({repeat:-1,delay:.35}),c.to(v,{opacity:.55,duration:.65,ease:"sine.inOut"}).to(v,{opacity:1,duration:.65,ease:"sine.inOut"}),e.set(v,{scale:.94}),e.set(T,{opacity:.2});break}}c.timeScale(P())}return N("idle"),{setState(S){S in i&&(d=S,N(S),x())},getState(){return d},setAudioLevel(S){f=Math.max(0,Math.min(1,S)),x()},setParams(S){const z=r.dots,T=r.color;if(Object.assign(r,S),r.dots!==z){L(),N(d);return}if(c&&c.timeScale(P()),r.color!==T){const U=w.map(Le=>Le.firstChild);e.to([v,p,...U],{fill:g(d),duration:.3,overwrite:"auto"})}},destroy(){c&&c.kill(),e.killTweensOf([v,p,y,a,...w.flatMap(S=>[S,S.firstChild])]),a.remove()}}}function fp(e,t,n={}){const r=Object.assign({color:"#8fa3c8",grid:5,speed:1},n),i={idle:null,listening:"#43d9ad",thinking:"#a78bfa",speaking:"#fbbf24",error:"#ef4444"},l={idle:.1,listening:1,thinking:0,speaking:.9,error:0},o=typeof matchMedia<"u"&&matchMedia("(prefers-reduced-motion: reduce)").matches,a=()=>r.speed*(o?.15:1),s=document.createElement("div");s.style.cssText="width:100%;height:100%;display:grid;place-items:center";const u=document.createElement("div");u.style.cssText="transition:transform 90ms linear;display:grid;place-items:center;width:100%";const h=document.createElement("div");u.appendChild(h),s.appendChild(u),t.appendChild(s);let m=[];function p(){h.innerHTML="";const c=Math.max(2,Math.round(r.grid));h.style.cssText=`display:grid;grid-template-columns:repeat(${c},1fr);gap:14px;width:min(56%,320px);aspect-ratio:1`,m=[];for(let f=0;f<c*c;f++){const g=document.createElement("div");g.style.cssText="width:100%;aspect-ratio:1;border-radius:50%;background:var(--dotc);opacity:.6;transition:background .4s ease;box-shadow:0 0 16px color-mix(in srgb, var(--dotc) 45%, transparent)",h.appendChild(g),m.push(g)}}let y="idle";function v(){e.remove(m),e.remove(h),h.style.transform="";for(const c of m)c.style.opacity="0.6",c.style.transform=""}function w(c){v();const f=Math.round(r.grid);s.style.setProperty("--dotc",i[c]||r.color);const g=e.stagger(120/a(),{grid:[f,f],from:"center"});switch(c){case"idle":e({targets:m,opacity:[.35,.85],scale:[.92,1.04],delay:g,direction:"alternate",loop:!0,duration:1500/a(),easing:"easeInOutSine"});break;case"listening":e({targets:m,scale:[1,1.45],opacity:[.5,1],delay:g,direction:"alternate",loop:!0,duration:520/a(),easing:"easeInOutQuad"});break;case"thinking":e({targets:h,rotate:"360deg",duration:3200/a(),loop:!0,easing:"linear"}),e({targets:m,opacity:[.3,1],delay:e.stagger(90/a(),{grid:[f,f],from:"first"}),direction:"alternate",loop:!0,duration:700/a(),easing:"easeInOutSine"});break;case"speaking":e({targets:m,scale:[{value:1.5,duration:140/a(),easing:"easeOutQuad"},{value:1,duration:260/a(),easing:"easeInQuad"}],opacity:[{value:1,duration:140/a()},{value:.55,duration:260/a()}],delay:()=>e.random(0,420/a()),loop:!0});break;case"error":o||e({targets:h,translateX:[0,-10,9,-5,4,0],duration:450,easing:"easeOutQuad"}),e({targets:m,opacity:[.4,.95],delay:g,direction:"alternate",loop:!0,duration:900/a(),easing:"easeInOutSine"});break}}p(),w("idle");let L=0;function d(){if(o)return;const c=L*(l[y]||0);u.style.transform=c>.005?`scale(${1+c*.12})`:""}return{setState(c){c in i&&(y=c,w(c),d())},getState(){return y},setAudioLevel(c){L=Math.max(0,Math.min(1,c)),d()},setParams(c){const f=r.grid;Object.assign(r,c),r.grid!==f&&(v(),p()),w(y)},destroy(){v(),s.remove()}}}const M=(e,t)=>({t:e,s:t,i:{x:[.42],y:[1]},o:{x:[.58],y:[0]}}),Ye=(e,t)=>({t:e,s:t,h:1}),pt=(e,t)=>({t:e,s:t,i:{x:[1],y:[1]},o:{x:[0],y:[0]}}),Tn=e=>({a:1,k:e}),Q=e=>({a:0,k:e}),$n={idle:[.56,.64,.78,1],listening:[.26,.85,.68,1],thinking:[.65,.55,.98,1],speaking:[.98,.75,.28,1],error:[.94,.3,.3,1]},ds=Tn([Ye(0,$n.idle),Ye(120,$n.listening),Ye(240,$n.thinking),Ye(360,$n.speaking),Ye(480,$n.error)]),j=e=>[e,e,100],pp=Tn([M(0,j(100)),M(60,j(107)),M(120,j(100)),M(150,j(118)),M(180,j(100)),M(210,j(118)),M(240,j(100)),M(260,j(94)),M(340,j(94)),M(360,j(100)),M(372,j(122)),M(384,j(102)),M(396,j(118)),M(408,j(100)),M(420,j(124)),M(432,j(104)),M(444,j(120)),M(456,j(100)),M(468,j(115)),M(480,j(100)),M(486,j(82)),M(492,j(112)),M(498,j(90)),M(510,j(96)),M(599,j(96))]),mp=Tn([Ye(0,[200,200,0]),pt(480,[200,200,0]),pt(484,[188,200,0]),pt(488,[211,200,0]),pt(492,[194,200,0]),pt(496,[205,200,0]),pt(500,[200,200,0]),Ye(599,[200,200,0])]),hp=Tn([Ye(0,[0]),pt(240,[0]),pt(360,[720]),Ye(361,[0]),Ye(599,[0])]),vp=Tn([M(0,[22]),M(60,[34]),M(119,[22]),M(120,[65]),M(150,[15]),M(180,[65]),M(210,[15]),M(239,[40]),M(250,[75]),M(350,[75]),M(360,[30]),M(390,[65]),M(420,[30]),M(450,[65]),M(479,[55]),M(480,[70]),M(495,[15]),M(510,[70]),M(525,[15]),M(540,[55]),M(599,[55])]),gp=Tn([M(0,j(100)),M(119,j(100)),M(120,j(100)),M(150,j(126)),M(180,j(100)),M(210,j(126)),M(240,j(100)),M(260,j(86)),M(350,j(86)),M(360,j(100)),M(479,j(100)),M(486,j(90)),M(599,j(90))]),Pc={v:"5.7.4",fr:60,ip:0,op:600,w:400,h:400,nm:"avatar-states",ddd:0,assets:[],layers:[{ddd:0,ind:1,ty:4,nm:"core",sr:1,ks:{o:Q(100),r:Q(0),p:mp,a:Q([0,0,0]),s:pp},ao:0,shapes:[{ty:"gr",nm:"core-group",it:[{ty:"el",p:Q([0,0]),s:Q([120,120])},{ty:"fl",c:ds,o:Q(100)},{ty:"tr",p:Q([0,0]),a:Q([0,0]),s:Q([100,100]),r:Q(0),o:Q(100)}]}],ip:0,op:600,st:0},{ddd:0,ind:2,ty:4,nm:"ring",sr:1,ks:{o:vp,r:hp,p:Q([200,200,0]),a:Q([0,0,0]),s:gp},ao:0,shapes:[{ty:"gr",nm:"ring-group",it:[{ty:"el",p:Q([0,0]),s:Q([260,260])},{ty:"st",c:ds,o:Q(100),w:Q(5),lc:2,lj:1,ml:4,d:[{n:"d",nm:"dash",v:Q(26)},{n:"g",nm:"gap",v:Q(18)}]},{ty:"tr",p:Q([0,0]),a:Q([0,0]),s:Q([100,100]),r:Q(0),o:Q(100)}]}],ip:0,op:600,st:0}]},yp=`// Three.js dot-cloud avatar engine.
// Dependency-free: THREE is injected. This file is shared verbatim between the
// playground (module import) and the exported snippet (?raw embed) — keep it plain JS.
export function createThreeAvatar(THREE, container, userParams = {}) {
  const P = Object.assign(
    { color: '#8fa3c8', particleCount: 2400, size: 0.055, speed: 1, radius: 1.5 },
    userParams
  )

  // Per-state behavior targets. The rAF loop lerps \`cur\` toward \`tgt\`, so every
  // state change morphs smoothly for free. Error is the exception: it snaps.
  const STATES = {
    idle:      { spin: 0.06, pulseAmp: 0.035, pulseFreq: 1.6, spread: 0.6, jitter: 0, drift: 1.0, tilt: 0, flash: 0, color: null },
    listening: { spin: 0.12, pulseAmp: 0.11,  pulseFreq: 3.2, spread: 0.0, jitter: 0, drift: 0.3, tilt: 0, flash: 0, color: '#43d9ad' },
    thinking:  { spin: 1.6,  pulseAmp: 0.02,  pulseFreq: 1.0, spread: 0.0, jitter: 0, drift: 0.2, tilt: 1, flash: 0, color: '#a78bfa' },
    speaking:  { spin: 0.18, pulseAmp: 0.17,  pulseFreq: 7.0, spread: 6.3, jitter: 0, drift: 0.3, tilt: 0, flash: 0, color: '#fbbf24' },
    error:     { spin: 0.0,  pulseAmp: 0.02,  pulseFreq: 8.0, spread: 0.0, jitter: 0.05, drift: 0.1, tilt: 0, flash: 1, color: '#ef4444' },
  }

  // Audio amplitude sensitivity per state (skill reference values).
  const AUDIO_SENS = { idle: 0.1, listening: 1.0, thinking: 0, speaking: 0.9, error: 0 }

  const motionQuery = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  let motionScale = motionQuery && motionQuery.matches ? 0.15 : 1
  const onMotionChange = (e) => {
    motionScale = e.matches ? 0.15 : 1
  }
  if (motionQuery) motionQuery.addEventListener('change', onMotionChange)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.z = 4.6
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  // Soft round sprite so points render as glowing dots, not squares.
  const spriteCanvas = document.createElement('canvas')
  spriteCanvas.width = spriteCanvas.height = 64
  const ctx = spriteCanvas.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const sprite = new THREE.CanvasTexture(spriteCanvas)

  const material = new THREE.PointsMaterial({
    size: P.size,
    map: sprite,
    color: new THREE.Color(P.color),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  let points = null
  let geometry = null
  let base = null   // Float32Array of home positions
  let phase = null  // per-particle random phase

  function buildCloud() {
    if (points) {
      scene.remove(points)
      geometry.dispose()
    }
    const n = Math.min(20000, Math.max(10, Math.round(P.particleCount)))
    base = new Float32Array(n * 3)
    phase = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // Center-weighted distribution: with additive blending this yields a
      // luminous core with a soft halo instead of a flat starfield.
      const u = Math.random()
      const r = P.radius * (0.18 + 0.82 * Math.pow(u, 0.9))
      const theta = Math.random() * Math.PI * 2
      const cosphi = Math.random() * 2 - 1
      const sinphi = Math.sqrt(1 - cosphi * cosphi)
      base[i * 3] = r * sinphi * Math.cos(theta)
      base[i * 3 + 1] = r * sinphi * Math.sin(theta)
      base[i * 3 + 2] = r * cosphi
      phase[i] = Math.random() * Math.PI * 2
    }
    geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3))
    points = new THREE.Points(geometry, material)
    scene.add(points)
  }
  buildCloud()

  let stateName = 'idle'
  const resolveColor = (s) => new THREE.Color(STATES[s].color || P.color)
  let tgt = Object.assign({}, STATES.idle)
  let cur = Object.assign({}, STATES.idle)
  let tgtColor = resolveColor('idle')
  let audioTarget = 0
  let audioLvl = 0

  let lastW = -1
  let lastH = -1
  function resize() {
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    if (w === lastW && h === lastH) return
    lastW = w
    lastH = h
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
  if (ro) ro.observe(container)
  // Fallbacks for environments where RO delivery is throttled (hidden panes,
  // background tabs): window resize + a cheap per-tick size check in the loop.
  window.addEventListener('resize', resize)

  let raf = 0
  let last = performance.now()
  let time = 0
  // Hoisted out of the hot loop — no per-frame allocations.
  const LERP_KEYS = ['spin', 'pulseAmp', 'pulseFreq', 'spread', 'jitter', 'drift', 'tilt', 'flash']
  const flashScratch = new THREE.Color()

  function tick(now) {
    raf = requestAnimationFrame(tick)
    resize() // no-op unless the container size actually changed
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    time += dt * P.speed

    // Exponential smoothing toward the target behavior.
    const k = 1 - Math.exp(-dt * 4.5)
    for (let ki = 0; ki < LERP_KEYS.length; ki++) {
      const key = LERP_KEYS[ki]
      cur[key] += (tgt[key] - cur[key]) * k
    }
    material.color.lerp(tgtColor, k)
    if (cur.flash > 0.01) {
      // Error flash: pulse lightness on top of the red base.
      flashScratch.setHSL(0.0, 0.85, 0.45 + 0.18 * Math.sin(time * 11))
      material.color.lerp(flashScratch, cur.flash * 0.6)
    }

    // Audio: fast attack, slower release, scaled by state sensitivity.
    const aK = audioTarget > audioLvl ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 8)
    audioLvl += (audioTarget - audioLvl) * aK
    const audioBoost = audioLvl * (AUDIO_SENS[stateName] || 0) * 0.3 * motionScale

    const pos = geometry.attributes.position.array
    const n = phase.length
    const amp = cur.pulseAmp * motionScale
    const jit = cur.jitter * motionScale
    const dft = cur.drift * motionScale
    for (let i = 0; i < n; i++) {
      const ph = phase[i]
      const s = 1 + audioBoost + amp * Math.sin(time * cur.pulseFreq + ph * cur.spread)
      const i3 = i * 3
      pos[i3] = base[i3] * s + Math.sin(time * 0.31 + ph * 7.1) * 0.05 * dft + (jit ? (Math.random() - 0.5) * jit : 0)
      pos[i3 + 1] = base[i3 + 1] * s + Math.sin(time * 0.27 + ph * 5.3) * 0.05 * dft + (jit ? (Math.random() - 0.5) * jit : 0)
      pos[i3 + 2] = base[i3 + 2] * s + Math.sin(time * 0.23 + ph * 3.7) * 0.05 * dft + (jit ? (Math.random() - 0.5) * jit : 0)
    }
    geometry.attributes.position.needsUpdate = true

    points.rotation.y += cur.spin * dt * P.speed * motionScale
    const tiltTarget = Math.sin(time * 0.8) * 0.35 * cur.tilt * motionScale
    points.rotation.x += (tiltTarget - points.rotation.x) * k

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(tick)

  return {
    setState(next) {
      if (!STATES[next]) return
      stateName = next
      tgt = Object.assign({}, STATES[next])
      tgtColor = resolveColor(next)
      if (next === 'error') {
        // Snap, per the state-machine transition matrix: urgent states don't ease in.
        cur = Object.assign({}, STATES[next])
        material.color.copy(tgtColor)
      }
    },
    getState() {
      return stateName
    },
    setAudioLevel(level) {
      audioTarget = Math.max(0, Math.min(1, level))
    },
    setParams(next) {
      const prevCount = P.particleCount
      const prevRadius = P.radius
      Object.assign(P, next)
      material.size = P.size
      if (P.particleCount !== prevCount) {
        buildCloud()
      } else if (P.radius !== prevRadius && prevRadius > 0) {
        // Positions are linear in radius — scale in place instead of
        // re-randomizing the whole cloud on every slider step.
        const ratio = P.radius / prevRadius
        for (let i = 0; i < base.length; i++) base[i] *= ratio
      }
      tgtColor = resolveColor(stateName)
    },
    destroy() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      if (motionQuery) motionQuery.removeEventListener('change', onMotionChange)
      if (ro) ro.disconnect()
      geometry.dispose()
      material.dispose()
      sprite.dispose()
      renderer.dispose()
      renderer.forceContextLoss() // dispose() alone leaves the GL context live until GC
      renderer.domElement.remove()
    },
  }
}
`,wp=`// Pure CSS/SVG avatar engine — concentric rings around a glowing orb.
// Zero dependencies; states are class swaps, colors/speed ride on CSS custom
// properties. Shared verbatim between playground and export (?raw).
export function createCssAvatar(container, userParams = {}) {
  const P = Object.assign({ hue: 220, speed: 1, rings: 3, glow: 0.6 }, userParams)

  // Per-state hue: idle uses the configured base hue, the rest are signatures.
  const STATE_HUE = { idle: null, listening: 165, thinking: 260, speaking: 38, error: 0 }

  const root = document.createElement('div')
  root.className = 'cssav state-idle'

  const style = document.createElement('style')
  style.textContent = \`
.cssav {
  --h: 220; --spd: 1; --glow: 0.6;
  position: relative; width: 100%; height: 100%;
  display: grid; place-items: center; overflow: hidden;
  container-type: size; /* cqmin sizes rings/orb off the MIN dimension */
}
.cssav .orb-wrap {
  width: 26cqmin; aspect-ratio: 1; display: grid; place-items: center;
  /* audio-reactive + contraction layer: no keyframe animation touches this element */
  transform: scale(calc(var(--contract, 1) * (1 + var(--amp, 0) * var(--sens, 0) * 0.18)));
  transition: transform 90ms linear;
}
.cssav .orb {
  width: 100%; height: 100%; border-radius: 50%;
  background: radial-gradient(circle at 38% 34%,
    hsl(var(--h) 85% 72%), hsl(var(--h) 70% 52%) 55%, hsl(var(--h) 60% 34%));
  box-shadow:
    0 0 calc(50px * var(--glow)) calc(6px * var(--glow)) hsl(var(--h) 80% 60% / 0.55),
    inset 0 0 24px hsl(var(--h) 90% 80% / 0.35);
  transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.35s ease;
}
.cssav .ring {
  position: absolute; aspect-ratio: 1; border-radius: 50%;
  border: 1.5px solid hsl(var(--h) 75% 62% / 0.45);
  border-top-color: hsl(var(--h) 90% 72% / 0.95);
  transition: border-color 0.4s ease, opacity 0.4s ease, transform 0.4s ease;
  opacity: 0.35;
}
@keyframes cssav-breath { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
@keyframes cssav-ring-drift { 0%,100% { transform: rotate(0deg) scale(1) } 50% { transform: rotate(12deg) scale(1.015) } }
@keyframes cssav-ripple {
  0% { transform: scale(0.72); opacity: 0.85 }
  100% { transform: scale(1.22); opacity: 0 }
}
@keyframes cssav-spin { to { transform: rotate(360deg) } }
@keyframes cssav-speak {
  0%,100% { transform: scale(1) }
  22% { transform: scale(1.14) }
  40% { transform: scale(0.99) }
  62% { transform: scale(1.1) }
  80% { transform: scale(1.02) }
}
@keyframes cssav-shake {
  0%,100% { transform: translateX(0) }
  15% { transform: translateX(-9px) } 35% { transform: translateX(8px) }
  55% { transform: translateX(-5px) } 75% { transform: translateX(4px) }
}
@keyframes cssav-flash {
  0%,100% { box-shadow: 0 0 26px 3px hsl(0 85% 58% / 0.45) }
  50% { box-shadow: 0 0 64px 14px hsl(0 90% 60% / 0.85) }
}

.cssav.state-idle { --sens: 0.1 }
.cssav.state-idle .orb { animation: cssav-breath calc(4s / var(--spd)) ease-in-out infinite }
.cssav.state-idle .ring { animation: cssav-ring-drift calc(7s / var(--spd)) ease-in-out infinite }

.cssav.state-listening { --sens: 1 }
.cssav.state-listening .orb { animation: cssav-breath calc(1.4s / var(--spd)) ease-in-out infinite }
.cssav.state-listening .ring {
  animation: cssav-ripple calc(1.8s / var(--spd)) ease-out infinite;
  animation-delay: calc(var(--i) * 0.45s / var(--spd));
}

.cssav.state-thinking { --contract: 0.92 }
.cssav.state-thinking .orb { animation: cssav-breath calc(5s / var(--spd)) ease-in-out infinite }
.cssav.state-thinking .ring {
  border-style: dashed; opacity: 0.75;
  animation: cssav-spin calc(3.2s / var(--spd)) linear infinite;
  animation-delay: calc(var(--i) * -0.6s);
  animation-direction: var(--dir, normal);
}

.cssav.state-speaking { --sens: 0.9 }
.cssav.state-speaking .orb { animation: cssav-speak calc(0.62s / var(--spd)) ease-in-out infinite }
.cssav.state-speaking .ring {
  opacity: 0.6;
  animation: cssav-breath calc(0.62s / var(--spd)) ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.08s);
}

.cssav.state-error { animation: cssav-shake 0.42s ease-out 1 }
.cssav.state-error .orb { transform: scale(0.94); animation: cssav-flash calc(1.3s / var(--spd)) ease-in-out infinite }
.cssav.state-error .ring { opacity: 0.25 }

@media (prefers-reduced-motion: reduce) {
  .cssav, .cssav .orb, .cssav .ring { animation: none !important }
  .cssav .orb-wrap { transform: none !important }
}
\`
  root.appendChild(style)

  const orbWrap = document.createElement('div')
  orbWrap.className = 'orb-wrap'
  const orb = document.createElement('div')
  orb.className = 'orb'
  orbWrap.appendChild(orb)
  root.appendChild(orbWrap)

  let ringEls = []
  function buildRings() {
    for (const r of ringEls) r.remove()
    ringEls = []
    const n = Math.max(0, Math.round(P.rings))
    for (let i = 0; i < n; i++) {
      const ring = document.createElement('div')
      ring.className = 'ring'
      const size = 40 + ((i + 1) * 52) / n
      ring.style.width = size + 'cqmin' // min-dimension units: stays concentric in landscape
      ring.style.setProperty('--i', String(i))
      ring.style.setProperty('--dir', i % 2 ? 'reverse' : 'normal')
      root.appendChild(ring)
      ringEls.push(ring)
    }
  }

  let stateName = 'idle'
  function applyVars() {
    const hue = STATE_HUE[stateName] == null ? P.hue : STATE_HUE[stateName]
    root.style.setProperty('--h', String(hue))
    root.style.setProperty('--spd', String(P.speed))
    root.style.setProperty('--glow', String(P.glow))
  }

  buildRings()
  applyVars()
  container.appendChild(root)

  return {
    setState(next) {
      if (!(next in STATE_HUE)) return
      stateName = next
      root.className = 'cssav state-' + next
      applyVars()
    },
    getState() {
      return stateName
    },
    setAudioLevel(level) {
      root.style.setProperty('--amp', String(Math.max(0, Math.min(1, level))))
    },
    setParams(next) {
      const prevRings = P.rings
      Object.assign(P, next)
      if (P.rings !== prevRings) buildRings()
      applyVars()
    },
    destroy() {
      root.remove()
    },
  }
}
`,kp=`// Lottie avatar engine — one bundled timeline, five named segments.
// lottie (lottie-web) and the animation data are injected; states map to
// playSegments() calls. Data is deep-cloned because lottie-web mutates it.
export function createLottieAvatar(lottie, container, animationData, userParams = {}) {
  const P = Object.assign({ speed: 1, hueShift: 0, scale: 0.8 }, userParams)

  const SEGMENTS = {
    idle: [0, 120],
    listening: [120, 240],
    thinking: [240, 360],
    speaking: [360, 480],
    error: [480, 600],
  }
  const AUDIO_SENS = { idle: 0.1, listening: 1.0, thinking: 0, speaking: 0.9, error: 0 }

  const reduceMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const wrap = document.createElement('div')
  wrap.style.cssText = 'width:100%;height:100%;display:grid;place-items:center'
  const stage = document.createElement('div')
  wrap.appendChild(stage)
  container.appendChild(wrap)

  function applyParams() {
    stage.style.width = Math.round(P.scale * 100) + '%'
    stage.style.maxWidth = '440px'
    stage.style.aspectRatio = '1'
    stage.style.filter = P.hueShift ? \`hue-rotate(\${P.hueShift}deg)\` : ''
    stage.style.transition = 'transform 90ms linear'
  }
  applyParams()

  const anim = lottie.loadAnimation({
    container: stage,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: JSON.parse(JSON.stringify(animationData)),
    initialSegment: SEGMENTS.idle,
  })

  let stateName = 'idle'
  let audioLevel = 0
  function applySpeed() {
    anim.setSpeed(P.speed * (reduceMotion ? 0.15 : 1))
  }
  applySpeed()

  function applyAudio() {
    // Sensitivity is read from the CURRENT state, so entering a sens-0 state
    // clears any lingering scale even if the consumer stops sending levels.
    if (reduceMotion) return
    const l = audioLevel * (AUDIO_SENS[stateName] || 0)
    stage.style.transform = l > 0.005 ? \`scale(\${1 + l * 0.12})\` : ''
  }

  return {
    setState(next) {
      if (!SEGMENTS[next]) return
      stateName = next
      anim.playSegments(SEGMENTS[next], true)
      applyAudio()
    },
    getState() {
      return stateName
    },
    setAudioLevel(level) {
      audioLevel = Math.max(0, Math.min(1, level))
      applyAudio()
    },
    setParams(next) {
      Object.assign(P, next)
      applyParams()
      applySpeed()
    },
    destroy() {
      anim.destroy()
      wrap.remove()
    },
  }
}
`,Sp=`// Rive-style avatar engine — CSS/SVG fallback.
// No license-verifiable free .riv was bundled, so this engine demonstrates the
// integration seam honestly: it exposes the same input surface a Rive state
// machine would (\`stateMachineInputs()\` returning booleans + a trigger), and an
// SVG face reacts to those inputs. Swapping in a real .riv + @rive-app/canvas
// later only changes the internals of this file — the adapter API is identical.
export function createRiveAvatar(container, userParams = {}) {
  const P = Object.assign({ hue: 210, speed: 1 }, userParams)
  const STATE_HUE = { idle: null, listening: 165, thinking: 260, speaking: 38, error: 0 }

  const root = document.createElement('div')
  root.className = 'rivav state-idle'
  root.innerHTML = \`
<style>
.rivav { --h: 210; --spd: 1; --amp: 0; --sens: 0; width:100%; height:100%; display:grid; place-items:center; }
.rivav svg {
  width: 62%; max-width: 340px; overflow: visible;
  transform: scale(calc(1 + var(--amp) * var(--sens) * 0.12));
  transition: transform 90ms linear;
}
.rivav.state-idle { --sens: 0.1 }
.rivav.state-listening { --sens: 1 }
.rivav.state-speaking { --sens: 0.9 }
.rivav .head {
  fill: hsl(var(--h) 30% 16%); stroke: hsl(var(--h) 70% 60%); stroke-width: 2.5;
  transition: fill .4s ease, stroke .4s ease;
}
.rivav .eye { fill: hsl(var(--h) 85% 70%); transition: fill .4s ease; transform-origin: center; transform-box: fill-box; }
.rivav .mouth { fill: hsl(var(--h) 85% 70%); transition: fill .4s ease; transform-origin: center; transform-box: fill-box; }
.rivav .dot, .rivav .arc, .rivav .xeye { opacity: 0; transition: opacity .3s ease }
.rivav .arc { stroke: hsl(var(--h) 85% 70%); fill: none; stroke-width: 3; stroke-linecap: round }
.rivav .dot { fill: hsl(var(--h) 85% 70%) }
.rivav .xeye { stroke: hsl(0 85% 62%); stroke-width: 3.5; stroke-linecap: round }

@keyframes riv-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(0.08) } }
@keyframes riv-talk { 0%,100% { transform: scaleY(0.35) } 30% { transform: scaleY(1.25) } 60% { transform: scaleY(0.6) } 80% { transform: scaleY(1) } }
@keyframes riv-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes riv-dots { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
@keyframes riv-arc-pulse { 0%,100% { opacity: .25; transform: scale(1) } 50% { opacity: 1; transform: scale(1.12) } }
@keyframes riv-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-8px) } 45% { transform: translateX(7px) } 70% { transform: translateX(-4px) } }

.rivav .face { animation: riv-bob calc(3.4s / var(--spd)) ease-in-out infinite }
.rivav .eye { animation: riv-blink calc(4.6s / var(--spd)) ease-in-out infinite }

.rivav.state-listening .eye { transform: scale(1.3); animation: none }
.rivav.state-listening .arc { opacity: 1; transform-origin: center; transform-box: fill-box; animation: riv-arc-pulse calc(1.2s / var(--spd)) ease-in-out infinite }
.rivav.state-listening .arc.a2 { animation-delay: calc(.3s / var(--spd)) }

.rivav.state-thinking .eye { transform: translateY(-7px) scale(0.85); animation: none }
.rivav.state-thinking .mouth { transform: scaleY(0.3) scaleX(0.6) }
.rivav.state-thinking .dot { animation: riv-dots calc(1.4s / var(--spd)) ease-in-out infinite }
.rivav.state-thinking .dot.d2 { animation-delay: calc(.22s / var(--spd)) }
.rivav.state-thinking .dot.d3 { animation-delay: calc(.44s / var(--spd)) }

.rivav.state-speaking .mouth { animation: riv-talk calc(.5s / var(--spd)) ease-in-out infinite }
.rivav.state-speaking .face { animation: riv-bob calc(1.1s / var(--spd)) ease-in-out infinite }

.rivav.state-error { animation: riv-shake .45s ease-out 1 }
.rivav.state-error .face { animation: none }
.rivav.state-error .eye { opacity: 0; animation: none }
.rivav.state-error .xeye { opacity: 1 }
.rivav.state-error .mouth { transform: scaleY(0.25) translateY(6px) }

@media (prefers-reduced-motion: reduce) {
  .rivav, .rivav * { animation: none !important }
  .rivav svg { transform: none !important }
}
</style>
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g class="face">
    <rect class="head" x="40" y="46" width="120" height="108" rx="34"/>
    <circle class="eye" cx="78" cy="92" r="9"/>
    <circle class="eye" cx="122" cy="92" r="9"/>
    <g class="xeye"><line x1="71" y1="85" x2="85" y2="99"/><line x1="85" y1="85" x2="71" y2="99"/></g>
    <g class="xeye"><line x1="115" y1="85" x2="129" y2="99"/><line x1="129" y1="85" x2="115" y2="99"/></g>
    <rect class="mouth" x="82" y="118" width="36" height="14" rx="7"/>
    <circle class="dot d1" cx="76" cy="26" r="5"/>
    <circle class="dot d2" cx="100" cy="20" r="6"/>
    <circle class="dot d3" cx="124" cy="26" r="5"/>
    <path class="arc a1" d="M 26 78 Q 14 100 26 122"/>
    <path class="arc a2" d="M 174 78 Q 186 100 174 122"/>
  </g>
</svg>\`

  // Rive-shaped input surface: this is what a real Rive state machine exposes.
  // Setters are live — writing input.value re-evaluates the state machine,
  // exactly like a real Rive input. audioLevel mirrors a Rive number input.
  const makeBool = () => {
    let v = false
    return {
      get value() {
        return v
      },
      set value(next) {
        v = Boolean(next)
        applyFromInputs()
      },
    }
  }
  const inputs = {
    isListening: makeBool(),
    isThinking: makeBool(),
    isSpeaking: makeBool(),
    errorTrigger: { fire: () => applyFromInputs('error') },
    audioLevel: {
      get value() {
        return Number(root.style.getPropertyValue('--amp')) || 0
      },
      set value(next) {
        root.style.setProperty('--amp', String(Math.max(0, Math.min(1, next))))
      },
    },
  }

  let stateName = 'idle'
  function applyFromInputs(forced) {
    const next = forced
      ? forced
      : inputs.isSpeaking.value
        ? 'speaking'
        : inputs.isThinking.value
          ? 'thinking'
          : inputs.isListening.value
            ? 'listening'
            : 'idle'
    stateName = next
    root.className = 'rivav state-' + next
    const hue = STATE_HUE[next] == null ? P.hue : STATE_HUE[next]
    root.style.setProperty('--h', String(hue))
    root.style.setProperty('--spd', String(P.speed))
  }

  applyFromInputs()
  container.appendChild(root)

  return {
    setState(next) {
      if (!(next in STATE_HUE)) return
      // Route through the Rive-style inputs, exactly as a .riv integration would.
      inputs.isListening.value = next === 'listening'
      inputs.isThinking.value = next === 'thinking'
      inputs.isSpeaking.value = next === 'speaking'
      if (next === 'error') inputs.errorTrigger.fire()
      else applyFromInputs()
    },
    getState() {
      return stateName
    },
    setAudioLevel(level) {
      inputs.audioLevel.value = Math.max(0, Math.min(1, level))
      root.style.setProperty('--amp', String(inputs.audioLevel.value))
    },
    stateMachineInputs() {
      return inputs
    },
    setParams(next) {
      Object.assign(P, next)
      applyFromInputs(stateName === 'error' ? 'error' : undefined)
    },
    destroy() {
      root.remove()
    },
  }
}
`,xp=`// GSAP avatar engine — core orb + orbiting satellite dots (SVG).
// gsap is injected; each state kills the previous timeline and builds its own.
export function createGsapAvatar(gsap, container, userParams = {}) {
  const P = Object.assign({ color: '#8fa3c8', dots: 6, speed: 1 }, userParams)
  const STATE_COLOR = { idle: null, listening: '#43d9ad', thinking: '#a78bfa', speaking: '#fbbf24', error: '#ef4444' }
  const AUDIO_SENS = { idle: 0.1, listening: 1.0, thinking: 0, speaking: 0.9, error: 0 }

  const reduceMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const root = document.createElement('div')
  root.style.cssText = 'width:100%;height:100%;display:grid;place-items:center'
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('viewBox', '0 0 200 200')
  // transition on the svg root is the audio-reactive layer; timelines never touch it
  svg.style.cssText = 'width:70%;max-width:380px;overflow:visible;transition:transform 90ms linear'
  root.appendChild(svg)

  // Soft glow: blurred halo circle behind the core, tinted with the same fill.
  const uid = 'gsapblur-' + Math.random().toString(36).slice(2, 8)
  const defs = document.createElementNS(svgNS, 'defs')
  defs.innerHTML = \`<filter id="\${uid}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="10"/></filter>\`
  svg.appendChild(defs)
  const halo = document.createElementNS(svgNS, 'circle')
  halo.setAttribute('cx', '100')
  halo.setAttribute('cy', '100')
  halo.setAttribute('r', '36')
  halo.setAttribute('filter', \`url(#\${uid})\`)
  halo.setAttribute('opacity', '0.45')
  svg.appendChild(halo)
  const orbitGroup = document.createElementNS(svgNS, 'g')
  svg.appendChild(orbitGroup)
  const core = document.createElementNS(svgNS, 'circle')
  core.setAttribute('cx', '100')
  core.setAttribute('cy', '100')
  core.setAttribute('r', '30')
  svg.appendChild(core)

  let satellites = []
  function buildSatellites() {
    for (const s of satellites) s.remove()
    satellites = []
    const n = Math.max(0, Math.round(P.dots))
    for (let i = 0; i < n; i++) {
      const g = document.createElementNS(svgNS, 'g')
      g.setAttribute('transform', \`rotate(\${(360 / n) * i} 100 100)\`)
      const dot = document.createElementNS(svgNS, 'circle')
      dot.setAttribute('cx', '100')
      dot.setAttribute('cy', '38')
      dot.setAttribute('r', '6')
      g.appendChild(dot)
      orbitGroup.appendChild(g)
      satellites.push(g)
    }
  }
  buildSatellites()
  container.appendChild(root)

  let stateName = 'idle'
  let tl = null
  let audioLevel = 0

  function colorFor(state) {
    return STATE_COLOR[state] || P.color
  }

  function applyAudio() {
    if (reduceMotion) return
    const l = audioLevel * (AUDIO_SENS[stateName] || 0)
    svg.style.transform = l > 0.005 ? \`scale(\${1 + l * 0.14})\` : ''
  }

  function timeScale() {
    return P.speed * (reduceMotion ? 0.15 : 1)
  }

  function play(state) {
    if (tl) tl.kill()
    gsap.killTweensOf([core, halo, orbitGroup, root, ...satellites.flatMap((g) => [g, g.firstChild])])
    const c = colorFor(state)
    const dots = satellites.map((g) => g.firstChild)

    // Reset pose, then tween colors in (error snaps instead).
    gsap.set(orbitGroup, { rotation: 0, transformOrigin: '100px 100px' })
    gsap.set([core, ...dots], { scale: 1, transformOrigin: '100px 100px', x: 0, y: 0 })
    gsap.set(root, { x: 0 })
    gsap.set(dots, { attr: { cy: 38 }, opacity: 0.55 })
    if (state === 'error') gsap.set([core, halo, ...dots], { fill: c })
    else gsap.to([core, halo, ...dots], { fill: c, duration: 0.4, overwrite: 'auto' })

    tl = gsap.timeline({ repeat: -1 })
    switch (state) {
      case 'idle':
        tl.to(core, { scale: 1.06, duration: 2, ease: 'sine.inOut' })
          .to(core, { scale: 1, duration: 2, ease: 'sine.inOut' })
        tl.to(dots, { opacity: 0.3, duration: 2, ease: 'sine.inOut' }, 0)
          .to(dots, { opacity: 0.55, duration: 2, ease: 'sine.inOut' }, 2)
        break
      case 'listening':
        tl.to(dots, { attr: { cy: 26 }, opacity: 0.95, duration: 0.55, ease: 'sine.out' })
          .to(dots, { attr: { cy: 38 }, opacity: 0.55, duration: 0.55, ease: 'sine.in' })
        tl.to(core, { scale: 1.09, duration: 0.55, ease: 'sine.out' }, 0)
          .to(core, { scale: 1, duration: 0.55, ease: 'sine.in' }, 0.55)
        break
      case 'thinking':
        tl.to(orbitGroup, { rotation: 360, duration: 3, ease: 'none' })
        gsap.set(core, { scale: 0.92, transformOrigin: '100px 100px' })
        break
      case 'speaking':
        tl.to(core, { scale: 1.18, duration: 0.11, ease: 'power2.out' })
          .to(core, { scale: 0.97, duration: 0.13, ease: 'power2.in' })
          .to(core, { scale: 1.12, duration: 0.1, ease: 'power2.out' })
          .to(core, { scale: 1.0, duration: 0.14, ease: 'power2.in' })
          .to(core, { scale: 1.2, duration: 0.12, ease: 'power2.out' })
          .to(core, { scale: 1.02, duration: 0.16, ease: 'power2.in' })
        tl.to(dots, { scale: 1.25, duration: 0.38, ease: 'sine.inOut', transformOrigin: '100px 100px' }, 0)
          .to(dots, { scale: 1, duration: 0.38, ease: 'sine.inOut' }, 0.38)
        break
      case 'error': {
        if (!reduceMotion) {
          const shake = gsap.timeline()
          shake.to(root, { x: -9, duration: 0.06 })
            .to(root, { x: 8, duration: 0.06 })
            .to(root, { x: -5, duration: 0.06 })
            .to(root, { x: 4, duration: 0.06 })
            .to(root, { x: 0, duration: 0.06 })
        }
        tl.kill()
        tl = gsap.timeline({ repeat: -1, delay: 0.35 })
        tl.to(core, { opacity: 0.55, duration: 0.65, ease: 'sine.inOut' })
          .to(core, { opacity: 1, duration: 0.65, ease: 'sine.inOut' })
        gsap.set(core, { scale: 0.94 })
        gsap.set(dots, { opacity: 0.2 })
        break
      }
    }
    tl.timeScale(timeScale())
  }

  play('idle')

  return {
    setState(next) {
      if (!(next in STATE_COLOR)) return
      stateName = next
      play(next)
      applyAudio()
    },
    getState() {
      return stateName
    },
    setAudioLevel(level) {
      audioLevel = Math.max(0, Math.min(1, level))
      applyAudio()
    },
    setParams(next) {
      const prevDots = P.dots
      const prevColor = P.color
      Object.assign(P, next)
      if (P.dots !== prevDots) {
        // Structural change: rebuild and restart the state timeline.
        buildSatellites()
        play(stateName)
        return
      }
      // Live params: retime/recolor in place — never restart the phase.
      if (tl) tl.timeScale(timeScale())
      if (P.color !== prevColor) {
        const dots = satellites.map((g) => g.firstChild)
        gsap.to([core, halo, ...dots], { fill: colorFor(stateName), duration: 0.3, overwrite: 'auto' })
      }
    },
    destroy() {
      if (tl) tl.kill()
      gsap.killTweensOf([core, halo, orbitGroup, root, ...satellites.flatMap((g) => [g, g.firstChild])])
      root.remove()
    },
  }
}
`,Ep=`// Anime.js avatar engine — a dot matrix that behaves as one organism.
// anime (v3) is injected; each state removes previous animations and starts
// staggered loops.
export function createAnimeAvatar(anime, container, userParams = {}) {
  const P = Object.assign({ color: '#8fa3c8', grid: 5, speed: 1 }, userParams)
  const STATE_COLOR = { idle: null, listening: '#43d9ad', thinking: '#a78bfa', speaking: '#fbbf24', error: '#ef4444' }
  const AUDIO_SENS = { idle: 0.1, listening: 1.0, thinking: 0, speaking: 0.9, error: 0 }

  const reduceMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const spd = () => P.speed * (reduceMotion ? 0.15 : 1)

  const root = document.createElement('div')
  root.style.cssText = 'width:100%;height:100%;display:grid;place-items:center'
  // wrap is the audio-reactive layer; anime only ever animates grid/dots
  const wrap = document.createElement('div')
  wrap.style.cssText = 'transition:transform 90ms linear;display:grid;place-items:center;width:100%'
  const grid = document.createElement('div')
  wrap.appendChild(grid)
  root.appendChild(wrap)
  container.appendChild(root)

  let dots = []
  function buildGrid() {
    grid.innerHTML = ''
    const n = Math.max(2, Math.round(P.grid))
    grid.style.cssText = \`display:grid;grid-template-columns:repeat(\${n},1fr);gap:14px;width:min(56%,320px);aspect-ratio:1\`
    dots = []
    for (let i = 0; i < n * n; i++) {
      const d = document.createElement('div')
      d.style.cssText =
        'width:100%;aspect-ratio:1;border-radius:50%;background:var(--dotc);opacity:.6;transition:background .4s ease;' +
        'box-shadow:0 0 16px color-mix(in srgb, var(--dotc) 45%, transparent)'
      grid.appendChild(d)
      dots.push(d)
    }
  }

  let stateName = 'idle'
  function stop() {
    anime.remove(dots)
    anime.remove(grid)
    grid.style.transform = ''
    for (const d of dots) {
      d.style.opacity = '0.6'
      d.style.transform = ''
    }
  }

  function play(state) {
    stop()
    const n = Math.round(P.grid)
    root.style.setProperty('--dotc', STATE_COLOR[state] || P.color)
    const center = anime.stagger(120 / spd(), { grid: [n, n], from: 'center' })
    switch (state) {
      case 'idle':
        anime({
          targets: dots,
          opacity: [0.35, 0.85],
          scale: [0.92, 1.04],
          delay: center,
          direction: 'alternate',
          loop: true,
          duration: 1500 / spd(),
          easing: 'easeInOutSine',
        })
        break
      case 'listening':
        anime({
          targets: dots,
          scale: [1, 1.45],
          opacity: [0.5, 1],
          delay: center,
          direction: 'alternate',
          loop: true,
          duration: 520 / spd(),
          easing: 'easeInOutQuad',
        })
        break
      case 'thinking':
        anime({
          targets: grid,
          rotate: '360deg',
          duration: 3200 / spd(),
          loop: true,
          easing: 'linear',
        })
        anime({
          targets: dots,
          opacity: [0.3, 1],
          delay: anime.stagger(90 / spd(), { grid: [n, n], from: 'first' }),
          direction: 'alternate',
          loop: true,
          duration: 700 / spd(),
          easing: 'easeInOutSine',
        })
        break
      case 'speaking':
        anime({
          targets: dots,
          scale: [
            { value: 1.5, duration: 140 / spd(), easing: 'easeOutQuad' },
            { value: 1, duration: 260 / spd(), easing: 'easeInQuad' },
          ],
          opacity: [
            { value: 1, duration: 140 / spd() },
            { value: 0.55, duration: 260 / spd() },
          ],
          delay: () => anime.random(0, 420 / spd()),
          loop: true,
        })
        break
      case 'error':
        if (!reduceMotion) {
          anime({
            targets: grid,
            translateX: [0, -10, 9, -5, 4, 0],
            duration: 450,
            easing: 'easeOutQuad',
          })
        }
        anime({
          targets: dots,
          opacity: [0.4, 0.95],
          delay: center,
          direction: 'alternate',
          loop: true,
          duration: 900 / spd(),
          easing: 'easeInOutSine',
        })
        break
    }
  }

  buildGrid()
  play('idle')

  let audioLevel = 0
  function applyAudio() {
    if (reduceMotion) return
    const l = audioLevel * (AUDIO_SENS[stateName] || 0)
    wrap.style.transform = l > 0.005 ? \`scale(\${1 + l * 0.12})\` : ''
  }

  return {
    setState(next) {
      if (!(next in STATE_COLOR)) return
      stateName = next
      play(next)
      applyAudio()
    },
    getState() {
      return stateName
    },
    setAudioLevel(level) {
      audioLevel = Math.max(0, Math.min(1, level))
      applyAudio()
    },
    setParams(next) {
      const prevGrid = P.grid
      Object.assign(P, next)
      if (P.grid !== prevGrid) {
        // Remove animations from the OLD dots before replacing them — otherwise
        // their loop:true instances run forever against detached DOM.
        stop()
        buildGrid()
      }
      play(stateName)
    },
    destroy() {
      stop()
      root.remove()
    },
  }
}
`,Ui={three:"https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js",lottie:"https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js",gsap:"https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",anime:"https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"},Cp=`html,body{margin:0;height:100%;background:#0b0e14;font-family:system-ui,sans-serif}
#avatar{position:fixed;inset:0}
#states{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;gap:8px}
#states button{background:#1c2333;color:#cdd6e4;border:1px solid #2e3a52;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px}
#states button:hover{background:#26304a}`,Pp=`<!-- Demo controls — delete these and drive window.avatar from your app instead.
     The window.avatar && guard covers the moment before the module (and its CDN import) finishes loading. -->
<div id="states">
  <button onclick="window.avatar&&avatar.setState('idle')">Idle</button>
  <button onclick="window.avatar&&avatar.setState('listening')">Listening</button>
  <button onclick="window.avatar&&avatar.setState('thinking')">Thinking</button>
  <button onclick="window.avatar&&avatar.setState('speaking')">Speaking</button>
  <button onclick="window.avatar&&avatar.setState('error')">Error</button>
</div>`;function Mn(e,t,n){return`<!doctype html>
<!-- ${e} — generated by avatar-playground.
     Drop this file anywhere and open it: no build step, no bundler.
     API: window.avatar.setState('idle' | 'listening' | 'thinking' | 'speaking' | 'error')
          window.avatar.setAudioLevel(0..1)  — drive from mic/TTS amplitude; scales
                                               listening/speaking intensity
          window.avatar.setParams({...})   window.avatar.destroy()
     Mic wiring example:
       const ctx = new AudioContext(), an = ctx.createAnalyser(); an.fftSize = 512
       ctx.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({audio:true})).connect(an)
       const d = new Uint8Array(an.fftSize)
       ;(function loop(){ requestAnimationFrame(loop); an.getByteTimeDomainData(d)
         const rms = Math.sqrt(d.reduce((s,v)=>s+((v-128)/128)**2,0)/d.length)
         avatar.setAudioLevel(Math.min(1, rms*4.5)) })() -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e}</title>
<style>${Cp}</style>
${t}
</head>
<body>
<div id="avatar"></div>
${Pp}
${n}
</body>
</html>`}const Ln=e=>JSON.stringify(e,null,2);function Np(e){return Mn("Three.js dot-cloud avatar","",`<script type="module">
import * as THREE from '${Ui.three}'

${yp}
const avatar = createThreeAvatar(THREE, document.getElementById('avatar'), ${Ln(e)})
avatar.setState('idle')
window.avatar = avatar
<\/script>`)}function _p(e){return Mn("CSS/SVG avatar","",`<script type="module">
${wp}
const avatar = createCssAvatar(document.getElementById('avatar'), ${Ln(e)})
avatar.setState('idle')
window.avatar = avatar
<\/script>`)}function Tp(e){return Mn("Lottie avatar",`<script src="${Ui.lottie}"><\/script>`,`<script type="module">
// Bundled animation data (5 named segments, one per state) — no runtime fetch.
const ANIMATION_DATA = ${JSON.stringify(Pc)}

${kp}
const avatar = createLottieAvatar(lottie, document.getElementById('avatar'), ANIMATION_DATA, ${Ln(e)})
avatar.setState('idle')
window.avatar = avatar
<\/script>`)}function Mp(e){return Mn("Rive-style avatar (CSS fallback)","",`<script type="module">
// This is the CSS fallback: it exposes a Rive-shaped input API
// (avatar.stateMachineInputs() -> booleans + trigger). With a real .riv file the
// equivalent integration is:
//
//   import { Rive } from 'https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.21.6/+esm'
//   const rive = new Rive({ src: 'avatar.riv', canvas, stateMachines: 'AvatarSM', autoplay: true,
//     onLoad: () => { inputs = rive.stateMachineInputs('AvatarSM') } })
//   inputs.find(i => i.name === 'isListening').value = true   // same shape as below

${Sp}
const avatar = createRiveAvatar(document.getElementById('avatar'), ${Ln(e)})
avatar.setState('idle')
window.avatar = avatar
<\/script>`)}function Lp(e){return Mn("GSAP avatar",`<script src="${Ui.gsap}"><\/script>`,`<script type="module">
${xp}
const avatar = createGsapAvatar(gsap, document.getElementById('avatar'), ${Ln(e)})
avatar.setState('idle')
window.avatar = avatar
<\/script>`)}function Op(e){return Mn("Anime.js avatar",`<script src="${Ui.anime}"><\/script>`,`<script type="module">
${Ep}
const avatar = createAnimeAvatar(anime, document.getElementById('avatar'), ${Ln(e)})
avatar.setState('idle')
window.avatar = avatar
<\/script>`)}function qt(e){let t=null;return{init(n,r){t=e(n,r)},setState(n){t==null||t.setState(n)},setParams(n){t==null||t.setParams(n)},setAudioLevel(n){var r;(r=t==null?void 0:t.setAudioLevel)==null||r.call(t,n)},destroy(){t==null||t.destroy(),t=null}}}const oo=[{id:"three",name:"Three.js",blurb:"WebGL dot cloud — additive-blended particles, behavior-target morphing",paramDefs:[{key:"color",label:"Base color",type:"color",default:"#8fa3c8"},{key:"particleCount",label:"Particles",type:"range",min:200,max:8e3,step:100,default:2400},{key:"size",label:"Dot size",type:"range",min:.015,max:.16,step:.005,default:.055},{key:"radius",label:"Cloud radius",type:"range",min:.6,max:2.6,step:.1,default:1.5},{key:"speed",label:"Speed",type:"range",min:.1,max:3,step:.1,default:1}],create:()=>qt((e,t)=>ap(Lc,e,t)),exportCode:Np},{id:"css",name:"CSS / SVG",blurb:"Pure CSS keyframes — glowing orb + concentric rings, zero dependencies",paramDefs:[{key:"hue",label:"Base hue",type:"range",min:0,max:360,step:1,default:220},{key:"rings",label:"Rings",type:"range",min:1,max:6,step:1,default:3},{key:"glow",label:"Glow",type:"range",min:0,max:1.5,step:.05,default:.6},{key:"speed",label:"Speed",type:"range",min:.2,max:3,step:.1,default:1}],create:()=>qt((e,t)=>sp(e,t)),exportCode:_p},{id:"lottie",name:"Lottie",blurb:"Bundled vector timeline — five named segments via playSegments()",paramDefs:[{key:"scale",label:"Size",type:"range",min:.3,max:1,step:.05,default:.8},{key:"hueShift",label:"Hue shift",type:"range",min:0,max:360,step:1,default:0},{key:"speed",label:"Speed",type:"range",min:.2,max:3,step:.1,default:1}],create:()=>qt((e,t)=>up(Oc,e,Pc,t)),exportCode:Tp},{id:"rive",name:"Rive (fallback)",blurb:"SVG face driven through a Rive-shaped state-machine input API",paramDefs:[{key:"hue",label:"Base hue",type:"range",min:0,max:360,step:1,default:210},{key:"speed",label:"Speed",type:"range",min:.2,max:3,step:.1,default:1}],create:()=>qt((e,t)=>cp(e,t)),exportCode:Mp},{id:"gsap",name:"GSAP",blurb:"Timeline-per-state — SVG orb with orbiting satellites",paramDefs:[{key:"color",label:"Base color",type:"color",default:"#8fa3c8"},{key:"dots",label:"Satellites",type:"range",min:3,max:12,step:1,default:6},{key:"speed",label:"Speed",type:"range",min:.2,max:3,step:.1,default:1}],create:()=>qt((e,t)=>dp(zc,e,t)),exportCode:Lp},{id:"anime",name:"Anime.js",blurb:"Staggered dot matrix — center-out waves, random speech bursts",paramDefs:[{key:"color",label:"Base color",type:"color",default:"#8fa3c8"},{key:"grid",label:"Grid size",type:"range",min:3,max:8,step:1,default:5},{key:"speed",label:"Speed",type:"range",min:.2,max:3,step:.1,default:1}],create:()=>qt((e,t)=>fp(Ac,e,t)),exportCode:Op}];function zp(e){const t=oo.find(n=>n.id===e);if(!t)throw new Error(`Unknown adapter: ${e}`);return t}class Ap{constructor(){Zt(this,"stopClock",null);Zt(this,"ctx",null);Zt(this,"stream",null);Zt(this,"level",0);Zt(this,"epoch",0)}makeClock(t){try{const n=new Blob(["setInterval(() => postMessage(0), 33)"],{type:"text/javascript"}),r=URL.createObjectURL(n),i=new Worker(r);return i.onmessage=t,()=>{i.terminate(),URL.revokeObjectURL(r)}}catch{const n=setInterval(t,33);return()=>clearInterval(n)}}async start(t,n){this.stop(n);const r=++this.epoch;if(t==="demo"){const a=performance.now();this.stopClock=this.makeClock(()=>{const s=(performance.now()-a)/1e3,u=Math.sin(s*1.3)>-.25?1:.08,h=.45+.55*Math.abs(Math.sin(s*6.7+Math.sin(s*2.9)*1.8));this.smooth(u*h,n)});return}const i=await navigator.mediaDevices.getUserMedia({audio:!0});if(r!==this.epoch){for(const a of i.getTracks())a.stop();return}this.stream=i,this.ctx=new AudioContext,this.ctx.state==="suspended"&&this.ctx.resume();const l=this.ctx.createAnalyser();l.fftSize=512,this.ctx.createMediaStreamSource(this.stream).connect(l);const o=new Uint8Array(l.fftSize);this.stopClock=this.makeClock(()=>{l.getByteTimeDomainData(o);let a=0;for(let u=0;u<o.length;u++){const h=(o[u]-128)/128;a+=h*h}const s=Math.sqrt(a/o.length);this.smooth(Math.min(1,s*4.5),n)})}smooth(t,n){const r=t>this.level?.45:.12;this.level+=(t-this.level)*r,n(this.level)}stop(t){if(this.epoch++,this.stopClock&&(this.stopClock(),this.stopClock=null),this.stream){for(const n of this.stream.getTracks())n.stop();this.stream=null}this.ctx&&(this.ctx.close(),this.ctx=null),this.level=0,t==null||t(0)}}function jp({adapters:e,activeId:t,onSelect:n,params:r,paramDefs:i,onParamChange:l,children:o}){return _.jsxs("aside",{className:"panel left",children:[_.jsx("h2",{children:"Library"}),_.jsx("div",{className:"lib-list",children:e.map(a=>_.jsxs("button",{className:"lib-item"+(a.id===t?" active":""),"aria-pressed":a.id===t,onClick:()=>n(a.id),children:[_.jsx("span",{className:"lib-name",children:a.name}),_.jsx("span",{className:"lib-blurb",children:a.blurb})]},a.id))}),_.jsx("h2",{children:"Parameters"}),_.jsx("div",{className:"param-list",children:i.map(a=>_.jsx(Rp,{def:a,value:r[a.key],onChange:s=>l(a.key,s)},a.key))}),o]})}function Rp({def:e,value:t,onChange:n}){return e.type==="color"?_.jsxs("label",{className:"param",children:[_.jsx("span",{className:"param-label",children:e.label}),_.jsx("input",{type:"color",value:String(t),onChange:r=>n(r.target.value)})]}):e.type==="toggle"?_.jsxs("label",{className:"param",children:[_.jsx("span",{className:"param-label",children:e.label}),_.jsx("input",{type:"checkbox",checked:!!t,onChange:r=>n(r.target.checked)})]}):_.jsxs("label",{className:"param",children:[_.jsxs("span",{className:"param-label",children:[e.label,_.jsx("span",{className:"param-value",children:Number(t)})]}),_.jsx("input",{type:"range",min:e.min,max:e.max,step:e.step,value:Number(t),onChange:r=>n(Number(r.target.value))})]})}const Ip=["idle","listening","thinking","speaking","error"];function Dp(e){const t={};for(const n of e.paramDefs)t[n.key]=n.default;return t}const Bn={idle:"#8fa3c8",listening:"#43d9ad",thinking:"#a78bfa",speaking:"#fbbf24",error:"#ef4444"};function Fp({def:e,params:t,avatarState:n,onStateChange:r,apiRef:i}){const l=b.useRef(null),o=b.useRef(null),a=b.useRef(t);a.current=t;const s=b.useRef(n);return s.current=n,b.useEffect(()=>{const u=e.create();return u.init(l.current,{...a.current}),u.setState(s.current),o.current=u,i.current=u,window.__adapter=u,()=>{u.destroy(),o.current=null,i.current=null,window.__adapter===u&&(window.__adapter=null)}},[e]),b.useEffect(()=>{var u;(u=o.current)==null||u.setParams({...t})},[t]),b.useEffect(()=>{var u;(u=o.current)==null||u.setState(n)},[n]),_.jsxs("main",{className:"panel center",children:[_.jsx("div",{className:"preview-bg",style:{background:`radial-gradient(ellipse 70% 55% at 50% 45%, color-mix(in srgb, ${Bn[n]} 14%, transparent), transparent 75%)`}}),_.jsxs("div",{className:"preview-badge",style:{borderColor:Bn[n]},children:[e.name," · ",_.jsx("span",{style:{color:Bn[n]},children:n})]}),_.jsx("div",{className:"preview-mount",ref:l}),_.jsx("div",{className:"state-bar",children:Ip.map(u=>_.jsx("button",{className:"state-btn"+(u===n?" active":""),"aria-pressed":u===n,style:u===n?{borderColor:Bn[u],color:Bn[u]}:void 0,onClick:()=>r(u),children:u[0].toUpperCase()+u.slice(1)},u))})]})}function Up({def:e,params:t}){const n=b.useMemo(()=>e.exportCode(t),[e,t]),[r,i]=b.useState(!1);async function l(){try{await navigator.clipboard.writeText(n)}catch{const a=document.createElement("textarea");a.value=n,document.body.appendChild(a),a.select(),document.execCommand("copy"),a.remove()}i(!0),setTimeout(()=>i(!1),1600)}function o(){const a=new Blob([n],{type:"text/html"}),s=URL.createObjectURL(a),u=document.createElement("a");u.href=s,u.download=`avatar-${e.id}.html`,u.click(),setTimeout(()=>URL.revokeObjectURL(s),1e4)}return _.jsxs("aside",{className:"panel right",children:[_.jsxs("div",{className:"export-head",children:[_.jsx("h2",{children:"Export — standalone HTML"}),_.jsxs("div",{className:"export-actions",children:[_.jsx("button",{className:"btn primary",onClick:l,children:r?"Copied ✓":"Copy"}),_.jsx("button",{className:"btn",onClick:o,children:"Download"})]})]}),_.jsxs("p",{className:"export-hint",children:["Save as ",_.jsx("code",{children:".html"})," and open — no build step. Drive it with"," ",_.jsx("code",{children:"avatar.setState('speaking')"}),". ",Math.round(n.length/1024)," KB, params baked in live."]}),_.jsx("pre",{className:"export-code",children:_.jsx("code",{children:n})})]})}const $p=[{id:"off",label:"Off",hint:"No audio input"},{id:"demo",label:"Demo",hint:"Synthesized speech-like envelope"},{id:"mic",label:"Mic",hint:"Live microphone amplitude"}];function Bp({source:e,onSourceChange:t,meterRef:n}){return _.jsxs(_.Fragment,{children:[_.jsx("h2",{children:"Audio input"}),_.jsxs("div",{className:"audio-controls",children:[_.jsx("div",{className:"audio-src",children:$p.map(r=>_.jsx("button",{title:r.hint,className:"audio-btn"+(r.id===e?" active":""),"aria-pressed":r.id===e,onClick:()=>t(r.id),children:r.label},r.id))}),_.jsx("div",{className:"meter-track","aria-hidden":"true",children:_.jsx("div",{className:"meter-fill",ref:n})}),_.jsxs("p",{className:"audio-hint",children:["Amplitude drives ",_.jsx("em",{children:"listening"})," and ",_.jsx("em",{children:"speaking"})," intensity. Exported avatars expose"," ",_.jsx("code",{children:"avatar.setAudioLevel(0–1)"}),"."]})]})]})}const Hp=typeof window<"u"&&window.location.pathname.includes("/avatar-playground");function Vp(){const[e,t]=b.useState("three"),[n,r]=b.useState("idle"),[i,l]=b.useState("off"),[o,a]=b.useState(()=>Object.fromEntries(oo.map(v=>[v.id,Dp(v)]))),s=b.useMemo(()=>zp(e),[e]),u=o[e],h=b.useRef(null),m=b.useRef(null),p=b.useRef();p.current||(p.current=new Ap),b.useEffect(()=>{const v=p.current,w=d=>{var c;(c=h.current)==null||c.setAudioLevel(d),m.current&&(m.current.style.width=Math.round(d*100)+"%"),window.__audioLevel=d};if(i==="off"){v.stop(w);return}let L=!1;return v.start(i,w).catch(d=>{console.warn("[audio] source unavailable:",d),L||l("off")}),()=>{L=!0,v.stop(w)}},[i]);function y(v,w){a(L=>({...L,[e]:{...L[e],[v]:w}}))}return _.jsxs("div",{className:"app",children:[_.jsxs("header",{className:"topbar",children:[Hp&&_.jsx("a",{className:"back-link",href:"/",title:"Back to the Forest hub",children:"← Back to Forest HUB"}),_.jsx("span",{className:"logo"}),_.jsx("h1",{children:"Avatar Playground"}),_.jsx("span",{className:"topbar-sub",children:"audition · trigger · export"})]}),_.jsxs("div",{className:"columns",children:[_.jsx(jp,{adapters:oo,activeId:e,onSelect:t,params:u,paramDefs:s.paramDefs,onParamChange:y,children:_.jsx(Bp,{source:i,onSourceChange:l,meterRef:m})}),_.jsx(Fp,{def:s,params:u,avatarState:n,onStateChange:r,apiRef:h}),_.jsx(Up,{def:s,params:u})]})]})}Cc(document.getElementById("root")).render(_.jsx(Vp,{}));
