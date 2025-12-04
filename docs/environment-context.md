Environment Configuration — SD Forest / Orchestrator System
Local Machine

OS: Windows

Stable Diffusion installation (Automatic1111):

C:\Ivan\_StableDiffusion\stable-diffusion-webui\


Orchestrator GPT repo path (local):

C:\Ivan\_StableDiffusion\orchestrator-gpt\

GitHub Repository

Repository URL:

https://github.com/ivangegovdve-sudo/orchestrator-gpt


Default branch: main

Folder structure highlights:

web/prompt-builder/index.html      ← orchestrator shell
web/prompt-builder/builder.html    ← actual Fantasy Icon Prompt Builder (static)
web/site/                          ← future Next.js application
config/
scripts/
docs/
data/

Vercel Deployment

Project name: orchestrator-gpt

Deployment root directory:

web/prompt-builder


Framework preset: Other

Build command: (none)

Output directory: .

Deployment URL:

https://orchestrator-gpt.vercel.app

Domain & DNS
Primary domain
sdforest.site

Canonical domain
www.sdforest.site


(sdforest.site redirects to www.sdforest.site
)

DNS Provider

Cloudflare

DNS Records (Correct & Active)
Apex domain (sdforest.site)
Type: A
Name: @
Value: 216.198.79.1
Proxy: DNS Only (grey cloud)
TTL: Auto

WWW domain (www.sdforest.site
)
Type: CNAME
Name: www
Value: <vercel-dns-subdomain>.vercel-dns-017.com
Proxy: DNS Only (grey cloud)
TTL: Auto


All domains validated successfully in Vercel.

Stable Diffusion API

Local A1111 API endpoint (when running with --api):

http://127.0.0.1:7860/sdapi/v1/txt2img

Future Integration: SD Bridge
Planned architecture:

A lightweight bridge server running locally

Exposed via Cloudflare Tunnel

Public endpoint (future):

https://api.sdforest.site/generate


Internal mapping:

http://127.0.0.1:7860/