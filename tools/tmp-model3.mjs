import { KNOWN_CONTROLS as K } from "../src/known-controls.mjs";
const M=97,mod=x=>((x%M)+M)%M;const norm=x=>{x=mod(x);return x<2?x+97:x};
const gl=ch=>{if(ch>="0"&&ch<="9")return ch.charCodeAt(0)-48;const x=(ch.charCodeAt(0)-64)%17;return x>9?x-17:x};
const P=Object.entries(K);
let best=[];
for(let B=0;B<M;B++)for(let s=0;s<M;s++){
 // dash fixed as normal char with value gd; precompute best gd by loop
 for(let gd=0;gd<M;gd+=1){let ok=0;for(const [b,c] of P){let h=0;for(const ch of b){h=ch===";"?mod(h*B+s):ch==="-"?mod(h*10+gd):mod(h*10+gl(ch))}if(norm(1-3*h)===c)ok++}
 if(ok>=60)best.push([ok,B,s,gd])}}
best.sort((a,b)=>b[0]-a[0]);console.log(best.slice(0,8));
