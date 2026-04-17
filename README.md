# Director TTS - Gemini AI (Cyber HUD Web)

Um orquestrador de áudio multilocutor construído sobre a **Gemini 3.1 Flash TTS Preview** da Google. O projeto transforma um texto bruto e não-formatado em uma conversa ou narrativa expressiva, identificando personagens, separando os gêneros e inserindo tags emocionais — tudo através da análise da Inteligência Artificial. 

A aplicação apresenta uma interface web de Painel de Controle Estilo "HUD Sci-Fi / Cyber Minimalista".

## 🚀 Como funciona?

1. **Agente Roteirista (LLM 2.5 Flash)**: O usuário insere um texto corrido. O sistema processa o texto estrito, mantendo todas as palavras inalteradas, e acopla personagens (Narradores, Femininos, Masculinos) atrelando-os a perfis técnicos pré-configurados do Gemini (Kore, Fenrir, etc).
2. **Diretor de Síntese (Gemini 3.1 TTS)**: O JSON compilado com tags emocionais (`[sarcastic]`, `[shouting]`, `[whispers]`) entra na Engine Multilocutora do Gemini TTS que gera narração atuada fiel aos gêneros de forma imersiva. 
3. **Frontend Sci-Fi Vanilla**: A UI foi concebida sob rigorosos padrões estéticos de ficção científica (Dark/Light Modes) exibindo métricas visuais gráficas e controles modulares limpos.

## 🛠 Arquitetura do Sistema

*   `app.py`: Servidor Asíncrono via **FastAPI** para ponte entre Web Interface e Modelos Generativos. Opera localmente.
*   `diretor_tts.py`: Módulo da lógica bruta da API Gemini (estruturador Pydantic e Conversor Audio/JSON).
*   `config_tts.json`: Banco de Dados de Personagens com especificações detalhadas de gêneros (garantindo que vozes femininas peguem personagens femininas) e tags.
*   `static/`: Contém a interface do usuário desenhada puramente via HTML5, CSS Flex/Grid e Javascript Vanilla. Nenhuma dependência pesada como React ou Vue é usada na UI para manter a latência de Render estática instantânea.

## ⚙️ Instalação e Configuração

### Pré-requisitos
*   [Python 3.9+](https://www.python.org/downloads/)
*   Chave de API do [Google AI Studio](https://aistudio.google.com/app/apikey)

### Passos

1. Clone o repositório:
   ```sh
   git clone https://github.com/ochristopherfilipe/director-tts-gemini.git
   cd director-tts-gemini
   ```

2. Instale as dependências usando PIP:
   ```sh
   pip install -r requirements.txt
   ```
   *(Dependências primárias: `google-genai`, `fastapi`, `uvicorn`, `python-multipart`, `pydantic` e `python-dotenv`)*.

3. Configuração de Chaves (Variáveis de Ambiente):
   Você pode colocar sua chave do Gemini DIRETAMENTE na Interface de Usuário no browser, OU criar um arquivo secreto na raiz do projeto chamado `.env`:
   ```env
   GEMINI_API_KEY=AIzaSy...suachave
   ```

## 🎧 Inicializando a Ferramenta

No terminal, apenas rode:

```sh
python3 app.py
```
*(Ele irá subir a instância usando o Uvicorn apontando para `0.0.0.0:8080`)*

Após ativado, acesse imediatamente no seu Mac/PC Browser:
**[http://localhost:8080](http://localhost:8080)**

## 🎮 Interface de Uso

1. **Light / Dark Theme:** Altere no topo do painel visual. 
2. **Text Board:** Cole qualquer tipo de texto original. Pode existir narração intercalando diálogos. 
3. **Regenerar:** Espere a barra de *loading* agir (e perceba o log numérico das esferas HUD reagindo). 
4. **Output Panel**: Pressione Play para validar as separações de trilhas. O Áudio WAV é salvo definitivamente na sua pasta oculta `/outputs/TIMESTAMP/` dentro da aplicação junto ao Script Transcrito cru para o seu arquivamento final.

---

> Desenvolvido primariamente usando Gemini 3 Flash SDK GenAI para arquitetamento via Prompt Engineering.
