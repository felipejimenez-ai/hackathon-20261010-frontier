import { KNOWN_CONTROLS as K } from "../src/known-controls.mjs";
const M=97,mod=x=>((x%M)+M)%M;const norm=x=>{x=mod(x);return x<2?x+97:x};
const gl=ch=>{if(ch>="0"&&ch<="9")return ch.charCodeAt(0)-48;const x=(ch.charCodeAt(0)-64)%17;return x>9?x-17:x};
const P=Object.entries(K);
function score(sSemi,sDash,Kc,list){let ok=0;const miss=[];for(const [b,c] of list){let h=0;for(const ch of b){if(ch===";")h=mod(h+sSemi);else if(ch==="-")h=mod(h+sDash);else h=mod(h*10+gl(ch))}if(norm(Kc-3*h)===c)ok++;else miss.push(b)}return{ok,miss}}
const noAlta=P.filter(([b])=>!b.startsWith("ALTA"));
let best=[];
for(let a=0;a<M;a++)for(let d=0;d<M;d++){const r=score(a,d,1,noAlta);best.push([r.ok,a,d])}
best.sort((x,y)=>y[0]-x[0]);console.log("non-ALTA bodies:",noAlta.length,"top",best.slice(0,5));
const [ok,a,d]=best[0];const r=score(a,d,1,noAlta);console.log("misses at best:",r.miss);
const rA=score(a,d,1,P.filter(([b])=>b.startsWith("ALTA")));console.log("ALTA ok",rA.ok,"/",P.filter(([b])=>b.startsWith("ALTA")).length,"miss",rA.miss);
