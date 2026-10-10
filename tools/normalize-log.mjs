import fs from "node:fs";
const lines=fs.readFileSync("experimentos.jsonl","utf8").split("\n");
let fixed=0;
const out=lines.map(l=>{ if(!l.trim())return l; let o;try{o=JSON.parse(l)}catch{return l}
 if(typeof o.response==="string"){try{const p=JSON.parse(o.response);o.response=p;fixed++}catch{}}
 return JSON.stringify(o);});
fs.writeFileSync("experimentos.jsonl",out.join("\n"));
console.log("normalized response strings:",fixed);
