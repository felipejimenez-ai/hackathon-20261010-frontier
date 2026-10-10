import { modelControl } from "../src/checksum.mjs";
import { KNOWN_CONTROLS } from "../src/known-controls.mjs";
const M=97;const mod=x=>((x%M)+M)%M;const inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x};
// control = norm(1 - 3h), h = P*10^len + D(amount) for fixed prefix
const norm=x=>{x=mod(x);return x<2?x+97:x};
function D(a){let h=0;for(const ch of a)h=mod(h*10+(+ch));return h}
function solveP(amt,c){const t=mod(c-1); // 1-3h = c  => h = (1-c)/3
 const h=mod((1-c)*inv(3)); const p10=[...Array(amt.length)].reduce(a=>mod(a*10),1);return mod((h-D(amt))*inv(p10))}
function pred(P,amt){const p10=[...Array(amt.length)].reduce(a=>mod(a*10),1);return norm(1-3*mod(P*p10+D(amt)))}
const pre="TRANSFER;AC-0001;AC-0002;";
const known=Object.entries(KNOWN_CONTROLS).filter(([k])=>k.startsWith(pre)).map(([k,c])=>[k.slice(pre.length),c]);
console.log("known amounts",known);
const P=solveP(known[0][0],known[0][1]);
for(const [a,c] of known)console.log(a,"actual",c,"pred",pred(P,a));
