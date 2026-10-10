import { KNOWN_CONTROLS as K } from "../src/known-controls.mjs";
const M=97,mod=x=>((x%M)+M)%M,inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x};
const p10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r};
const P=Object.entries(K);
const SEP=new Set([";","-"]);
function solve(P,label){
 const chars=[...new Set(P.flatMap(([b])=>[...b]))].sort();const idx=new Map(chars.map((c,i)=>[c,i]));const n=chars.length+1;
 const rows=P.map(([b,c])=>{const r=new Array(n+1).fill(0);let after=0;const coef=new Array(b.length);
  for(let i=b.length-1;i>=0;i--){coef[i]=p10(after);if(!SEP.has(b[i]))after++}
  for(let i=0;i<b.length;i++){const col=idx.get(b[i]);r[col]=mod(r[col]-3*coef[i])}
  r[n-1]=1;r[n]=mod(c);return r});
 const basis=[];let incons=[];
 for(const [pi,p] of P.entries()){let r=rows[pi].slice();for(const [col,row] of basis){if(r[col]){const f=r[col];r=r.map((x,j)=>mod(x-f*row[j]))}}
  const col=r.slice(0,n).findIndex(x=>x);if(col<0){if(r[n])incons.push(p[0]);continue}
  const iv=inv(r[col]);r=r.map(x=>x*iv%M);for(const [c2,row] of basis){if(row[col]){const f=row[col];for(let j=0;j<=n;j++)row[j]=mod(row[j]-f*r[j])}}basis.push([col,r]);}
 console.log(label,"eqs",P.length,"unknowns",n,"rank",basis.length,"inconsistent",incons.length,incons.slice(0,6));
 return {basis,chars,n};
}
solve(P,"ALL");
solve(P.filter(([b])=>!b.startsWith("ALTA")),"no-ALTA");
