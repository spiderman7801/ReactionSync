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
        this.setupGlobalDragDrop();
        this.setupEventListeners();
        this.setupPIPInteractions();
        this.startSyncLoop();
        console.log("Reaction Engine: Ready for files.");
    }

    // --- FIX 1: Hijack the entire window to prevent "opening" files ---
    setupGlobalDragDrop() {
        window.addEventListener("dragover", (e) => e.preventDefault(), false);
        window.addEventListener("drop", (e) => e.preventDefault(), false);
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        
        // --- FIX 2: More reliable click-to-browse ---
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = "video/*,.srt,.vtt"; 
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.handleFiles(Array.from(e.target.files));
                }
            };
            input.click();
        });

        // Handle specific drop zone events
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFiles(Array.from(files));
            }
        });

        // Master UI Controls
        document.getElementById('playPause').onclick = () => this.togglePlay();
        document.getElementById('syncNow').onclick = () => this.setSyncPoint();
        document.getElementById('toggleSettings').onclick = () => this.settingsPanel.classList.toggle('hidden');
        
        document.getElementById('startProject').onclick = () => {
            this.setupModal.classList.add('hidden');
            this.isSyncing = true;
            // Interaction to unlock audio
            this.videoBase.play().catch(e => console.log("Autoplay blocked, waiting for user."));
            this.videoReact.play().catch(e => console.log("Autoplay blocked."));
        };

        document.addEventListener('keydown', (e) => this.handleHotkeys(e));
    }

    handleFiles(files) {
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            const name = file.name.toLowerCase();

            // Video detection
            if (name.match(/\.(mp4|mkv|webm|mov|avi)$/i)) {
                // Heuristic: Check if user named it "react" or similar
                if (name.includes('react') || name.includes('comm')) {
                    this.videoReact.src = url;
                    this.videoReact.load();
                    this.updateFileStatus('reactStatus', true);
                    this.parseAutoDelay(file.name);
                } else {
                    this.videoBase.src = url;
                    this.videoBase.load();
                    this.updateFileStatus('baseStatus', true);
                }
            } 
            // Subtitle detection
            else if (name.endsWith('.srt') || name.endsWith('.vtt')) {
                file.text().then(text => {
                    this.rawSubtitleText = text;
                    this.renderSubtitles();
                });
            }
        });

        // Unlock Launch Button
        if (this.videoBase.src && this.videoReact.src) {
            const startBtn = document.getElementById('startProject');
            startBtn.disabled = false;
            startBtn.style.background = "#3b82f6"; // Visual feedback
        }
    }

    updateFileStatus(id, active) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = active ? '#4ade80' : '#f87171';
        const icon = el.querySelector('i');
        if (icon) icon.className = active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
    }

    togglePlay() {
        if (this.videoBase.paused) {
            this.videoBase.play();
            this.videoReact.play();
        } else {
            this.videoBase.pause();
            this.videoReact.pause();
        }
    }

    setSyncPoint() {
        this.reactDelay = this.videoReact.currentTime - this.videoBase.currentTime;
        this.delayDisplay.innerText = `${this.reactDelay.toFixed(2)}s`;
    }

    startSyncLoop() {
        const loop = () => {
            if (this.isSyncing && !this.videoBase.paused) {
                const targetTime = this.videoBase.currentTime + this.reactDelay;
                const drift = Math.abs(this.videoReact.currentTime - targetTime);
                if (drift > 0.1) {
                    this.videoReact.currentTime = targetTime;
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    setupPIPInteractions() {
        // Ensure interact.js is loaded in index.html for this to work
        if (typeof interact !== 'undefined') {
            interact('#pipContainer').draggable({
                listeners: {
                    move(event) {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                }
            });
        }
    }

    parseAutoDelay(filename) {
        const match = filename.match(/\.dt(\d+)/);
        if (match) {
            this.reactDelay = parseFloat(match[1]) / 10;
            this.delayDisplay.innerText = `${this.reactDelay.toFixed(2)}s`;
        }
    }

    handleHotkeys(e) {
        if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
        if (e.code === 'KeyS') this.setSyncPoint();
    }
}

window.onload = () => { window.engine = new ReactionEngine(); };
