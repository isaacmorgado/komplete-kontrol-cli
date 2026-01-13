# Claude Code CLI Fix Instructions

## Problem Summary
The Claude Code CLI at `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js` has invalid Unicode escape sequences causing a SyntaxError:

```
SyntaxError: Invalid or unexpected token
     \u25b2                                        \u25b2
     ^^^^^^
```

Lines 2770-2786 contain Unicode escape sequences (like `\u25b2`, `\u2590`, `\u2588`, `\u258c`) that are being treated as literal strings instead of actual Unicode characters, breaking the JavaScript syntax.

## Root Cause
The tweakcc patch was applied with Unicode characters that got double-escaped during the bundling process, resulting in invalid JavaScript syntax.

## Fix Options

### Option 1: Quick Fix with Node.js Script (RECOMMENDED)
This directly fixes the Unicode escapes without reinstalling:

```bash
# Run the fix script with sudo (password required)
sudo node /Users/imorgado/Desktop/Projects/komplete-kontrol-cli/fix-unicode-escapes.js
```

This script will:
1. Read the broken cli.js file
2. Convert all `\uXXXX` escape sequences to actual Unicode characters
3. Write the fixed file back
4. Test that Claude Code works

### Option 2: Manual Reinstall + Patch (if Option 1 fails)
If you can provide sudo password in terminal:

```bash
# Step 1: Reinstall Claude Code
sudo npm install -g @anthropic-ai/claude-code@2.0.76 --force

# Step 2: Apply the fixed tweakcc patch
cd /tmp/tweakcc && sudo bun run dist/index.mjs --apply

# Step 3: Test
claude --version
```

### Option 3: Manual File Edit (if both above fail)
1. Open `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js` in an editor with sudo
2. Find lines 2770-2786 containing `\u25b2` and similar escapes
3. Replace all Unicode escape sequences with actual Unicode characters:
   - `\u25b2` → `▲`
   - `\u2590` → `▐`
   - `\u2588` → `█`
   - `\u258c` → `▌`
   - (and so on for all the box drawing characters)
4. Save the file
5. Test with `claude --version`

## Verification
After applying the fix, verify it works:

```bash
claude --version
```

You should see output like:
```
2.0.76 (tweakcc)
```

## Files Created
- `/Users/imorgado/Desktop/Projects/komplete-kontrol-cli/fix-unicode-escapes.js` - Automated fix script
- `/Users/imorgado/Desktop/Projects/komplete-kontrol-cli/fix-claude-cli.sh` - Alternative bash script (requires sudo)
- This file - Instructions

## Next Steps After Fix
Once Claude Code is working again:
1. Test that tweakcc patches are properly applied
2. Verify system prompts customizations are intact
3. Continue with your komplete-kontrol-cli development
