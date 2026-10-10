import fs from "node:fs";
import { expectedControl, modelControl } from "../src/checksum.mjs";
let rows=0,covered=0,bad=[];
for(const l of fs.readFileSync("experimentos.jsonl","utf8").split("\n")){ if(!l.trim())continue; let o;try{o=JSON.parse(l)}catch{continue}
 if(o.status===429)continue; const m=o.request&&o.request.m; if(typeof m!=="string"||/^ping/i.test(m))continue;
 const i=m.lastIndexOf(";"); const body=m.slice(0,i),c=m.slice(i+1); if(!/^(0|[1-9]\d?)$/.test(c))continue;
 const e=o.response&&o.response.error; if(["E201","E104","E301","E302"].includes(e))continue;
 rows++; const exp=expectedControl(body); if(exp===null)continue; covered++;
 const predE202 = Number(c)!==exp; const actE202 = e==="E202";
 if(predE202!==actE202)bad.push([m,e,exp]);}
console.log({rows,covered,mismatches:bad.length});console.log(bad.slice(0,40));
// model check on CONSULTA;AC rows
const P=JSON.parse(fs.readFileSync("tools/valid-pairs.json","utf8"));let n=0,ok=0;for(const [b,c] of P){if(/^CONSULTA;AC-\d{4}$/i.test(b)){n++;if(modelControl(b)===c)ok++}}console.log("model AC rows",ok,"/",n);
