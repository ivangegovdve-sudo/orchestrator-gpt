from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "null"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

client = TestClient(app)
response = client.options("/", headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "GET"})
print(response.headers)
response2 = client.options("/", headers={"Origin": "null", "Access-Control-Request-Method": "GET"})
print(response2.headers)
