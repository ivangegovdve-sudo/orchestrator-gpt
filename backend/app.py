import logging
import os
import uuid
import json
import re
from typing import Optional, Any, Dict, List
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dataclasses import dataclass

try:
    from . import jobs_api, movies_api, movies_db  # type: ignore
    from .llm_db.api import router as llm_db_router
except ImportError:
    import jobs_api  # type: ignore
    import movies_api  # type: ignore
    import movies_db  # type: ignore
    from backend.llm_db.api import router as llm_db_router

# -----------------------------------------------------------------------------
# ENV & CONFIG
# -----------------------------------------------------------------------------

# We read RUNWARE_API_KEY directly from environment
RUNWARE_API_KEY = os.getenv("RUNWARE_API_KEY")
RUNWARE_ENABLED = bool(RUNWARE_API_KEY)
if not RUNWARE_ENABLED:
    logging.warning("RUNWARE_API_KEY is not set. Runware endpoints will be disabled.")

# Load the unified config + schema
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "runware-item-icons.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    PIPELINE_CONFIG = json.load(f)

RUNWARE_API_URL: str = PIPELINE_CONFIG["runwareApiUrl"]
DEFAULTS: Dict[str, Any] = PIPELINE_CONFIG["defaults"]
SCHEMA: Dict[str, Any] = PIPELINE_CONFIG.get("schema", {})

RARITIES: Dict[str, Any] = SCHEMA.get("rarities", {})
ELEMENTS: Dict[str, Any] = SCHEMA.get("elements", {})
BIOMES: Dict[str, Any] = SCHEMA.get("biomes", {})
STYLES: Dict[str, Any] = SCHEMA.get("styles", {})
CATEGORIES: Dict[str, Any] = SCHEMA.get("categories", {})
LORA_PACKS: Dict[str, Any] = SCHEMA.get("loraPacks", {})

# -----------------------------------------------------------------------------
# FASTAPI SETUP
# -----------------------------------------------------------------------------

app = FastAPI(title="Item Icon Generator — Western Animation Preset System")
app.include_router(jobs_api.router)
app.include_router(movies_api.router)
app.include_router(llm_db_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080"
        # SECURITY: Do not allow "null" or "file://" origins here when allow_credentials=True.
        # Allowing "null" allows sandboxed iframes to completely bypass CORS.
        # Allowing "file://" introduces local file inclusion and SSRF risks.
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def init_sqlite_databases() -> None:
    movies_db.ensure_db()

# -----------------------------------------------------------------------------
# REQUEST / RESPONSE MODELS
# -----------------------------------------------------------------------------

class ItemIconRequest(BaseModel):
    seedImage: str
    assetDescription: str
    styleHint: Optional[str] = None
    useWesternAnimationBase: bool = True

    rarity: Optional[str] = "common"
    element: Optional[str] = "none"
    biome: Optional[str] = "none"
    style: Optional[str] = "western_animation_default"
    category: Optional[str] = "material"
    loraPack: Optional[str] = "none"


class ItemIconResponse(BaseModel):
    taskUUID: str
    imageURL: str
    rawResponse: Dict[str, Any]


# -----------------------------------------------------------------------------
# HTTP HELPER (NO "requests" LIBRARY)
# -----------------------------------------------------------------------------

def run_runware_tasks(tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Send tasks to Runware API using urllib (standard library only).
    Equivalent to:
      requests.post(RUNWARE_API_URL, headers=..., json=tasks)
    """
    body = json.dumps(tasks).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {RUNWARE_API_KEY}",
    }
    req = Request(RUNWARE_API_URL, data=body, headers=headers, method="POST")

    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
    except HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Runware API HTTP error {e.code}: {e.reason}"
        )
    except URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Runware API connection error: {e.reason}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Runware API unknown error: {e}"
        )

    if "data" not in data:
        raise HTTPException(status_code=502, detail=f"Runware API error: {data}")
    return data


# -----------------------------------------------------------------------------
# PRESET HELPERS
# -----------------------------------------------------------------------------

def _get_preset_block(preset_dict: Dict[str, Any], key: Optional[str]) -> Dict[str, Any]:
    if key and key in preset_dict:
        return preset_dict[key]
    if "none" in preset_dict:
        return preset_dict["none"]
    return {}


def _sanitize_prompt_fragment(value: Optional[str], max_length: int = 240) -> str:
    clean = " ".join((value or "").split())
    clean = re.sub(r"[\[\]{}<>`|]", " ", clean)
    clean = re.sub(r"[^0-9A-Za-z\s,.'()/_:+&-]", " ", clean)
    clean = re.sub(r"\s{2,}", " ", clean).strip(" ,")
    return clean[:max_length]


def build_lora_config_and_triggers(lora_pack_key: Optional[str]) -> (List[Dict[str, Any]], List[str]):
    """
    From a loraPack key, return:
      - list of Runware lora configs (model + weight)
      - list of trigger strings to append to the prompt
    """
    lora_configs: List[Dict[str, Any]] = []
    triggers: List[str] = []

    pack_key = lora_pack_key or "none"
    pack = LORA_PACKS.get(pack_key)
    if not pack:
        pack = LORA_PACKS.get("none", {"entries": []})

    entries = pack.get("entries", [])
    for entry in entries:
        air_model = entry.get("airModel")
        if not air_model:
            continue
        weight = entry.get("weight", 0.8)
        lora_configs.append({"model": air_model, "weight": weight})
        trigger = entry.get("trigger")
        if trigger:
            triggers.append(trigger)

    return lora_configs, triggers


@dataclass(frozen=True)
class PositivePromptConfig:
    asset_description: str
    rarity_key: Optional[str]
    element_key: Optional[str]
    biome_key: Optional[str]
    style_key: Optional[str]
    category_key: Optional[str]
    lora_triggers: List[str]
    style_hint: Optional[str]


def build_positive_prompt(
    config: PositivePromptConfig
) -> str:
    """
    Construct the positive prompt by combining:
    - Base template from defaults (with {assetDescription} filled)
    - Preset promptTags from rarity, element, biome, style, category
    - LoRA triggers
    - Optional user styleHint
    """
    base_template: str = DEFAULTS["prompts"]["basePositiveTemplate"]
    safe_asset_description = _sanitize_prompt_fragment(config.asset_description)
    prompt_base = base_template.replace("{assetDescription}", safe_asset_description)

    rarity_block = _get_preset_block(RARITIES, config.rarity_key)
    element_block = _get_preset_block(ELEMENTS, config.element_key)
    biome_block = _get_preset_block(BIOMES, config.biome_key)
    style_block = _get_preset_block(STYLES, config.style_key)
    category_block = _get_preset_block(CATEGORIES, config.category_key)

    rarity_tags = rarity_block.get("promptTags", "")
    element_tags = element_block.get("promptTags", "")
    biome_tags = biome_block.get("promptTags", "")
    style_tags = style_block.get("promptTags", "")
    category_tags = category_block.get("promptTags", "")

    parts: List[str] = [prompt_base]

    for extra in [
        category_tags,
        rarity_tags,
        element_tags,
        biome_tags,
        style_tags
    ]:
        if extra and extra.strip():
            parts.append(extra.strip())

    safe_style_hint = _sanitize_prompt_fragment(config.style_hint, max_length=160)
    if safe_style_hint:
        parts.append(safe_style_hint)

    if config.lora_triggers:
        parts.extend(trigger.strip() for trigger in config.lora_triggers if trigger.strip())

    parts.append("clean bold outlines, cel-shading, vibrant colors, professional illustration")

    return ", ".join([p for p in parts if p and p.strip()])


# -----------------------------------------------------------------------------
# ROUTES
# -----------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/schema")
def get_schema():
    """
    Return the schema block so the frontend can build dynamic preset dropdowns.
    """
    return SCHEMA


def _run_controlnet_preprocess(seed_image: str, workflow_id: str) -> tuple[str, Dict[str, Any]]:
    preprocess_task_uuid = f"pre-{workflow_id}"

    controlnet_preprocess_task = {
        "taskType": "controlNetPreprocess",
        "taskUUID": preprocess_task_uuid,
        "inputImage": seed_image,
        "preProcessorType": "canny",
        "height": DEFAULTS["height"],
        "width": DEFAULTS["width"],
        "lowThresholdCanny": 80,
        "highThresholdCanny": 200,
        "outputType": "URL",
        "outputFormat": "PNG"
    }

    preprocess_response = run_runware_tasks([controlnet_preprocess_task])
    pre_items = [d for d in preprocess_response["data"] if d.get("taskUUID") == preprocess_task_uuid]
    if not pre_items:
        raise HTTPException(status_code=502, detail="No preprocess result from Runware.")
    guide_image_url = pre_items[0].get("guideImageURL")
    if not guide_image_url:
        raise HTTPException(status_code=502, detail="Missing guideImageURL in preprocess response.")

    return guide_image_url, preprocess_response

@dataclass(frozen=True)
class InferenceConfig:
    workflow_id: str
    positive_prompt: str
    negative_prompt: str
    model_air: str
    controlnet_cfg: Dict[str, Any]
    guide_image_url: str
    lora_configs: List[Dict[str, Any]]

def _run_image_inference(
    config: InferenceConfig
) -> tuple[str, Dict[str, Any]]:
    controlnet_obj = {
        "model": config.controlnet_cfg["model"],
        "guideImage": config.guide_image_url,
        "weight": config.controlnet_cfg["weight"],
        "startStep": config.controlnet_cfg["startStep"],
        "endStep": config.controlnet_cfg["endStep"],
        "controlMode": config.controlnet_cfg["controlMode"]
    }

    inference_task_uuid = f"ii-{config.workflow_id}"

    image_inference_task: Dict[str, Any] = {
        "taskType": "imageInference",
        "taskUUID": inference_task_uuid,
        "outputType": "URL",
        "outputFormat": "PNG",
        "positivePrompt": config.positive_prompt,
        "negativePrompt": config.negative_prompt,
        "height": DEFAULTS["height"],
        "width": DEFAULTS["width"],
        "steps": DEFAULTS["steps"],
        "CFGScale": DEFAULTS["cfgScale"],
        "model": config.model_air,
        "numberResults": DEFAULTS["numberResults"],
        "controlNet": [controlnet_obj]
    }

    if config.lora_configs:
        image_inference_task["lora"] = config.lora_configs

    inference_response = run_runware_tasks([image_inference_task])
    inference_items = [d for d in inference_response["data"] if d.get("taskUUID") == inference_task_uuid]
    if not inference_items:
        raise HTTPException(status_code=502, detail="No imageInference result from Runware.")

    image_item = inference_items[0]
    image_url = image_item.get("imageURL") or image_item.get("imageUrl")
    if not image_url:
        raise HTTPException(status_code=502, detail="Missing imageURL in imageInference response.")

    return image_url, inference_response



def _build_prompts(req: ItemIconRequest, lora_triggers: List[str]) -> tuple[str, str]:
    prompt_config = PositivePromptConfig(
        asset_description=req.assetDescription,
        rarity_key=req.rarity,
        element_key=req.element,
        biome_key=req.biome,
        style_key=req.style,
        category_key=req.category,
        lora_triggers=lora_triggers,
        style_hint=req.styleHint,
    )
    positive_prompt = build_positive_prompt(prompt_config)
    negative_prompt: str = DEFAULTS["prompts"]["baseNegative"]
    return positive_prompt, negative_prompt


def _get_base_model(use_western_animation_base: bool) -> str:
    base_model_block = DEFAULTS["baseModel"]
    if use_western_animation_base:
        return base_model_block["airWesternAnimBase"]
    return base_model_block["airBaseModel"]


@app.post("/api/item-icon", response_model=ItemIconResponse)
def generate_item_icon(req: ItemIconRequest):
    if not RUNWARE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Runware integration is not configured. Set RUNWARE_API_KEY to enable this endpoint.",
        )

    workflow_id = str(uuid.uuid4())

    # -------------------------------------------------------------------------
    # 1) ControlNet Preprocess (Canny edges)
    # -------------------------------------------------------------------------
    guide_image_url, preprocess_response = _run_controlnet_preprocess(req.seedImage, workflow_id)

    # -------------------------------------------------------------------------
    # 2) LoRA configs + triggers
    # -------------------------------------------------------------------------
    lora_configs, lora_triggers = build_lora_config_and_triggers(req.loraPack)

    # -------------------------------------------------------------------------
    # 3) Prompts
    # -------------------------------------------------------------------------
    positive_prompt, negative_prompt = _build_prompts(req, lora_triggers)

    # -------------------------------------------------------------------------
    # 4) Base model
    # -------------------------------------------------------------------------
    model_air = _get_base_model(req.useWesternAnimationBase)

    # -------------------------------------------------------------------------
    # 5/6) ImageInference task (with ControlNet)
    # -------------------------------------------------------------------------
    controlnet_cfg = DEFAULTS["controlNet"]
    inference_cfg = InferenceConfig(
        workflow_id=workflow_id,
        positive_prompt=positive_prompt,
        negative_prompt=negative_prompt,
        model_air=model_air,
        controlnet_cfg=controlnet_cfg,
        guide_image_url=guide_image_url,
        lora_configs=lora_configs
    )
    image_url, inference_response = _run_image_inference(inference_cfg)

    raw_combined = {
        "preprocess": preprocess_response,
        "inference": inference_response
    }

    return ItemIconResponse(
        taskUUID=workflow_id,
        imageURL=image_url,
        rawResponse=raw_combined
    )
