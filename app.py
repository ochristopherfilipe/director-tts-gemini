from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from diretor_tts import process_tts_workflow
import os

app = FastAPI(title="Gemini TTS Director")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# Monta pastas estaticas e de outputs publicas
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/api/generate")
async def generate_audio(text: str = Form(...), api_key: str = Form(None)):
    try:
        # Se vazio na GUI passa "" no param api_key
        key_to_pass = api_key if api_key and api_key.strip() else None
        resultado = process_tts_workflow(texto_bruto=text, api_key=key_to_pass)
        return JSONResponse(content=resultado)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config")
async def get_config():
    # Retorna as vozes e tags reais disponíveis
    import json
    with open("config_tts.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return JSONResponse(content=data)

# Servindo o index.html na raiz
from fastapi.responses import FileResponse
@app.get("/")
def read_root():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
