import { KNOWN_CONTROLS as K } from "../src/known-controls.mjs";
const M=97,mod=x=>((x%M)+M)%M,p10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r};
// 1) valid control range in known table (non-PING)
const vals=Object.values(K);console.log("known controls: min",Math.min(...vals),"max",Math.max(...vals),"has0/1/99:",vals.filter(v=>v<2||v>98).length);
// 2) weights at long distances: B-at-position vs all-A for lengths 10 and 20
for(const L of [10,20]){const base=K["CONSULTA;"+"A".repeat(L)];const out=[];
 for(let k=0;k<L;k++){const b="CONSULTA;"+"A".repeat(k)+"B"+"A".repeat(L-k-1);const c=K[b];if(c===undefined)continue;const d=L-k; // distance from end (1=last)
  const dc=mod(c-base); const exp=mod(-3*p10(d-1)); out.push([d,dc,exp,dc===exp?"ok":"MISMATCH"]);}
 console.log("len",L,out.map(o=>o.join(":")).join(" "));}
// 3) AC ids covered in table
console.log(Object.keys(K).filter(k=>/^CONSULTA;AC-/.test(k)));
