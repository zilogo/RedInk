# RedInk - Xiaohongshu Content Generator (Claude Code Skill)

> AI-powered Xiaohongshu (小红书) content generator creating styled image-text posts from topics.

## Quick Start

### 1. Install the Skill

```bash
/plugin marketplace add /Users/will/Code/Laiye/RedInk
```

### 2. Set Up API Keys

```bash
# For Google AI (Recommended)
export GOOGLE_API_KEY="your-google-ai-key"

# OR for OpenAI
export OPENAI_API_KEY="your-openai-key"
```

### 3. Start Backend Server

```bash
cd RedInk
uv run python -m backend.app
# Server: http://localhost:12398
```

### 4. Use in Claude Code

```
"Generate Xiaohongshu content about healthy breakfast ideas"

"Create RedInk post for summer skincare tips with reference images"

"Regenerate page 3 from task_20251128_123456"
```

## Features

✨ **AI-Powered Generation**
- Text outline generation with structured pages
- Styled image generation maintaining consistency
- Multi-page content stories (cover + content)

🎨 **Multiple AI Providers**
- Google Gemini + Imagen (recommended)
- OpenAI GPT + DALL-E
- Custom API support

⚡ **Flexible Workflows**
- Sequential mode: Safe for API limits
- Concurrent mode: Up to 15 parallel generations
- Single image retry for failed generations
- Reference image support for style matching

📊 **History Management**
- Automatic task organization
- Thumbnail generation for browsing
- Task metadata and outline preservation

## Usage Examples

### Simple Content Generation

```
User: "Generate Xiaohongshu content about travel tips for Japan"

Output:
✅ Task ID: task_20251128_143022
📊 Pages: 6 images generated (cover + 5 content)
⏱️  Time: 78.5 seconds
📁 Location: history/task_20251128_143022/
```

### With Reference Images

```
User: "Create post about minimalist home decor"
      + reference images [living-room.jpg, kitchen.jpg]

Output:
✅ Style matched to reference aesthetic
📊 Pages: 5 images with consistent minimalist theme
```

### Retry Single Image

```
User: "Regenerate page 3 from task_20251128_143022"

Output:
✅ Page 3 regenerated with maintained style consistency
⏱️  Time: 12.3 seconds
```

## Configuration

### Text Generation (`backend/config/text_providers.yaml`)

```yaml
active_provider: google_gemini

google_gemini:
  api_key: ${GOOGLE_API_KEY}
  model: gemini-1.5-flash
  temperature: 1.0
  max_output_tokens: 8192
```

### Image Generation (`backend/config/image_providers.yaml`)

```yaml
active_provider: google_genai

google_genai:
  api_key: ${GOOGLE_API_KEY}
  model: imagen-3.0-fast-generate-001
  type: google_genai
  default_aspect_ratio: "3:4"
  high_concurrency: false  # Set true for parallel generation
```

## API Endpoints

- `POST /api/generate/outline` - Generate text outline
- `POST /api/generate/images` - Generate images with SSE progress
- `POST /api/regenerate/image` - Regenerate single image
- `GET /api/history` - List generation history
- `GET /api/settings` - Get current configuration
- `POST /api/settings` - Update configuration

## Cost Estimation

**Google Gemini + Imagen (Recommended):**
- Text: ~$0.0001 per request
- Image: ~$0.04 per image
- **6-page post**: ~$0.24 total

**OpenAI GPT-4 + DALL-E 3:**
- Text: ~$0.03 per request
- Image: ~$0.08-0.12 per image
- **6-page post**: ~$0.60 total

## Troubleshooting

### API Key Errors
```bash
# Verify key is set
echo $GOOGLE_API_KEY

# Or configure in Web UI
http://localhost:12398/settings
```

### Image Generation Timeout
- Switch to sequential mode (`high_concurrency: false`)
- Use faster model (`imagen-3.0-fast-generate-001`)
- Retry specific failed image

### Style Inconsistency
- Ensure high-quality reference images
- Regenerate cover first, then content
- Use same provider for all images

## Testing

```bash
# Test outline generation
curl -X POST http://localhost:12398/api/generate/outline \
  -H "Content-Type: application/json" \
  -d '{"topic": "健康早餐创意"}'

# Or run integration tests (if available)
python tests/test_integration.py
```

## Files Structure

```
RedInk/
├── .claude-plugin/
│   └── marketplace.json      # Skill registration
├── SKILL.md                  # Complete skill documentation
├── backend/
│   ├── app.py               # Flask application
│   ├── config/              # Provider configurations
│   ├── services/            # Generation services
│   ├── generators/          # AI provider implementations
│   ├── prompts/             # Prompt templates
│   └── utils/               # Utilities
├── frontend/                # Vue.js web interface
├── history/                 # Generated content storage
└── README.md               # This file
```

## Documentation

- **SKILL.md**: Complete skill documentation with workflows and examples
- **CLAUDE.md**: Project architecture and development guide
- **README.md**: Quick start and basic usage

## Version

Version 1.0.0 - Initial release (2025-11-28)

## License

CC BY-NC-SA 4.0 - Personal use free, commercial use requires licensing

## Support

- Web Interface: http://localhost:12398
- Issues: [GitHub Issues](https://github.com/your-repo/redink)
- Documentation: See SKILL.md for comprehensive guide
