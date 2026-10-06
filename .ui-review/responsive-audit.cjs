const fs = require('fs');
const ts = require('typescript');
const before = JSON.parse(fs.readFileSync('.ui-review/responsive-before.json','utf8'));
const report = { unchangedBackend: [], handlerChecks: [], issues: [] };
for (const [file, original] of Object.entries(before)) {
 const current = fs.readFileSync(file, 'utf8');
 if (/^(app\\api|lib\\|hooks\\|data\\)/.test(file)) {
  if (original !== current) report.issues.push('Non-UI file changed: ' + file);
  else report.unchangedBackend.push(file);
  continue;
 }
 const parse = source => ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const normalize = source => {
  const root=parse(source), checks=[];
  const visit=node=>{
   if(ts.isJsxAttribute(node) && (/^on[A-Z]/.test(node.name.getText(root)) || ['href','name','id','value','disabled','defaultValue','key'].includes(node.name.getText(root)))) checks.push(node.getText(root).replace(/\s+/g,' '));
   if(ts.isCallExpression(node) && ['fetch','useState','useEffect','useMemo','useCallback','useRef','setTimeout','setInterval','clearInterval','clearTimeout'].includes(node.expression.getText(root))) {
    // Effects and callbacks do not contain JSX in the existing project.
    checks.push(node.getText(root).replace(/\s+/g,' '));
   }
   ts.forEachChild(node,visit);
  }; visit(root); return checks;
 };
 const a=normalize(file === "components\\effects\\BackgroundFX.tsx" ? original.replaceAll("34,240,255", "239,255,0") : original), b=normalize(current);
 if(JSON.stringify(a)!==JSON.stringify(b)) report.issues.push('Handler/state mismatch: '+file);
 else report.handlerChecks.push(file);
}
fs.writeFileSync('.ui-review/responsive-regression.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({backendFilesUnchanged:report.unchangedBackend.length, uiFilesWithIdenticalHandlersAndState:report.handlerChecks.length,issues:report.issues},null,2));
if(report.issues.length) process.exitCode=1;
