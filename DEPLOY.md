# WriteMate AI Deployment Guide

This app is ready to deploy as a small Node web service.

## Recommended quick option: Render

Why Render:
- It gives you a public URL quickly.
- It supports Node web services.
- It supports persistent disks, which matters because this app stores data in SQLite.

## Before deploying

You need:
- A GitHub account
- A Render account
- Optional: an OpenAI API key for real AI grading

## Important note about storage

This app stores data in SQLite at:

`/app/data/app-data.sqlite` inside Docker

If you deploy without persistent storage, your data can reset after redeploys or restarts.

## Render setup

1. Put this project in a GitHub repository.
2. In Render, create a new Web Service from that repo.
3. Use these settings:

- Runtime: Docker
- Dockerfile Path: `./Dockerfile`
- Health Check Path: `/health`
- Port: `3000`

4. Set environment variables:

- `HOST=0.0.0.0`
- `PORT=3000`
- `OPENAI_API_KEY=...` (optional)
- `OPENAI_MODEL=gpt-5-mini` (optional)

5. For persistent SQLite data, attach a persistent disk and mount it at:

`/app/data`

## Local run

```bash
npm start
```

Then open:

`http://127.0.0.1:3000`
