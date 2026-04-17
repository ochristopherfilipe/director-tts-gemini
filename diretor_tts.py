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
    
    # Extrai apenas os nomes das tags para o prompt (novo formato objeto)
    tag_names = [t['tag'] if isinstance(t, dict) else t for t in config_data['tags']]
    
    director_prompt = (
        f"{config_data['system_prompt']}\n\n"
        f"VOZES DISPONÍVEIS:\n"
        f"{json.dumps(config_data['voices'], ensure_ascii=False, indent=2)}\n\n"
        f"TAGS DISPONÍVEIS PARA USAR NA TRANSCRIÇÃO:\n"
        f"{json.dumps(tag_names, ensure_ascii=False, indent=2)}\n\n"
        f"TEXTO BRUTO A SER ROTEIRIZADO:\n"
        f"<texto_bruto>\n{texto_bruto}\n</texto_bruto>\n\n"
        'RETORNE ESTRITAMENTE UM JSON NO SEGUINTE FORMATO:\n'
        '{\n'
        '  "characters": [\n'
        '     {"speaker": "Narrador_Ator1", "voiceName": "NomeDaVozMasculina_ou_Feminina"},\n'
        '     {"speaker": "Atriz2", "voiceName": "NomeDaVozFeminina_ou_Masculina"}\n'
        '  ],\n'
        '  "script": "# PERFIL DE ÁUDIO: Nome\\n## \\"Título\\"\\n\\n'
        '## A CENA: Local\\nDescrição da cena...\\n\\n'
        '### NOTAS DO DIRETOR\\nEstilo:\\n* Detalhe 1\\n* Detalhe 2\\n\\n'
        'Ritmo: Instruções...\\n\\nSotaque: Se aplicável...\\n\\n'
        '### CONTEXTO\\nContexto breve...\\n\\n'
        '#### TRANSCRIÇÃO\\nNarrador_Ator1: [serious] Texto exato...\\n'
        'Atriz2: [crying] Texto exato..."\n'
        '}\n\n'
        'REGRAS CRÍTICAS ADICIONAIS:\n'
        '1. O campo "script" DEVE conter o roteiro COMPLETO com TODAS as seções: '
        'PERFIL DE ÁUDIO, A CENA, NOTAS DO DIRETOR, CONTEXTO e TRANSCRIÇÃO.\n'
        '2. A seção "A CENA" deve ser criativa e baseada no contexto real do texto '
        '(identifique pessoas, locais, situações).\n'
        '3. As "NOTAS DO DIRETOR" devem ter instruções de Estilo, Ritmo e Sotaque '
        'que façam sentido para o tipo de texto.\n'
        '4. A seção "TRANSCRIÇÃO" deve conter TODO o texto original, palavra por '
        'palavra, com [tags] emocionais inseridas antes das frases.\n'
        '5. Use \\n para quebras de linha dentro do campo script do JSON.\n'
        '6. Você precisará de EXATAMENTE 2 LOCUTORES, nem mais nem menos. '
        'Agrupe se necessário.\n'
        '7. ESCOLHA LOCUTORES ADEQUADOS AOS GÊNEROS '
        '(veja as descrições se é Masculina ou Feminina).\n'
        '8. PRESERVE O TEXTO 100%. Nunca resuma, corte ou modifique o texto do autor.\n'
    )
    
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
