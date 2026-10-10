import { KNOWN_CONTROLS as K } from "../src/known-controls.mjs";
const M=97,mod=x=>((x%M)+M)%M,p10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r};
const norm=x=>{x=mod(x);return x<2?x+97:x};
const gv=ch=>{ch=ch.toUpperCase();if(ch>="0"&&ch<="9")return ch.charCodeAt(0)-48;const x=(ch.charCodeAt(0)-64)%17;return x>9?x-17:x};
// weight = 10^(number of non-';' chars after position)
function from(kb,kc,b){let dh=0;for(let i=0;i<b.length;i++){if(kb[i]===b[i])continue;let after=0;for(let j=i+1;j<b.length;j++)if(b[j]!==";")after++;dh+=(gv(b[i])-gv(kb[i]))*p10(after)}return norm(kc-3*mod(dh))}
const ks=Object.entries(K);let ok=0,bad=0;const badl=[];
for(const [a,ca] of ks)for(const [b,cb] of ks){if(a===b||a.length!==b.length)continue;
 let okc=true;for(let i=0;i<a.length;i++){if(a[i]!==b[i]&&(!/[A-Z0-9]/.test(a[i])||!/[A-Z0-9]/.test(b[i])))okc=false;if((a[i]===";")!==(b[i]===";"))okc=false}
 if(!okc)continue; const p=from(a,ca,b); if(p===cb)ok++;else{bad++;if(badl.length<8)badl.push([a,b,cb,p])}}
console.log({ok,bad});console.log(badl);
