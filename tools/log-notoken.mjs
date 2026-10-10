import fs from "node:fs";
const rows=JSON.parse(fs.readFileSync("tools/probe-notoken.json","utf8"));
const rec=rows.map((r,i)=>({id:9000+i,seq:"sin-token",x_req:String(i),hipotesis:"comportamiento del original sin token valido / ruta inexistente",request:{method:r.method,path:r.path,token:r.token},status:r.status,response:r.text,conclusion:`${r.method} ${r.path} token=${r.token} -> ${r.status} ${r.text}`}));
fs.appendFileSync("experimentos.jsonl","\n"+rec.map(r=>JSON.stringify(r)).join("\n"));
console.log("appended",rec.length);
