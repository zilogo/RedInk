# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

红墨 (RedInk) is an AI-powered tool for generating Xiaohongshu (小红书) image-text content. It uses AI models to generate both text outlines and styled images suitable for social media posts.

**Tech Stack:**
- **Backend**: Python 3.11+ with Flask
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia
- **Package Management**: Backend uses `uv`, Frontend uses `pnpm`
- **AI Models**: Supports Google Gemini (text + image), OpenAI-compatible APIs, and custom image generation APIs

## Architecture

### Backend Structure (`backend/`)

The backend follows a service-oriented architecture with clear separation of concerns:

1. **Generator System** (`generators/`):
   - **Factory Pattern**: `factory.py` creates generator instances based on provider type
   - **Base Class**: `base.py` defines the `ImageGeneratorBase` interface
   - **Implementations**:
     - `google_genai.py`: Google Gemini image generation
     - `openai_compatible.py`: OpenAI-compatible APIs
     - `image_api.py`: Custom image generation APIs
   - **Extensibility**: Register custom generators via `ImageGeneratorFactory.register_generator()`

2. **Service Layer** (`services/`):
   - `outline.py`: Text generation service using LLM for content outlines
   - `image.py`: Image generation orchestration with concurrent/sequential modes
   - `history.py`: Historical record management

3. **Configuration** (`config.py`):
   - Loads from YAML files: `text_providers.yaml` and `image_providers.yaml`
   - Supports dynamic provider switching via `active_provider` setting
   - Web UI can modify configurations at runtime

4. **Routes** (`routes/api.py`):
   - RESTful endpoints for outline generation, image generation, and settings management
   - SSE (Server-Sent Events) for real-time progress updates during image generation

5. **Utilities** (`utils/`):
   - `text_client.py`: Unified client interface for different LLM providers
   - `genai_client.py`: Google Gemini-specific client wrapper
   - `image_compressor.py`: Image compression for thumbnails and references

### Frontend Structure (`frontend/src/`)

Vue 3 application with composition API and TypeScript:

1. **Views** (`views/`):
   - `HomeView.vue`: Topic input and image upload
   - `OutlineView.vue`: Edit generated outline
   - `GenerateView.vue`: Real-time generation progress
   - `ResultView.vue`: Display generated images
   - `HistoryView.vue`: Browse historical generations
   - `SettingsView.vue`: Configure API providers

2. **State Management** (`stores/generator.ts`):
   - Pinia store managing generation workflow state
   - Stages: `input → outline → generating → result`
   - Persists state to localStorage for session recovery
   - Handles page management (add, delete, reorder, edit)

3. **API Client** (`api/index.ts`):
   - Axios-based HTTP client
   - SSE handling for streaming generation progress

### Image Generation Workflow

The system implements a two-phase generation strategy:

**Phase 1: Cover Generation**
- Generate the cover image first (index 0)
- Use user-uploaded images as reference if provided
- Compress and cache the cover image (200KB) for Phase 2

**Phase 2: Content Generation**
- Two modes based on `high_concurrency` config:
  - **Sequential**: Generate images one by one (safe for API rate limits)
  - **Concurrent**: Generate up to 15 images in parallel (requires high API quota)
- Use the cover image as a style reference to maintain consistency
- Pass full outline and user topic to each generation for context

**Context Preservation**:
- All images receive: `full_outline`, `user_topic`, `reference_image`, `user_images`
- Ensures stylistic and thematic consistency across all pages

## Development Commands

### Backend

```bash
# Install dependencies
uv sync

# Run backend server (serves both API and frontend in production)
uv run python -m backend.app
# Backend: http://localhost:12398
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Development server (hot reload)
pnpm dev
# Frontend dev: http://localhost:5173

# Production build
pnpm build
# Output: frontend/dist/
```

### Docker

```bash
# Build and run with docker-compose
docker-compose up -d

# Or run pre-built image
docker run -d -p 12398:12398 -v ./output:/app/output histonemax/redink:latest
```

## Configuration

### Provider Configuration Files

1. **text_providers.yaml**: Text generation (outlines)
   - Supports: `google_gemini`, `openai_compatible`
   - Required fields: `api_key`, `model`
   - Optional: `base_url` (for OpenAI-compatible), `temperature`, `max_output_tokens`

2. **image_providers.yaml**: Image generation
   - Supports: `google_genai`, `openai_compatible`, `image_api`
   - Required fields: `api_key`, `model`, `type`
   - Optional: `base_url`, `default_aspect_ratio`, `high_concurrency`

### Configuration Loading Priority

1. Web UI settings (stored in YAML files)
2. YAML configuration files
3. Default fallback configuration

### High Concurrency Mode

- **Disabled (default)**: Images generate sequentially, safer for limited API quotas
- **Enabled**: Up to 15 concurrent image generations, requires robust API rate limits
- GCP $300 trial accounts should keep this disabled

## Key Implementation Patterns

### Prompt Templates

Located in `backend/prompts/`:
- `outline_prompt.txt`: Template for generating content outlines
- `image_prompt.txt`: Template for image generation prompts

These templates use `.format()` string formatting and receive context like `{page_content}`, `{page_type}`, `{full_outline}`, `{user_topic}`.

### Error Handling

The codebase implements comprehensive error handling with user-friendly messages:
- Network errors → suggest checking connectivity
- API key errors → guide to settings page
- Rate limit errors → explain quota issues
- Model errors → verify model name and permissions

All errors include:
1. Error description
2. Possible causes (numbered list)
3. Solution steps

### Image Compression Strategy

To manage memory and network efficiency:
- **User uploads**: Compressed to 200KB before processing
- **Cover image**: Compressed to 200KB when used as reference
- **Thumbnails**: Generated at 50KB for history display
- Uses `image_compressor.py` with quality adjustment

### Task State Management

`ImageService` maintains in-memory task states:
- Stores: generated images, failed images, cover image, full outline, user images, user topic
- Enables: single image retry, regeneration, context preservation across retries
- Memory is cleared with `cleanup_task()` after completion

## Testing & Validation

When making changes:

1. **Backend changes**: Restart Flask server (`uv run python -m backend.app`)
2. **Frontend changes**: Vite hot reload is automatic in dev mode
3. **Configuration changes**: Either restart server or use Web UI to reload config
4. **Provider changes**: Test with small requests first before full generation

## Important Notes

- **API Keys**: Never commit API keys. Use `.example` files as templates
- **Output Directory**: `history/` contains generated images organized by `task_id`
- **CORS**: Development allows `localhost:5173` and `localhost:3000`
- **Production**: Flask serves built frontend from `frontend/dist/` automatically
- **Logging**: Detailed logging configured in `app.py` with module-level control
- **License**: CC BY-NC-SA 4.0 for personal use, commercial use requires separate licensing

## Common Development Tasks

### Adding a New Image Provider

1. Create new generator class in `backend/generators/` inheriting from `ImageGeneratorBase`
2. Implement `generate_image()` method matching the interface
3. Register in `ImageGeneratorFactory.GENERATORS` dict in `factory.py`
4. Add provider configuration schema to `image_providers.yaml.example`

### Modifying Generation Logic

- **Outline generation**: Edit `backend/services/outline.py` and `backend/prompts/outline_prompt.txt`
- **Image generation**: Edit `backend/services/image.py` and `backend/prompts/image_prompt.txt`
- **Generation workflow**: Modify `generate_images()` generator function in `image.py`

### Frontend State Flow

The application follows a linear workflow managed by Pinia:
1. User inputs topic → `HomeView` → `setTopic()`
2. Generate outline → `OutlineView` → `setOutline()`
3. Start generation → `GenerateView` → `startGeneration()`
4. View results → `ResultView` → `finishGeneration()`

State persists in localStorage and survives page refresh.

### Adding New API Endpoints

1. Define route handler in `backend/routes/api.py`
2. Register with `api_bp` Blueprint
3. Add corresponding frontend API call in `frontend/src/api/index.ts`
4. Update state management in Pinia store if needed
