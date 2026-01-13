#!/usr/bin/env node
/**
 * Patch clauded-cli.js to fetch models from proxy instead of using hardcoded list
 * This makes all 15 proxy models appear in /model picker
 */

const fs = require('fs');
const path = require('path');

const CLI_PATH = path.join(process.env.HOME, '.claude/clauded-cli/cli.js');
const BACKUP_PATH = CLI_PATH + '.backup-' + Date.now();

console.log('Patching clauded-cli.js to fetch models from proxy...\n');

// Read CLI file
let content = fs.readFileSync(CLI_PATH, 'utf8');
console.log(`✓ Read CLI file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);

// Backup original
fs.writeFileSync(BACKUP_PATH, content);
console.log(`✓ Created backup: ${BACKUP_PATH}`);

// Find RU3 function - match more flexibly across minified code
// Extract from "function RU3(){" to the matching closing brace
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
const match = [originalRU3]; // Fake match array for compatibility

console.log('✓ Found RU3() function (' + originalRU3.length + ' chars)');

// Inject proxy model fetcher at top of file
const proxyFetcherCode = `
(function(){
  // Fetch models from proxy if using clauded
  if(process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL.includes('127.0.0.1:3000')){
    const http=require('http');
    http.get('http://127.0.0.1:3000/v1/models',(res)=>{
      let data='';
      res.on('data',(chunk)=>data+=chunk);
      res.on('end',()=>{
        try{
          const json=JSON.parse(data);
          if(json.data && Array.isArray(json.data)){
            global.__CLAUDED_PROXY_MODELS=json.data.map(m=>({
              value:m.id,
              label:m.display_name || m.name,
              description:''
            }));
          }
        }catch(e){}
      });
    }).on('error',()=>{});
  }
})();
`;

// Inject at the top of the file (after first few lines)
const lines = content.split('\n');
lines.splice(5, 0, proxyFetcherCode);
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

console.log('✓ Patched RU3() function to fetch from proxy');

// Write patched file
fs.writeFileSync(CLI_PATH, content);
console.log(`✓ Wrote patched CLI to ${CLI_PATH}`);

console.log('\n✅ Patch complete!');
console.log('\nChanges:');
console.log('  - RU3() now checks for ANTHROPIC_BASE_URL=http://127.0.0.1:3000');
console.log('  - Fetches models from /v1/models endpoint');
console.log('  - Falls back to hardcoded models if proxy unavailable');
console.log('\nTest with: clauded');
console.log('Then run: /model');
console.log('\nYou should see all 15 models from the proxy!');
