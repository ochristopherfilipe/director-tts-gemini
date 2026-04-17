document.addEventListener("DOMContentLoaded", () => {
    // Configurações e Estado
    const themeToggle = document.getElementById("themeToggle");
    const textArea = document.getElementById("textoBruto");
    const charCount = document.getElementById("charCount");
    const btnGenerate = document.getElementById("btnGenerate");
    const apiKeyInput = document.getElementById("apiKeyInput");
    
    // UI Panels
    const loadingHUD = document.getElementById("loadingHUD");
    const outputContainer = document.getElementById("outputContainer");
    const scriptOutput = document.getElementById("scriptOutput");
    
    // Player
    const audioPlayer = document.getElementById("audioPlayer");
    const btnPlayAudio = document.getElementById("btnPlayAudio");
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");

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
    
    // (Voice Preview Removido da UI a pedido do usuário, painel substituído por HUD scanners geométricos.)

    // Lógica de Geração do Arquivo
    let interval;
    btnGenerate.addEventListener("click", async () => {
        const text = textArea.value.trim();
        if (!text) {
            alert("Insira o roteiro original na área de texto primeiro.");
            return;
        }

        // Reseta UX
        outputContainer.classList.add("hidden");
        loadingHUD.classList.remove("hidden");
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = "PROCESSANDO...";
        
        let percentage = 0;
        progressFill.style.width = "0%";
        progressPercent.innerText = "0%";

        // Falso loading para imersao visual enquanto o backend real processa a LLM e o TTS
        interval = setInterval(() => {
            if(percentage < 90) {
                percentage += Math.floor(Math.random() * 5);
                if(percentage > 90) percentage = 90;
                progressFill.style.width = percentage + "%";
                progressPercent.innerText = percentage + "%";
            }
        }, 300);

        // Prepara HTTP FormData
        const formData = new FormData();
        formData.append("text", text);
        if(apiKeyInput.value.trim() !== '') {
            formData.append("api_key", apiKeyInput.value.trim());
        }

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Erro desconhecido");
            }

            const data = await res.json();

            // Seta loading em 100%
            clearInterval(interval);
            progressFill.style.width = "100%";
            progressPercent.innerText = "100%";
            
            setTimeout(() => {
                loadingHUD.classList.add("hidden");
                outputContainer.classList.remove("hidden");
                
                // Popula o painel final
                scriptOutput.innerText = data.script;
                audioPlayer.src = data.audio_url;
                
                btnGenerate.disabled = false;
                btnGenerate.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    Regenerar
                `;
            }, 600);

        } catch (e) {
            clearInterval(interval);
            alert("Erro na sintetização:\n" + e.message);
            loadingHUD.classList.add("hidden");
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = "Regenerar";
        }
    });

    // Controles do Audio Player Custom
    btnPlayAudio.addEventListener("click", () => {
        if(audioPlayer.paused) {
            audioPlayer.play();
            btnPlayAudio.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause icon
        } else {
            audioPlayer.pause();
            btnPlayAudio.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
        }
    });

    audioPlayer.addEventListener("ended", () => {
        btnPlayAudio.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
    });
});
