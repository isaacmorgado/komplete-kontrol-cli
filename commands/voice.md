---
description: Voice command interface for hands-free operation
argument-hint: "[action]"
allowed-tools: ["Bash", "Read", "Write"]
---

# Voice Command Interface

Control Claude Sovereign hands-free using voice commands with speech-to-text and text-to-speech.

## Usage

```
/voice start
/voice stop
/voice status
/voice settings
```

## Commands

### start
Activate voice control mode
- Listens for wake word ("Hey Claude")
- Converts speech to text
- Executes recognized commands
- Speaks responses (optional)

### stop
Deactivate voice control

### status
Show voice control status and available commands

### settings
Configure voice control preferences

## Supported Voice Commands

### Navigation
- "Hey Claude, show me the project structure"
- "Open file [filename]"
- "Go to function [name]"

### Autonomous Mode
- "Hey Claude, start autonomous mode"
- "Stop autonomous mode"
- "What are you working on?"

### Checkpoints
- "Create checkpoint with message [text]"
- "Show recent checkpoints"
- "Restore checkpoint [id]"

### Status
- "What's the current status?"
- "Show me recent changes"
- "How many tokens are we using?"

### Tasks
- "Add task [description]"
- "Mark task complete"
- "Show todo list"

## How It Works

1. **Wake Word Detection**: Listens for "Hey Claude"
2. **Speech Recognition**: Converts voice to text
3. **Intent Recognition**: Understands command intent
4. **Command Execution**: Routes to appropriate handler
5. **Text-to-Speech**: Speaks response (optional)

## Configuration

```bash
export VOICE_WAKE_WORD="Hey Claude"
export VOICE_TTS_ENABLED="true"
export VOICE_LANGUAGE="en-US"
export VOICE_RECOGNITION_ENGINE="whisper"  # or "google", "azure"
```

## Requirements

### macOS
- Built-in speech recognition
- `say` command for TTS

### Linux
- PulseAudio or ALSA
- `espeak` or `festival` for TTS
- `sox` for recording

### Speech Recognition
- **Whisper**: Best accuracy, local processing
- **Google Speech API**: Cloud-based, very accurate
- **Azure Speech**: Enterprise features

## Example Workflow

```bash
# Start voice control
/voice start

# Voice command
"Hey Claude, start autonomous mode"

# Claude responds (spoken)
"Autonomous mode activated. I will now work fully autonomously."

# Voice command
"Hey Claude, implement user authentication"

# Claude works autonomously
# ... (implementation happening)

# Voice command
"Hey Claude, what's the status?"

# Claude responds (spoken)
"I've completed the authentication backend and I'm now working on the frontend components.
Currently at 45% context usage. Would you like me to checkpoint?"

# Voice command
"Yes, create checkpoint"

# Claude responds (spoken)
"Checkpoint created. All changes saved and pushed to GitHub."
```

## Features

- ✅ Wake word detection
- ✅ Natural language understanding
- ✅ Command routing
- ✅ Optional TTS responses
- ✅ Hands-free operation
- ✅ Background listening
- ✅ Multiple languages

## Privacy

- Local processing option (Whisper)
- No audio recording unless wake word detected
- Audio discarded after processing
- No cloud transmission if using local engine

## Integration

- `/auto` - Voice-controlled autonomous mode
- `/checkpoint` - Voice-triggered checkpoints
- All commands - Voice-accessible
