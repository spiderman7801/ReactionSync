class ReactionEngine {
    constructor() {
        this.videoBase = document.getElementById('videoBase');
        this.videoReact = document.getElementById('videoReact');
        this.masterSeek = document.getElementById('mainSeek');
        this.setupModal = document.getElementById('setupModal');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.delayDisplay = document.getElementById('delayDisplay');
        
        this.reactDelay = 0;
        this.isSyncing = false;
        this.subOffset = 0;
        this.rawSubtitleText = "";

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPIPInteractions();
        this.startSyncLoop();
        console.log("Reaction Engine Initialized");
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        
        // --- FIX: Click to Browse ---
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = "video/*,.srt,.vtt"; // Hint to browser
            input.onchange = (e) => this.handleFiles(Array.from(e.target.files));
            input.click();
        });

        // --- FIX: Drag and Drop Prevention ---
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFiles(Array.from(files));
        }, false);

        // UI Controls
        document.getElementById('playPause').onclick = () => this.togglePlay();
        document.getElementById('syncNow').onclick = () => this.setSyncPoint();
        document.getElementById('toggleSettings').onclick = () => this.settingsPanel.classList.toggle('hidden');
        document.getElementById('vOffset').oninput = (e) => {
            this.videoBase.style.transform = `translateY(${e.target.value}%)`;
        };

        // Launch Button
        document.getElementById('startProject').onclick = () => {
            this.setupModal.classList.add('hidden');
            this.isSyncing = true;
            this.videoBase.play();
            this.videoReact.play();
        };

        document.addEventListener('keydown', (e) => this.handleHotkeys(e));
    }

    handleFiles(files) {
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            const name = file.name.toLowerCase();

            if (name.match(/\.(mp4|mkv|webm|mov|avi)$/i)) {
                // Heuristic: If name contains 'react' or 'comm', it's the reaction
                if (name.includes('react') || name.includes('comm')) {
                    this.videoReact.src = url;
                    this.updateFileStatus('reactStatus', true);
                    this.parseAutoDelay(file.name);
                } else {
                    this.videoBase.src = url;
                    this.updateFileStatus('baseStatus', true);
                }
            } else if (name.endsWith('.srt') || name.endsWith('.vtt')) {
                file.text().then(text => {
                    this.rawSubtitleText = text;
                    this.renderSubtitles();
                });
            }
        });

        if (this.videoBase.src && this.videoReact.src) {
            document.getElementById('startProject').disabled = false;
        }
    }

    updateFileStatus(id, active) {
        const el = document.getElementById(id);
        el.style.color = active ? '#4ade80' : '#f87171';
        const icon = el.querySelector('i');
        icon.className = active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
    }

    // ... (rest of the helper functions from previous build)
    togglePlay() {
        if (this.videoBase.paused) {
            this.videoBase.play();
            this.videoReact.play();
        } else {
            this.videoBase.pause();
            this.videoReact.pause();
        }
    }

    startSyncLoop() {
        const loop = () => {
            if (this.isSyncing && !this.videoBase.paused) {
                const targetReactTime = this.videoBase.currentTime + this.reactDelay;
                if (Math.abs(this.videoReact.currentTime - targetReactTime) > 0.1) {
                    this.videoReact.currentTime = targetReactTime;
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
    
    // Additional methods for delay, sync point, etc would follow here
}

window.onload = () => { window.engine = new ReactionEngine(); };
