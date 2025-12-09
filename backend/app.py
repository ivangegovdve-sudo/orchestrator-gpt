import os
import uuid
import json
from typing import Optional, Any, Dict, List

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load RUNWARE_API_KEY from .env if present
load_dotenv()

RUNWARE_API_KEY = os.getenv("RUNWARE_API_KEY")
if not RUNWARE_API_KEY:
    raise RuntimeError("RUNWARE_API_KEY is not set. Create a .env file or set an env var.")

# Load canonical config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "runware-item-icons.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    PIPELINE_CONFIG = json.load(f)

RUNWARE_API_URL = PIPELINE_CONFIG["runwareApiUrl"]
DEFAULTS = PIPELINE_CONFIG["defaults"]

app = FastAPI(title="Item Icon Generator — Western Animation Style")

# CORS for your internal web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ItemIconRequest(BaseModel):
    seedImage: str
    assetDescription: str
    styleHint: Optional[str] = None
    useWesternAnimationBase: bool = True


class ItemIconResponse(BaseModel):
    taskUUID: str
    imageURL: str
    rawResponse: Dict[str, Any]


def build_positive_prompt(asset_description: str, style_hint: Optional[str]) -> str:
    base_template = DEFAULTS["prompts"]["basePositiveTemplate"]
    prompt = base_template.replace("{assetDescription}", asset_description.strip())

    if style_hint:
        prompt = f"{prompt}, {style_hint.strip()}"
    return prompt


def run_runware_tasks(tasks: List[dict]) -> dict:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {RUNWARE_API_KEY}",
    }

    resp = requests.post(RUNWARE_API_URL, headers=headers, json=tasks, timeout=60)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Runware API HTTP {resp.status_code}: {resp.text}")

    data = resp.json()
    if "data" not in data:
        raise HTTPException(status_code=502, detail=f"Runware API error: {data}")
    return data


@app.post("/api/item-icon", response_model=ItemIconResponse)
def generate_item_icon(req: ItemIconRequest):
    workflow_id = str(uuid.uuid4())

    preprocess_task_uuid = f"pre-{workflow_id}"
    controlnet_preprocess_task = {
        "taskType": "controlNetPreprocess",
        "taskUUID": preprocess_task_uuid,
        "inputImage": req.seedImage,
        "preProcessorType": "canny",
        "height": DEFAULTS["height"],
        "width": DEFAULTS["width"],
        "lowThresholdCanny": 80,
        "highThresholdCanny": 200,
        "outputType": "URL",
        "outputFormat": "PNG",
    }

    preprocess_response = run_runware_tasks([controlnet_preprocess_task])
    pre_items = [d for d in preprocess_response["data"] if d.get("taskUUID") == preprocess_task_uuid]
    if not pre_items:
        raise HTTPException(status_code=502, detail="No preprocess result from Runware.")
    guide_image_url = pre_items[0].get("guideImageURL")
    if not guide_image_url:
        raise HTTPException(status_code=502, detail="Missing guideImageURL in preprocess response.")

    inference_task_uuid = f"ii-{workflow_id}"

    positive_prompt = build_positive_prompt(req.assetDescription, req.styleHint)
    negative_prompt = DEFAULTS["prompts"]["baseNegative"]

    if req.useWesternAnimationBase:
        model_air = DEFAULTS["baseModel"]["airWesternAnimBase"]
    else:
        model_air = DEFAULTS["baseModel"]["airBaseModel"]

    western_lora = {
        "model": DEFAULTS["lora"]["westernAnimation"]["airId"],
        "weight": DEFAULTS["lora"]["westernAnimation"]["weight"],
    }

    controlnet_cfg = DEFAULTS["controlNet"]
    controlnet_obj = {
        "model": controlnet_cfg["model"],
        "guideImage": guide_image_url,
        "weight": controlnet_cfg["weight"],
        "startStep": controlnet_cfg["startStep"],
        "endStep": controlnet_cfg["endStep"],
        "controlMode": controlnet_cfg["controlMode"],
    }

    image_inference_task = {
        "taskType": "imageInference",
        "taskUUID": inference_task_uuid,
        "outputType": "URL",
        "outputFormat": "PNG",
        "positivePrompt": positive_prompt,
        "negativePrompt": negative_prompt,
        "height": DEFAULTS["height"],
        "width": DEFAULTS["width"],
        "steps": DEFAULTS["steps"],
        "CFGScale": DEFAULTS["cfgScale"],
        "model": model_air,
        "numberResults": DEFAULTS["numberResults"],
        "lora": [western_lora],
        "controlNet": [controlnet_obj],
    }

    inference_response = run_runware_tasks([image_inference_task])
    inference_items = [d for d in inference_response["data"] if d.get("taskUUID") == inference_task_uuid]
    if not inference_items:
        raise HTTPException(status_code=502, detail="No imageInference result from Runware.")

    image_item = inference_items[0]
    image_url = image_item.get("imageURL") or image_item.get("imageUrl")
    if not image_url:
        raise HTTPException(status_code=502, detail="Missing imageURL in imageInference response.")

    raw_combined = {
        "preprocess": preprocess_response,
        "inference": inference_response,
    }

    return ItemIconResponse(
        taskUUID=workflow_id,
        imageURL=image_url,
        rawResponse=raw_combined,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
