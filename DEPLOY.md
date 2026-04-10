# WriteMate AI Deployment Guide

This project can be deployed in two ways:

1. A unified service that serves both:
   - `/shenlun/` for 申论宝
   - `/gaokao/` for 高考作文批改与教师工作台
2. Two separate public sites from the same repo:
   - `shenlunbao-ai` with `SITE_VARIANT=shenlun`
   - `gaokao-writing-ai` with `SITE_VARIANT=gaokao`

## Recommended option: Render

Render is the fastest way to get a public demo URL with Docker and persistent SQLite storage.

## What is already configured

The repo now includes a Render blueprint at [render.yaml](/Users/wangjunxiang/Downloads/codex/render.yaml) with:

- Unified service: `writemate-ai`
- Dedicated shenlun service: `shenlunbao-ai`
- Dedicated gaokao service: `gaokao-writing-ai`
- Runtime: Docker
- Health check: `/health`
- Persistent disk mounted at `/app/data`
- Default provider mode set to `deepseek`
- OCR env placeholders ready for manual secret entry

## Before deploying

You need:

- A GitHub account with this repo pushed
- A Render account
- A valid `DEEPSEEK_API_KEY`
- Optional OCR credentials:
  - `OPENAI_API_KEY`, or
  - `BAIDU_OCR_API_KEY` and `BAIDU_OCR_SECRET_KEY`

## Important note about storage

SQLite lives at:

`/app/data/app-data.sqlite`

Do not deploy this app without a persistent disk, or your data may reset after restart or redeploy.

## Deploy on Render

1. Open Render and create a new Blueprint or Web Service from this GitHub repo.
2. If Render detects [render.yaml](/Users/wangjunxiang/Downloads/codex/render.yaml), let it use that configuration.
3. If you want two fully separate product sites, create or keep:
   - `shenlunbao-ai`
   - `gaokao-writing-ai`
   The blueprint already sets their homepages through `SITE_VARIANT`.
4. In the Render dashboard, fill the secret environment variables:
   - `DEEPSEEK_API_KEY`
   - `OPENAI_API_KEY` if you want OpenAI OCR
   - `BAIDU_OCR_API_KEY` and `BAIDU_OCR_SECRET_KEY` if you want Baidu OCR
5. Keep the disk mount at `/app/data`.
6. Deploy and wait for `/health` to return `ok: true`.

## Recommended environment variables

Non-secret defaults are already declared in the blueprint:

- `HOST=0.0.0.0`
- `PORT=3000`
- `SITE_VARIANT=unified` or `shenlun` or `gaokao`
- `AI_PROVIDER=deepseek`
- `DEEPSEEK_MODEL=deepseek-chat`
- `OCR_PROVIDER=auto`
- `BAIDU_OCR_ENDPOINT=general_basic`
- `ACTIVATION_CODES=SHENLUN-TEST-001,SHENLUN-TEST-002,SHENLUN-TEST-003,SHENLUN-TEST-004,SHENLUN-TEST-005`

Secrets must be filled manually in Render:

- `DEEPSEEK_API_KEY`
- `OPENAI_API_KEY`
- `BAIDU_OCR_API_KEY`
- `BAIDU_OCR_SECRET_KEY`

## After deployment

Use these paths to verify:

- `/health`
- `/shenlun/`
- `/gaokao/`

If the service is variant-based:

- `SITE_VARIANT=shenlun` means `/` opens 申论宝
- `SITE_VARIANT=gaokao` means `/` opens 高考写作站

If `/health` shows `provider: "deepseek"`, real-time AI grading is live.
If `/health` shows `ocrProvider: "openai"` or `ocrProvider: "baidu"`, OCR is live.

## Local run

```bash
npm start
```

Then open:

`http://127.0.0.1:3000`
