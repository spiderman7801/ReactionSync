/**
 * Full Reaction Pro - Sync Engine v2.0
 * Includes Dynamic Subtitle Offsetting
 */

class ReactionEngine {
    constructor() {
        this.videoBase = document.getElementById('videoBase');
        this.videoReact = document.getElementById('videoReact');
        this.masterSeek = document.getElementById('mainSeek');
        
        // State
        this.reactDelay = 0;
        this.isSyncing = false;
        this.subOffset = 0;
        this.rawSubtitleText = ""; // To allow re-parsing with new offsets

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPIPInteractions();
        this.startSyncLoop();
    }

    setupEventListeners() {
        // ... (Previous event listeners remain the same) ...
        
        document.getElementById('dropZone').onclick = () => this.triggerFilePicker();
        document.getElementById('playPause').onclick = () => this.togglePlay();
        document.getElementById('syncNow').onclick = () => this.setSyncPoint();
        document.getElementById('toggleSettings').onclick = () => this.settingsPanel.classList.toggle('hidden');

        // Subtitle Specific Listeners
        document.getElementById('subDelay').oninput = (e) => {
            this.subOffset = parseFloat(e.target.value);
            if (this.rawSubtitleText) this.renderSubtitles();
        };

        document.getElementById('changeSubs').onclick = () => this.triggerFilePicker('.srt,.vtt');
    }

    /**
     * Subtitle Engine: Converts SRT to VTT with dynamic time shifting
     */
    renderSubtitles() {
        // Remove existing tracks
        const oldTracks = this.videoBase.querySelectorAll('track');
        oldTracks.forEach(t => t.remove());

        let vttContent = "WEBVTT\n\n";
        const blocks = this.rawSubtitleText.split(/\r?\n\r?\n/);

        blocks.forEach(block => {
            const lines = block.split(/\r?\n/);
            if (lines.length >= 2) {
                const timeLine = lines.find(l => l.includes('-->'));
                if (timeLine) {
                    const shiftedTime = this.shiftVTTTime(timeLine, this.subOffset);
                    vttContent += `${shiftedTime}\n`;
                    // Add the actual text lines
                    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
                    vttContent += textLines.join('\n') + "\n\n";
                }
            }
        });

        const blob = new Blob([vttContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        const track = document.createElement('track');
        
        Object.assign(track, {
            kind: 'subtitles',
            label: 'English (Synced)',
            srclang: 'en',
            src: url,
            default: true
        });

        this.videoBase.appendChild(track);
    }

    shiftVTTTime(timeLine, offset) {
        return timeLine.replace(/(\d{2}:\d{2}:\d{2}[.,]\d{3})/g, (match) => {
            let [h, m, s] = match.replace(',', '.').split(':');
            let totalSeconds = parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
            totalSeconds = Math.max(0, totalSeconds + offset);
            
            return new Date(totalSeconds * 1000).toISOString().substr(11, 12).replace('.', ',');
        });
    }

    async handleFiles(files) {
        for (const file of files) {
            const name = file.name.toLowerCase();
            if (name.endsWith('.srt') || name.endsWith('.vtt')) {
                this.rawSubtitleText = await file.text();
                this.renderSubtitles();
            } else {
                // ... (Previous video handling logic) ...
            }
        }
    }

    // ... (Keep existing setupPIPInteractions, seek, and sync loop methods) ...
}