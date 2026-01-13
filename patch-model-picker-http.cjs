#!/usr/bin/env node
/**
 * FINAL FIX: Patch clauded-cli.js to fetch models using Node's http module (not curl)
 * This avoids the curl timeout issue and is more reliable
 */

const fs = require('fs');
const path = require('path');

const CLI_PATH = path.join(process.env.HOME, '.claude/clauded-cli/cli.js');
const BACKUP_PATH = CLI_PATH + '.backup-http-' + Date.now();

console.log('Patching clauded-cli.js with HTTP module fetching...\n');

// Read CLI file
let content = fs.readFileSync(CLI_PATH, 'utf8');
console.log(`✓ Read CLI file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);

// Backup original
fs.writeFileSync(BACKUP_PATH, content);
console.log(`✓ Created backup: ${BACKUP_PATH}`);

// Find RU3 function
const ru3Start = content.indexOf('function RU3(){');
if (ru3Start === -1) {
  console.error('✗ Could not find RU3() function');
  process.exit(1);
}

// Find matching closing brace
let braceCount = 0;
let ru3End = -1;
for (let i = ru3Start + 'function RU3()'.length; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      ru3End = i + 1;
      break;
    }
  }
}

if (ru3End === -1) {
  console.error('✗ Could not find end of RU3() function');
  process.exit(1);
}

const originalRU3 = content.substring(ru3Start, ru3End);
console.log('✓ Found RU3() function (' + originalRU3.length + ' chars)');

// Remove any old fetcher code
const lines = content.split('\n');
let startRemove = -1;
let endRemove = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fetch models from proxy') || lines[i].includes('SYNCHRONOUSLY fetch')) {
    startRemove = i - 1; // Include opening (function(){
    // Find closing })();
    for (let j = i; j < Math.min(i + 35, lines.length); j++) {
      if (lines[j].includes('})();')) {
        endRemove = j;
        break;
      }
    }
    break;
  }
}

if (startRemove !== -1 && endRemove !== -1) {
  lines.splice(startRemove, endRemove - startRemove + 1);
  console.log('✓ Removed old fetcher code');
}

// NEW APPROACH: Use Node's built-in http module with SYNC pattern
const httpFetcherCode = `
(function(){
  // Fetch models using Node's http module (more reliable than curl)
  if(process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL.includes('127.0.0.1:3000')){
    try{
      const http=require('http');
      let responseData='';
      let requestComplete=false;
      let requestError=null;

      const req=http.get('http://127.0.0.1:3000/v1/models',{timeout:3000},(res)=>{
        res.on('data',(chunk)=>responseData+=chunk);
        res.on('end',()=>{
          try{
            const json=JSON.parse(responseData);
            if(json.data && Array.isArray(json.data)){
              global.__CLAUDED_PROXY_MODELS=json.data.map(m=>({
                value:m.id,
                label:m.display_name||m.name,
                description:''
              }));
            }
          }catch(e){}
          requestComplete=true;
        });
      });

      req.on('error',()=>{requestError=true;requestComplete=true;});
      req.on('timeout',()=>{req.destroy();requestComplete=true;});

      // Busy-wait for max 3 seconds (blocking)
      const startTime=Date.now();
      while(!requestComplete && (Date.now()-startTime<3000)){
        // Spin wait
      }
    }catch(e){}
  }
})();
`;

// Inject at line 6
lines.splice(5, 0, httpFetcherCode);
content = lines.join('\n');

// Create the patched RU3 function
const patchedRU3 = `
function RU3(){
  // PATCHED: Use proxy models if available
  if(global.__CLAUDED_PROXY_MODELS && global.__CLAUDED_PROXY_MODELS.length>0){
    const models=[...global.__CLAUDED_PROXY_MODELS];
    // Mark first model as default
    if(models[0])models[0]={...models[0],label:'Default (recommended)'};
    return models;
  }

  // Fallback to original hardcoded models
  let A=LsQ;if(OB()){if(!DR())return[Fn(),QeA];if(yLA()||vLA()){let G=[Fn(),EsQ];if(Vn().hasAccess)G.push(HsQ);return G.push(QeA),G}if(ZeA()&&FJA())return[Fn(),EsQ,QeA];let B=[Fn(),OU3];if(Op1())B.push({value:"sonnet",label:"Sonnet",description:"Sonnet 4.5 with 200K context"});else if(Vn().hasAccess)B.push(HsQ);return B.push(QeA),B}let Q=[Fn(),wsQ()];if(a4()!=="firstParty")Q.push(NU3());if(Vn().hasAccess)Q.push(NsQ);if(A)Q.push(A);return Q
}`.trim();

// Replace RU3 function
content = content.replace(originalRU3, patchedRU3);

console.log('✓ Patched RU3() function to use proxy models');
console.log('✓ Injected HTTP module fetcher (async with busy-wait)');

// Write patched file
fs.writeFileSync(CLI_PATH, content);
console.log(`✓ Wrote patched CLI to ${CLI_PATH}`);

console.log('\n✅ Patch complete!');
console.log('\nChanges:');
console.log('  - Uses Node http module instead of curl (no subprocess)');
console.log('  - Busy-wait pattern for pseudo-synchronous behavior');
console.log('  - 3 second timeout for fetch');
console.log('  - More reliable than execSync + curl');
console.log('\nIMPORTANT: Restart the proxy server first!');
console.log('  pkill -f model-proxy-server');
console.log('  node ~/.claude/model-proxy-server.js 3000 &');
console.log('\nThen test with: clauded');
