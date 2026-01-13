const fs = require('fs');

// Read the proxy file
const proxyPath = process.env.HOME + '/.claude/model-proxy-server.js';
let content = fs.readFileSync(proxyPath, 'utf8');

// Find and fix the emoji escapes in the models list
const fixes = [
  { find: /display_name: '\\ud83c\\udfdb\\ufe0f Claude Opus/, replace: "display_name: '🏛️ Claude Opus" },
  { find: /display_name: '\\ud83d\\udd27 Claude Sonnet/, replace: "display_name: '🔧 Claude Sonnet" },
  { find: /display_name: '\\ud83d\\ude80 GLM-4.7/, replace: "display_name: '🚀 GLM-4.7" },
  { find: /display_name: '\\ud83c\\udf10 GLM-4 \\(Free/, replace: "display_name: '🌐 GLM-4 (Free" },
  { find: /display_name: '\\ud83c\\udf10 GLM-4 Flash/, replace: "display_name: '🌐 GLM-4 Flash" },
  { find: /display_name: '\\ud83c\\udf10 GLM-4 Air/, replace: "display_name: '🌐 GLM-4 Air" },
  { find: /display_name: '\\ud83c\\udfa8 Gemini 3 Pro/, replace: "display_name: '🎨 Gemini 3 Pro" },
  { find: /display_name: '\\ud83d\\udd37 Gemini Pro/, replace: "display_name: '🔷 Gemini Pro" },
  { find: /display_name: '\\ud83d\\udd37 Gemini 2.0/, replace: "display_name: '🔷 Gemini 2.0" },
  { find: /display_name: '\\ud83d\\udd10 Dolphin-3/, replace: "display_name: '🔐 Dolphin-3" },
  { find: /display_name: '\\ud83d\\udd13 Qwen/, replace: "display_name: '🔓 Qwen" },
  { find: /display_name: '\\ud83d\\udc30 WhiteRabbitNeo/, replace: "display_name: '🐰 WhiteRabbitNeo" },
  { find: /display_name: '\\ud83d\\udd13 Llama 3 8B/, replace: "display_name: '🔓 Llama 3 8B" },
  { find: /display_name: '\\ud83d\\udd13 Llama 3 70B/, replace: "display_name: '🔓 Llama 3 70B" }
];

let fixCount = 0;
fixes.forEach(({find, replace}) => {
  if (find.test(content)) {
    content = content.replace(find, replace);
    fixCount++;
  }
});

if (fixCount > 0) {
  fs.writeFileSync(proxyPath, content, 'utf8');
  console.log(`✓ Fixed ${fixCount} emoji escape sequences in ${proxyPath}`);
} else {
  console.log('No fixes needed - emojis already correct');
}
