import fs from "node:fs";
const P0=JSON.parse(fs.readFileSync("tools/valid-pairs.json","utf8"));
const M=97,mod=x=>((x%M)+M)%M,inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x};
const p10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r};
const SEP=new Set([";","-"]);
// command uppercased only; args case preserved
const P=P0.map(([b,c])=>{const i=b.indexOf(";");return [b.slice(0,i).toUpperCase()+b.slice(i),c]});
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
 console.log(label,"eqs",P.length,"unknowns",n,"rank",basis.length,"inconsistent",incons.length,incons);
  const out={};
 for(const [col,row] of basis){const free=row.slice(0,n).some((x,j)=>j!==col&&x);const nm=col<n-1?chars[col]:"K";out[nm]=free?"?":row[n]}
 console.log(JSON.stringify(out));
 return {basis,chars,n};
}
solve(P,"case-sensitive args");
solve(P.filter(([b])=>!/;Z$|AAAAAZ$/.test(b)),"without Z rows");

