const ts=require('typescript');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(process.cwd(),request.slice(2)):request,...args);};
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpile(fs.readFileSync(filename,'utf8'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}),filename);
require('./verify-level3.ts');
