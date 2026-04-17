document.addEventListener("DOMContentLoaded", () => {
    // Configurações e Estado
    const themeToggle = document.getElementById("themeToggle");
    const textArea = document.getElementById("textoBruto");
    const charCount = document.getElementById("charCount");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const ttsModelSelect = document.getElementById("ttsModelSelect");
    
    // Stages e Painéis
    const stage1 = document.getElementById("stage1");
    const stage2 = document.getElementById("stage2");
    const loadingHUD = document.getElementById("loadingHUD");
    const outputContainer = document.getElementById("outputContainer");
    
    // Controles Stage 1 -> 2
    const btnGenerateScript = document.getElementById("btnGenerateScript");
    const btnBackToStage1 = document.getElementById("btnBackToStage1");
    const scriptEditArea = document.getElementById("scriptEditArea");
    const charactersConfigMap = document.getElementById("charactersConfigMap");
    
    // Controles Stage 2 -> Output
    const btnGenerateAudio = document.getElementById("btnGenerateAudio");
    
    // Player
    const audioPlayer = document.getElementById("audioPlayer");
    const btnPlayAudio = document.getElementById("btnPlayAudio");
    const btnDownloadJson = document.getElementById("btnDownloadJson");
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");

    // Ajuda (Help Tab)
    const btnTabVozes = document.getElementById("btnTabVozes");
    const btnTabTags = document.getElementById("btnTabTags");
    const vozesHelpList = document.getElementById("vozesHelpList");
    const tagsHelpList = document.getElementById("tagsHelpList");

    // Estado da Aplicação
    let currentOutputDir = null;
    let globalConfig = null;

    // Lógica do Theme
    document.body.classList.remove("dark-mode");
    themeToggle.addEventListener("change", () => {
        if (themeToggle.checked) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    });

    // Contador de Caracteres
    textArea.addEventListener("input", () => {
        charCount.innerText = `${textArea.value.length} CHR / MAX`;
    });

    // Fetcha vozes do backend p/ Ajuda (config_tts.json)
    async function loadHelpCenter() {
        try {
            const res = await fetch("/api/config");
            globalConfig = await res.json();
            
            // Popula Voice List Panel
            vozesHelpList.innerHTML = "";
            globalConfig.voices.forEach(voice => {
                const doc = document.createElement('div');
                doc.style.cssText = "padding: 10px; border: 1px solid var(--hud-border); border-radius: 6px; background: rgba(0,0,0,0.05);";
                doc.innerHTML = `
                    <div style="font-weight:600; font-family:var(--ui-font); color:var(--accent-neon);">${voice.name}</div>
                    <div style="font-family:var(--mono-font); font-size:0.7rem; color:var(--text-muted); margin-top:4px;">${voice.description}</div>
                `;
                vozesHelpList.appendChild(doc);
            });

            // Popula Tags Panel (com descrições)
            tagsHelpList.innerHTML = "";
            globalConfig.tags.forEach(item => {
                const tagName = typeof item === 'object' ? item.tag : item;
                const tagDesc = typeof item === 'object' ? item.description : '';
                const doc = document.createElement('div');
                doc.style.cssText = "padding: 10px; border: 1px solid var(--hud-border); border-radius: 6px; background: rgba(0,0,0,0.05);";
                doc.innerHTML = `
                    <div style="font-weight:600; font-family:var(--mono-font); color:var(--accent-neon); font-size:0.85rem;">${tagName}</div>
                    ${tagDesc ? `<div style="font-family:var(--ui-font); font-size:0.7rem; color:var(--text-muted); margin-top:4px; line-height:1.4;">${tagDesc}</div>` : ''}
                `;
                tagsHelpList.appendChild(doc);
            });
        } catch (e) {
            console.error("Falha ao carregar ajuda: ", e);
        }
    }
    loadHelpCenter();

    // Lógica de Tabs na Ajuda
    btnTabVozes.addEventListener("click", () => {
        btnTabVozes.classList.add("active");
        btnTabVozes.style.background = "var(--hud-border)";
        btnTabTags.classList.remove("active");
        btnTabTags.style.background = "transparent";
        vozesHelpList.classList.remove("hidden");
        tagsHelpList.classList.add("hidden");
    });

    btnTabTags.addEventListener("click", () => {
        btnTabTags.classList.add("active");
        btnTabTags.style.background = "var(--hud-border)";
        btnTabVozes.classList.remove("active");
        btnTabVozes.style.background = "transparent";
        tagsHelpList.classList.remove("hidden");
        vozesHelpList.classList.add("hidden");
    });
    
    // Inicia tabs (Vozes = Active visual base)
    btnTabVozes.style.background = "var(--hud-border)";
    btnTabTags.style.background = "transparent";

    // Lógica Voltar
    btnBackToStage1.addEventListener("click", () => {
        stage2.classList.add("hidden");
        stage1.classList.remove("hidden");
    });

    // Utility Loading
    let interval;
    function startLoading(text) {
        document.querySelector('.progress-text').innerHTML = `${text} <span id="progressPercent">0%</span>`;
        loadingHUD.classList.remove("hidden");
        const progressP = document.getElementById("progressPercent");
        let percentage = 0;
        progressFill.style.width = "0%";
        progressP.innerText = "0%";
        interval = setInterval(() => {
            if(percentage < 90) {
                percentage += Math.floor(Math.random() * 5);
                if(percentage > 90) percentage = 90;
                progressFill.style.width = percentage + "%";
                progressP.innerText = percentage + "%";
            }
        }, 300);
    }
    
    function stopLoading() {
        clearInterval(interval);
        progressFill.style.width = "100%";
        document.getElementById("progressPercent").innerText = "100%";
        setTimeout(() => loadingHUD.classList.add("hidden"), 300);
    }

    // PASSO 1: Gerar Roteiro
    btnGenerateScript.addEventListener("click", async () => {
        const text = textArea.value.trim();
        if (!text) {
            alert("Insira o roteiro original na área de texto primeiro.");
            return;
        }

        startLoading("ANALISANDO INTENÇÕES DO TEXTO");
        btnGenerateScript.disabled = true;

        const formData = new FormData();
        formData.append("text", text);
        if(apiKeyInput.value.trim() !== '') {
            formData.append("api_key", apiKeyInput.value.trim());
        }

        try {
            const res = await fetch("/api/generate_script", { method: "POST", body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Erro desconhecido");
            }
            const data = await res.json();
            
            // Sucesso: Migrar UI pro Step 2
            currentOutputDir = data.output_dir;
            scriptEditArea.value = data.script;

            // Renderizar Mapa de Personagens x Vozes Dinâmico
            charactersConfigMap.innerHTML = "";
            data.characters.forEach((char, inc) => {
                let optionsHtml = globalConfig.voices.map(v => 
                    `<option value="${v.name}" ${v.name === char.voiceName ? 'selected' : ''}>${v.name}</option>`
                ).join("");

                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex; align-items:center; gap:5px;";
                wrap.innerHTML = `
                    <span class="hud-label" style="font-weight:bold">${char.speaker}:</span>
                    <select id="charSelectorId_${inc}" data-speaker="${char.speaker}" class="hud-input" style="padding: 2px 5px; border-radius:3px;">
                        ${optionsHtml}
                    </select>
                `;
                charactersConfigMap.appendChild(wrap);
            });

            stage1.classList.add("hidden");
            stage2.classList.remove("hidden");
            
        } catch (e) {
            alert("Erro na roteirização LLM:\n" + e.message);
        } finally {
            stopLoading();
            btnGenerateScript.disabled = false;
        }
    });

    // PASSO 2: Sintetizar Áudio
    btnGenerateAudio.addEventListener("click", async () => {
        const scriptFinalTexto = scriptEditArea.value.trim();
        if (!scriptFinalTexto) return;

        startLoading("SINTETIZANDO ÁUDIO MULILOCUTOR (TTS)");
        btnGenerateAudio.disabled = true;
        outputContainer.classList.add("hidden");

        // Recolher a formação nova dos characters dos Dropdowns
        const newCharacters = [];
        const selects = charactersConfigMap.querySelectorAll("select[data-speaker]");
        selects.forEach(sel => {
            newCharacters.push({
                speaker: sel.getAttribute("data-speaker"),
                voiceName: sel.value
            });
        });

        // Montar dict final
        const scriptData = {
            characters: newCharacters,
            script: scriptFinalTexto
        };

        const formData = new FormData();
        formData.append("script_data", JSON.stringify(scriptData));
        formData.append("output_dir", currentOutputDir);
        formData.append("tts_model", ttsModelSelect.value);
        
        if(apiKeyInput.value.trim() !== '') {
            formData.append("api_key", apiKeyInput.value.trim());
        }

        try {
            const res = await fetch("/api/generate_audio", { method: "POST", body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Erro desconhecido");
            }
            const data = await res.json();
            
            // Apresentar Output
            audioPlayer.src = data.audio_url;
            btnDownloadJson.href = data.json_url;
            outputContainer.classList.remove("hidden");

        } catch (e) {
            alert("Erro na sintetização de áudio:\n" + e.message);
        } finally {
            stopLoading();
            btnGenerateAudio.disabled = false;
        }
    });

    // Controles do Audio Player Custom
    btnPlayAudio.addEventListener("click", () => {
        if(audioPlayer.paused) {
            audioPlayer.play();
            btnPlayAudio.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause
        } else {
            audioPlayer.pause();
            btnPlayAudio.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; // Play
        }
    });

    audioPlayer.addEventListener("ended", () => {
        btnPlayAudio.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    });
});
