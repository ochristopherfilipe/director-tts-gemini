import os
import json
import wave
import sys
import datetime
from dotenv import load_dotenv

# Carrega a API Key do .env
load_dotenv()
if not os.environ.get("GEMINI_API_KEY"):
    print("ERRO: GEMINI_API_KEY não encontrada no arquivo .env")
    sys.exit(1)

from google import genai
from google.genai import types

def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
    """Salva os bytes PCM em arquivo wav."""
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)

def read_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()

def get_api_client(api_key: str = None):
    api_key_to_use = api_key if api_key else os.environ.get("GEMINI_API_KEY")
    if not api_key_to_use:
        raise ValueError("Chave de API não informada e não encontrada no .env")
    return genai.Client(api_key=api_key_to_use)

def generate_llm_script(texto_bruto: str, api_key: str = None):
    client = get_api_client(api_key)
    config_data = json.loads(read_file("config_tts.json"))
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.join("outputs", timestamp)
    os.makedirs(output_dir, exist_ok=True)
    
    director_prompt = f"""
    {config_data['system_prompt']}
    
    VOZES DISPONÍVEIS:
    {json.dumps(config_data['voices'], ensure_ascii=False, indent=2)}
    
    TAGS DISPONÍVEIS:
    {json.dumps(config_data['tags'], ensure_ascii=False, indent=2)}
    
    TEXTO BRUTO A SER ROTEIRIZADO:
    <texto_bruto>
    {texto_bruto}
    </texto_bruto>
    
    RETORNE ESTRITAMENTE UM JSON NO SEGUINTE FORMATO:
    {{
      "characters": [
         {{"speaker": "Narrador_Ator1", "voiceName": "NomeDaVozMasculina_ou_Feminina"}},
         {{"speaker": "Atriz2", "voiceName": "NomeDaVozFeminina_ou_Masculina"}} 
      ],
      "script": "Narrador_Ator1: [serious] Texto da narração exato...\\nAtriz2: [crying] Texto exato da fala..."
    }}
    REGRAS CRÍTICAS:
    1. Você precisará de EXATAMENTE 2 LOCUTORES no JSON, nem mais nem menos. Se a história tiver um Narrador e 2 personagens (ex: total 3 vozes), agrupe-os! Ex: Uma atriz narra a história e faz as vozes femininas (Locutor 1), enquanto o ator faz as vozes masculinas (Locutor 2).
    2. ESCOLHA LOCUTORES ADEQUADOS AOS GÊNEROS (veja as descrições se é Masculina ou Feminina para não colocar voz de mulher num personagem homem e vice-versa).
    3. PRESERVE O TEXTO 100%. Mantenha o texto bruto *exatamente* igual ao original, palavra por palavra, inclusive as narrações. Nunca resuma, não corte trechos e não modifique a linha do autor. Insira as [tags] emocionais antes das frases no script para ditar a atuação. A narração faz parte da história e deve ser inclusa no script narrada pelo personagem correspondente.
    """
    
    from pydantic import BaseModel
    class Character(BaseModel):
        speaker: str
        voiceName: str

    class ScriptResponse(BaseModel):
        characters: list[Character]
        script: str

    response_llm = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents=director_prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ScriptResponse,
            temperature=0.7
        )
    )
    
    directorOutput = json.loads(response_llm.text)
    if not directorOutput["script"].strip():
        raise Exception("O roteiro gerado está vazio.")
        
    return {
        "status": "success",
        "output_dir": output_dir,
        "characters": directorOutput["characters"],
        "script": directorOutput["script"]
    }

def generate_tts_audio(script_data: dict, output_dir: str, api_key: str = None, tts_model: str = "gemini-3.1-flash-tts-preview"):
    client = get_api_client(api_key)
    
    # Salva o roteiro (agora editado pelo usuário)
    with open(os.path.join(output_dir, "roteiro_gerado.json"), "w", encoding="utf-8") as f:
        json.dump(script_data, f, ensure_ascii=False, indent=4)
        
    speaker_configs = []
    for char in script_data["characters"]:
        speaker_configs.append(
            types.SpeakerVoiceConfig(
                speaker=char["speaker"],
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=char["voiceName"]
                    )
                )
            )
        )
    
    speaker_names = [char["speaker"] for char in script_data["characters"]]
    names_str = " and ".join(speaker_names)
    script_prompt = f"TTS the following conversation between {names_str}:\n\n{script_data['script']}"
    
    try:
        response_audio = client.models.generate_content(
            model=tts_model,
            contents=script_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                        speaker_voice_configs=speaker_configs
                    )
                )
            )
        )
    except Exception as api_err:
        raise Exception(f"Falha na API TTS ({tts_model}): {api_err}")
    
    data = response_audio.candidates[0].content.parts[0].inline_data.data
    wav_path = os.path.join(output_dir, "audio_final.wav")
    wave_file(wav_path, data)
    
    return {
        "audio_url": f"/{wav_path}",
        "json_url": f"/{os.path.join(output_dir, 'roteiro_gerado.json')}",
        "script": script_data['script'],
        "output_dir": output_dir
    }

if __name__ == "__main__":
    texto_bruto = read_file("texto.txt")
    process_tts_workflow(texto_bruto)
