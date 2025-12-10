---
name: redink-cskill
description: AI-powered Xiaohongshu (小红书) content generator creating styled image-text posts from topics. Supports multiple AI models for both text and image generation with customizable providers.
version: 1.0.0
author: RedInk
tags: [xiaohongshu, content-generation, social-media, image-generation, ai-powered]
---

# RedInk - Xiaohongshu Content Generator Skill

## Overview

RedInk is an AI-powered content generation system that creates Xiaohongshu (小红书) style image-text posts. It orchestrates AI models to generate compelling text outlines and styled images suitable for social media posts, providing a complete content creation workflow from topic to published-ready materials.

## When to Use This Skill

✅ **Activate this skill when you need:**

**Content Creation:**
- **Social Media Posts**: "Generate Xiaohongshu content about travel tips for Japan"
- **Marketing Materials**: "Create product showcase post for skincare products"
- **Visual Storytelling**: "Generate story-style post about morning routines"
- **Educational Content**: "Create tutorial post for photography basics"
- **Product Reviews**: "Generate review post comparing different coffee makers"
- **Lifestyle Posts**: "Create lifestyle content about home organization"

**Workflow Scenarios:**
- Quick content generation with AI-assisted creativity
- Batch content creation for social media campaigns
- A/B testing different content styles and approaches
- Rapid prototyping of visual content ideas
- Multi-page content stories (cover + content pages)

**Use Cases:**
- Social media managers creating daily posts
- Marketing teams preparing campaign materials
- Content creators building visual stories
- E-commerce showcasing products with styled images
- Influencers generating consistent content themes

❌ **Do NOT use this skill for:**

- Simple text-only content (no image generation needed)
- Non-Chinese social media platforms requiring different styles
- Real-time content requiring immediate responses (<10 seconds)
- Content requiring manual photo editing or precise layouts
- Bulk generation of >20 posts at once (resource intensive)

## How It Works

### 2-Phase Generation Process

**Phase 1: Text Outline Generation** (5-15 seconds)
- AI generates structured content outline based on topic
- Breaks content into cover page + multiple content pages
- Each page has title, description, and design suggestions
- Uses LLM (Google Gemini or OpenAI-compatible models)

**Phase 2: Image Generation** (30-120 seconds)
- **Cover Generation**: Creates cover image first with user reference images
- **Content Generation**: Generates remaining images with style consistency
- **Two Modes**:
  - Sequential: One image at a time (safe for API limits)
  - Concurrent: Up to 15 parallel generations (requires high quota)
- Uses image AI (Google Imagen, DALL-E, or custom APIs)

**Style Consistency Strategy:**
- Cover image sets the visual style
- All subsequent images use cover as style reference
- Full outline and topic context passed to each generation
- Maintains thematic and aesthetic coherence across pages

## Data Sources

### Text Generation APIs

**Google Gemini** (Recommended)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Models**: `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **Authentication**: API key via `GOOGLE_API_KEY` env var
- **Rate Limits**: 60 requests/minute (free tier), higher for paid

**OpenAI-Compatible APIs**
- **Endpoint**: Configurable base URL (e.g., OpenRouter, Groq, Azure)
- **Models**: `gpt-4`, `gpt-3.5-turbo`, custom models
- **Authentication**: API key via configuration
- **Rate Limits**: Varies by provider

### Image Generation APIs

**Google Generative AI (Imagen)**
- **Endpoint**: Via Google Gemini SDK
- **Models**: `imagen-3.0-generate-001`, `imagen-3.0-fast-generate-001`
- **Authentication**: Same API key as text generation
- **Cost**: ~$0.04 per image (varies)

**OpenAI DALL-E**
- **Endpoint**: `https://api.openai.com/v1/images/generations`
- **Models**: `dall-e-3`, `dall-e-2`
- **Authentication**: OpenAI API key
- **Cost**: $0.040-0.120 per image

**Custom Image APIs**
- **Endpoint**: Configurable custom URL
- **Authentication**: Custom API key
- **Format**: Compatible with standard image generation interfaces

## Workflows

### Workflow 1: Simple Content Generation

**Use Case**: Generate complete social media post from topic

**Steps:**
1. User provides topic
2. System generates text outline (5-15s)
3. System generates images (30-120s depending on page count)
4. Results saved to history with task ID

**Example:**
```
User: "Generate Xiaohongshu content about healthy breakfast ideas"

Skill executes:
→ Phase 1: Generate outline with cover + 5 content pages
→ Phase 2: Generate 6 images maintaining visual consistency

Output:
- Task ID: task_20251128_123456
- Outline: 6-page structured content
- Images: 6 styled images (cover + 5 content)
- Location: history/task_20251128_123456/
```

### Workflow 2: Content with Reference Images

**Use Case**: Generate content styled to match reference photos

**Steps:**
1. User provides topic + reference images
2. System generates outline
3. Cover image incorporates reference style
4. Content images maintain reference aesthetic

**Example:**
```
User: "Create post about minimalist home decor" + reference_images/[modern-living-room.jpg, white-kitchen.jpg]

Skill executes:
→ Phase 1: Outline with minimalist theme
→ Phase 2: Cover uses reference images for style
→ Phase 2: Content images match minimalist aesthetic

Output: Cohesive visual story matching reference style
```

### Workflow 3: Retry Single Image

**Use Case**: Regenerate specific page that didn't meet expectations

**Steps:**
1. Identify task ID and page number
2. System regenerates only that specific image
3. Uses same context (outline, topic, cover reference)
4. Replaces failed image in history

**Example:**
```
User: "Regenerate page 3 of task_20251128_123456"

Skill executes:
→ Load task context (outline, topic, cover)
→ Regenerate image for page 3 only
→ Replace in history/task_20251128_123456/page_3.png

Output: Updated single image maintaining consistency
```

### Workflow 4: Batch Content Creation

**Use Case**: Generate multiple posts for content calendar

**Steps:**
1. User provides list of topics
2. System generates each post sequentially
3. All results organized by task IDs

**Example:**
```
User: "Generate posts for: [summer fashion, beach essentials, sunscreen tips]"

Skill executes 3 generations:
→ Generation 1: Summer fashion content
→ Generation 2: Beach essentials content
→ Generation 3: Sunscreen tips content

Output: 3 complete post sets in separate task folders
```

### Workflow 5: Custom Configuration

**Use Case**: Use specific AI models or adjust generation parameters

**Steps:**
1. User specifies provider and model preferences
2. System loads custom configuration
3. Generation uses specified providers

**Example:**
```
User: "Generate post about tech gadgets using DALL-E for images"

Configuration:
→ Text: Google Gemini (default)
→ Images: OpenAI DALL-E 3 (custom)

Output: Content using specified provider combination
```

## Available Scripts

### `backend/app.py`

**Main Flask application**

**Key Endpoints:**
- `POST /api/generate/outline`: Generate text outline
- `POST /api/generate/images`: Generate images with SSE progress
- `POST /api/regenerate/image`: Regenerate single image
- `GET /api/history`: List generation history
- `GET /api/history/<task_id>`: Get specific task details
- `GET /api/settings`: Get current configuration
- `POST /api/settings`: Update configuration

**Usage:**
```bash
# Start server
python -m backend.app
# Server runs on http://localhost:12398
```

### `backend/services/outline.py`

**Text outline generation service**

**Functions:**
- `generate_outline(topic, user_images=None)`: Generate content outline
- `_format_prompt(topic, user_images)`: Build generation prompt
- `_parse_response(response)`: Parse AI response to structured format

**Features:**
- Multi-model support (Gemini, OpenAI-compatible)
- Customizable prompts via `prompts/outline_prompt.txt`
- Structured output with page types and content

### `backend/services/image.py`

**Image generation orchestration**

**Functions:**
- `generate_images(outline, user_topic, user_images, task_id)`: Main generator
- `regenerate_image(task_id, page_number)`: Single image retry
- `_generate_cover(...)`: Cover generation with references
- `_generate_content_images(...)`: Batch content generation
- `cleanup_task(task_id)`: Memory cleanup

**Features:**
- Sequential/concurrent generation modes
- Style reference propagation
- Real-time progress via SSE
- Task state management
- Automatic error recovery

### `backend/generators/factory.py`

**Generator factory for multi-provider support**

**Functions:**
- `create_generator(config)`: Factory method for generator creation
- `register_generator(type_name, generator_class)`: Register custom generators

**Supported Generators:**
- `google_genai`: Google Gemini/Imagen
- `openai_compatible`: OpenAI and compatible APIs
- `image_api`: Custom image generation APIs

### Configuration Files

**`backend/config/text_providers.yaml`**

Text generation provider settings:
```yaml
active_provider: google_gemini

google_gemini:
  api_key: ${GOOGLE_API_KEY}
  model: gemini-1.5-flash
  temperature: 1.0
  max_output_tokens: 8192

openai_compatible:
  api_key: ${OPENAI_API_KEY}
  base_url: https://api.openai.com/v1
  model: gpt-4
```

**`backend/config/image_providers.yaml`**

Image generation provider settings:
```yaml
active_provider: google_genai

google_genai:
  api_key: ${GOOGLE_API_KEY}
  model: imagen-3.0-fast-generate-001
  type: google_genai
  default_aspect_ratio: "3:4"
  high_concurrency: false

openai_compatible:
  api_key: ${OPENAI_API_KEY}
  base_url: https://api.openai.com/v1
  model: dall-e-3
  type: openai_compatible
```

## Available Analyses

### 1. Content Generation Analysis

**Purpose**: Generate complete Xiaohongshu post with outline and images

**Methodology:**
1. Analyze topic and extract key themes
2. Generate structured multi-page outline
3. Create cover image establishing visual style
4. Generate content images with consistency

**Inputs:**
- `topic` (str): Main content topic or theme
- `reference_images` (list, optional): Style reference photos
- `num_pages` (int, optional): Number of pages (auto from outline)

**Outputs:**
```json
{
  "task_id": "task_20251128_123456",
  "outline": {
    "pages": [
      {
        "page_number": 0,
        "page_type": "cover",
        "title": "健康早餐指南",
        "description": "开启活力一天",
        "content": ["营养搭配", "快手制作", "美味健康"]
      },
      ...
    ]
  },
  "images": [
    {
      "page_number": 0,
      "url": "/history/task_20251128_123456/page_0.png",
      "status": "success"
    },
    ...
  ],
  "metadata": {
    "topic": "健康早餐创意",
    "pages_count": 6,
    "generation_time": 85.3,
    "provider": "google_genai"
  }
}
```

### 2. Single Image Regeneration

**Purpose**: Retry failed or unsatisfactory image

**Methodology:**
1. Load task context (outline, topic, cover)
2. Regenerate specific page image
3. Maintain style consistency with cover

**Inputs:**
- `task_id` (str): Task identifier
- `page_number` (int): Page to regenerate

**Outputs:**
- Updated image at same location
- Preserved task context and other images

### 3. History Analysis

**Purpose**: Browse and manage generation history

**Methodology:**
1. Scan history directory for task folders
2. Load task metadata and thumbnails
3. Present chronological listing

**Inputs:**
- `limit` (int, optional): Number of results
- `offset` (int, optional): Pagination offset

**Outputs:**
```json
{
  "total": 25,
  "items": [
    {
      "task_id": "task_20251128_123456",
      "topic": "健康早餐创意",
      "pages_count": 6,
      "created_at": "2025-11-28T12:34:56",
      "thumbnail": "/history/task_20251128_123456/page_0_thumb.jpg"
    },
    ...
  ]
}
```

## Error Handling

### Common Errors and Solutions

**Error: Missing API Key**
```
Solution: Set environment variable or configure in settings:
export GOOGLE_API_KEY="your-api-key"

Or use Web UI: http://localhost:12398/settings
```

**Error: Image Generation Timeout**
```
Cause: API overload or complex prompts
Solutions:
1. Retry the specific failed image
2. Switch to sequential mode (disable high_concurrency)
3. Use faster model (imagen-3.0-fast-generate-001)
```

**Error: Outline Generation Failed**
```
Cause: Invalid API key or network issues
Solutions:
1. Verify API key is correct
2. Check network connectivity
3. Try alternative provider (switch text_providers.yaml)
```

**Error: Style Inconsistency**
```
Cause: Cover not used as reference or provider limitations
Solutions:
1. Ensure high-quality reference images
2. Try different image model
3. Regenerate cover first, then content images
```

**Error: Rate Limit Exceeded**
```
Cause: Too many requests to API
Solutions:
1. Wait for rate limit reset (varies by provider)
2. Disable high_concurrency mode
3. Upgrade API quota/plan
```

## Mandatory Validations

**Before Generation:**
- [ ] API keys configured for active providers
- [ ] Topic is non-empty and valid UTF-8
- [ ] Reference images (if provided) are valid image files
- [ ] Output directory is writable
- [ ] Providers are properly configured

**During Generation:**
- [ ] Outline generation succeeded
- [ ] At least cover image generated successfully
- [ ] Images saved to correct task directory
- [ ] Progress updates sent via SSE
- [ ] Memory cleaned up after completion

**After Generation:**
- [ ] All images accessible via filesystem
- [ ] Task metadata saved correctly
- [ ] History updated with new task
- [ ] Thumbnails generated for browsing

## Performance and Caching

### Performance Characteristics

**Typical Latency:**
- Outline generation: 5-15 seconds
- Single image: 5-20 seconds per image
- Sequential (6 pages): 60-120 seconds total
- Concurrent (6 pages): 30-60 seconds total (parallel)

**Resource Usage:**
- Memory: ~200MB per active task
- Disk: ~2-5MB per generated image
- Network: Depends on API provider

**Optimization Techniques:**
- Image compression (200KB for references, 50KB for thumbnails)
- Cover-first strategy for style consistency
- Concurrent generation for high-quota accounts
- Memory cleanup after task completion

### Caching Strategy

**What to Cache:**
- ✅ Compressed reference images (task duration)
- ✅ Generated thumbnails (permanent)
- ✅ Task metadata (permanent)
- ❌ AI API responses (not cached)

**Cache Storage:**
- Location: `history/`
- Organization: `history/{task_id}/`
- Files: `page_*.png`, `page_*_thumb.jpg`, `outline.json`

## Keywords for Detection

**Primary Keywords:**
- xiaohongshu, 小红书, redbook, little red book
- social media content, social post generation
- image-text post, visual content, styled images
- content generation, content creation

**Action Keywords:**
- generate content, create post, make images
- xiaohongshu style, social media style
- visual storytelling, image story

**Domain Keywords:**
- lifestyle content, product showcase, tutorial post
- marketing material, social campaign
- influencer content, brand post

**Chinese Keywords:**
- 生成内容, 创建帖子, 图文生成
- 小红书风格, 社交媒体内容

**Use Case Keywords:**
- travel guide, product review, tutorial, lifestyle
- skincare, fashion, food, home decor, photography
- morning routine, tips and tricks, recommendations

## Usage Examples

### Example 1: Simple Content Generation

```
User: "Generate Xiaohongshu content about budget travel tips for Southeast Asia"

Skill response:
🎨 RedInk Content Generation

📋 Topic: Budget Travel Tips - Southeast Asia

⚙️ Phase 1: Generating Outline...
✅ Outline complete (6 pages)
   - Cover: 东南亚穷游攻略
   - Page 1: 机票省钱秘籍
   - Page 2: 住宿选择技巧
   - Page 3: 美食推荐
   - Page 4: 交通出行指南
   - Page 5: 景点打卡清单

⚙️ Phase 2: Generating Images...
✅ Cover image generated (style reference set)
⏳ Generating content images (sequential mode)...
   [1/5] Page 1: ████████████ 100%
   [2/5] Page 2: ████████████ 100%
   [3/5] Page 3: ████████████ 100%
   [4/5] Page 4: ████████████ 100%
   [5/5] Page 5: ████████████ 100%

✅ Generation complete!

📁 Task ID: task_20251128_143022
📂 Location: history/task_20251128_143022/
📊 Pages: 6 images generated
⏱️  Time: 78.5 seconds
💰 Estimated cost: ~$0.24 (6 images)

View results: http://localhost:12398/result?task=task_20251128_143022
```

### Example 2: Content with Reference Images

```
User: "Create Xiaohongshu post about modern minimalist home decor using these reference images"
[User provides: living-room.jpg, bedroom.jpg]

Skill response:
🎨 RedInk Content Generation with Style References

📋 Topic: Modern Minimalist Home Decor
🖼️  Reference Images: 2 photos provided

⚙️ Phase 1: Generating Outline...
✅ Outline complete (5 pages)
   Theme: Minimalist aesthetics with neutral tones

⚙️ Phase 2: Generating Images...
✅ Cover image (incorporating reference style)
   → Clean lines and neutral palette established
⏳ Generating content images...
   → Maintaining minimalist aesthetic across all pages
   [1/4] Page 1: Modern living spaces ████████████ 100%
   [2/4] Page 2: Bedroom essentials ████████████ 100%
   [3/4] Page 3: Storage solutions ████████████ 100%
   [4/4] Page 4: Decoration tips ████████████ 100%

✅ Generation complete!

📁 Task ID: task_20251128_151545
📊 Style Consistency: Reference-matched aesthetic maintained
⏱️  Time: 65.2 seconds

The generated content maintains the clean, minimalist style from your reference images.
```

### Example 3: Single Image Retry

```
User: "Regenerate page 3 from task_20251128_143022 - it didn't match the style"

Skill response:
🔄 RedInk Image Regeneration

📋 Task: task_20251128_143022
📄 Page: 3 (美食推荐)

⚙️ Loading task context...
✅ Context loaded:
   - Original topic: Budget travel Southeast Asia
   - Cover style reference: ✓
   - Full outline: ✓

⚙️ Regenerating page 3...
✅ New image generated!

📂 Updated: history/task_20251128_143022/page_3.png
⏱️  Time: 12.3 seconds
💰 Cost: ~$0.04 (1 image)

The new image maintains consistency with the cover style and outline context.
```

### Example 4: Batch Generation

```
User: "Generate 3 Xiaohongshu posts: [summer skincare, SPF guide, after-sun care]"

Skill response:
🎨 RedInk Batch Content Generation

📋 Topics: 3 posts queued

⚙️ Generation 1/3: Summer Skincare Routine
✅ Complete (6 pages, 72.1s)
   Task ID: task_20251128_160112

⚙️ Generation 2/3: Complete SPF Protection Guide
✅ Complete (5 pages, 58.3s)
   Task ID: task_20251128_160224

⚙️ Generation 3/3: After-Sun Recovery Care
✅ Complete (4 pages, 45.7s)
   Task ID: task_20251128_160323

✅ Batch complete!

📊 Summary:
   - Total posts: 3
   - Total pages: 15 images
   - Total time: 176.1 seconds
   - Estimated cost: ~$0.60

View all posts in history: http://localhost:12398/history
```

### Example 5: Custom Configuration

```
User: "Generate post about tech gadgets using DALL-E 3 for higher quality images"

Skill response:
🎨 RedInk Content Generation (Custom Config)

⚙️ Configuration:
   - Text: Google Gemini 1.5 Flash
   - Images: OpenAI DALL-E 3
   - Mode: Sequential (safer for DALL-E rate limits)

📋 Topic: Must-Have Tech Gadgets 2024

⚙️ Phase 1: Outline generation...
✅ Complete (7 pages)

⚙️ Phase 2: Image generation (DALL-E 3)...
⏳ [1/7] Cover: High-quality gadget showcase...
✅ [1/7] Complete
⏳ [2/7] Page 1: Smartphone accessories...
...

✅ Generation complete!

📁 Task ID: task_20251128_163455
💎 Provider: DALL-E 3 (higher quality, slower)
⏱️  Time: 142.7 seconds (longer due to DALL-E processing)
💰 Estimated cost: ~$0.84 (DALL-E 3 premium pricing)

High-quality images generated with enhanced detail and composition.
```

---

## Installation and Setup

### Prerequisites

- Python 3.11 or higher
- API keys for chosen providers (Google AI or OpenAI)
- `uv` package manager (or pip/poetry)

### Installation Steps

1. **Clone/Download RedInk**
```bash
cd /path/to/RedInk
```

2. **Install Dependencies**
```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -r requirements.txt
```

3. **Configure API Keys**

Create `.env` file or set environment variables:
```bash
export GOOGLE_API_KEY="your-google-ai-key"
# OR
export OPENAI_API_KEY="your-openai-key"
```

4. **Configure Providers (Optional)**

Edit configuration files:
- `backend/config/text_providers.yaml` - Text generation settings
- `backend/config/image_providers.yaml` - Image generation settings

5. **Start Backend Server**
```bash
uv run python -m backend.app
# Server: http://localhost:12398
```

6. **Install Claude Code Skill**
```bash
/plugin marketplace add /path/to/RedInk
```

### Quick Test

```bash
# Test from command line
curl -X POST http://localhost:12398/api/generate/outline \
  -H "Content-Type: application/json" \
  -d '{"topic": "测试主题"}'

# Or use Claude Code
"Generate Xiaohongshu content about coffee brewing techniques"
```

## Configuration Guide

### Recommended Settings

**For Development/Testing:**
```yaml
# image_providers.yaml
google_genai:
  model: imagen-3.0-fast-generate-001  # Faster, cheaper
  high_concurrency: false               # Sequential, safer
```

**For Production/High Quality:**
```yaml
# image_providers.yaml
google_genai:
  model: imagen-3.0-generate-001       # Higher quality
  high_concurrency: true                # Parallel, faster

openai_compatible:
  model: dall-e-3                       # Premium quality
  high_concurrency: false               # DALL-E rate limits
```

**For Cost Optimization:**
```yaml
# text_providers.yaml
google_gemini:
  model: gemini-1.5-flash              # Fastest, cheapest

# image_providers.yaml
google_genai:
  model: imagen-3.0-fast-generate-001  # Fast variant
  high_concurrency: false               # Avoid rate limit charges
```

## Troubleshooting

**Server won't start:**
```bash
# Check port availability
lsof -i :12398

# Or use different port
PORT=13000 uv run python -m backend.app
```

**Images not generating:**
1. Check API key is valid
2. Verify provider configuration
3. Check server logs: `backend/logs/app.log`
4. Try alternative provider

**Style inconsistency:**
1. Ensure reference images are high quality
2. Try regenerating cover first
3. Use same provider for all images
4. Check prompt templates in `backend/prompts/`

## Cost Estimation

**Google Gemini + Imagen (Recommended):**
- Text generation: ~$0.0001 per request
- Image generation: ~$0.04 per image
- **6-page post**: ~$0.24 total

**OpenAI GPT-4 + DALL-E 3:**
- Text generation: ~$0.03 per request
- Image generation: ~$0.08-0.12 per image
- **6-page post**: ~$0.60 total

**Cost Optimization Tips:**
- Use `gemini-1.5-flash` for text (10x cheaper than Pro)
- Use `imagen-3.0-fast` for images (same quality, faster)
- Disable `high_concurrency` to avoid rate limit penalties
- Regenerate only failed images instead of full post

## Version History

**Version 1.0.0** (2025-11-28)
- Initial release
- Google Gemini and OpenAI support
- Sequential and concurrent generation modes
- History management and single image retry
- Web UI and API interface

## License

CC BY-NC-SA 4.0 - See LICENSE file
Personal use free, commercial use requires licensing

## Support

- Issues: [RedInk GitHub](https://github.com/your-repo/redink)
- Documentation: See README.md and CLAUDE.md
- Web Interface: http://localhost:12398
