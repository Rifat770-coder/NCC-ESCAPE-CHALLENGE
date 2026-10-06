const { pathToFileURL } = require('url');
const fs = require('fs');
const cache = 'C:/Users/Rifat/AppData/Local/npm-cache/_npx/d66c5096c7023bfb/node_modules';
(async () => {
  const { Client } = await import(pathToFileURL(cache + '/@modelcontextprotocol/sdk/dist/esm/client/index.js'));
  const { StdioClientTransport } = await import(pathToFileURL(cache + '/@modelcontextprotocol/sdk/dist/esm/client/stdio.js'));
  const client = new Client({name:'ncc-mcp-verification',version:'1.0.0'});
  try {
    await client.connect(new StdioClientTransport({command:'cmd',args:['/c','npx','-y','shadcn@latest','mcp'],cwd:process.cwd(),stderr:'pipe'}));
    const tools = await client.listTools();
    const registryTool = tools.tools.find(t => t.name.includes('get_project_registries'));
    const registries = registryTool ? await client.callTool({name:registryTool.name,arguments:{}}) : null;
    const report = {connected:true,tools:tools.tools.map(t=>t.name),registries};
    fs.writeFileSync('.ui-review/shadcn-mcp-verification.json', JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally { await client.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
