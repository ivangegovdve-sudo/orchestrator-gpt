# Item Icon Generator Pipeline

Quick reference for how the office-wide item icon flow is wired and how to run or tweak it.

## Architecture at a Glance
- **FastAPI backend** calls the Runware API to launch generation tasks and return task + image URLs.
- **Static HTML + vanilla JS frontend** (`frontend/index.html`) for non-technical teammates; posts directly to the backend.
- **Config files** store AIR model IDs and prompt templates that the backend uses when assembling Runware requests.

## AIR Model IDs
- AIR IDs identify base models and LoRAs inside Runware.
- You can find compatible AIRs on CivitAI (model page sidebar shows RunDiffusion/Runware IDs) or via Runware's Model Explorer in the console.
- Keep the IDs noted in the config so everyone can reuse the same base and LoRA choices.

## Running Locally
- Create and activate a virtual environment (e.g., `python -m venv .venv` then `source .venv/bin/activate` or `Scripts\\activate`).
- Install backend dependencies (e.g., `pip install -r backend/requirements.txt`).
- Set `RUNWARE_API_KEY` in your environment before starting the server.
- Start the FastAPI app on port 8000 (e.g., `uvicorn backend.main:app --reload --port 8000`).
- Open `frontend/index.html` directly in your browser or serve it with a simple static server (e.g., `python -m http.server 8080`).

## Customizing the Style
- **Change the base model AIR**: update the base AIR ID in the backend config to switch the default diffusion model.
- **Use a different Western animation LoRA AIR**: swap the LoRA AIR ID in the config that is toggled by the “Use Western Animation Base Model” checkbox.
- **Tweak prompts and ControlNet weights**: edit the default positive/negative prompts and ControlNet weight values in the config file the backend reads before sending Runware requests.

## Mirroring This in Local Stable Diffusion (Automatic1111)
- Pick a checkpoint like **DreamShaper_8_pruned** or **v1-5-pruned-emaonly**.
- Enable **MySee-EDPF ControlNet** for seed conditioning.
- Load your item and color-grading LoRAs with similar weights to the Runware setup.
- Follow the same base positive/negative prompt pattern from the config to stay consistent with the hosted pipeline.
