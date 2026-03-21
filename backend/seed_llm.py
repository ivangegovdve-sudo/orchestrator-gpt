from backend.llm_db.api import process_ingestion
urls_to_seed = [
    {"name": "LangChain Docs", "url": "https://docs.langchain.com/llms.txt"},
    {"name": "Base44 Docs", "url": "https://docs.base44.com/llms.txt"},
    {"name": "Deepagents Readme",
     "url": "https://github.com/langchain-ai/deepagents/blob/main/README.md"},

    {"name": "Deepagents Overview",
     "url": "https://docs.langchain.com/oss/python/deepagents/overview"},

    {"name": "Twin Docs", "url": "https://docs.twin.so/llms.txt"},
    {"name": "StackAI Docs", "url": "https://docs.stackai.com/llms.txt"}
]
print("Starting ingestion for LLM DB...")
for item in urls_to_seed:
    print(f"Ingesting {item['name']} - {item['url']}")
    try:
        process_ingestion(item["url"], item["name"])
        print(f"Finished {item['name']}")
    except Exception as e:
        print(f"Error ingesting {item['name']}: {e}")
print("Seeding complete.")
