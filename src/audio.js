export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgm = null;
        this.buffers = {};
        this.loadSound('grab', 'sfx_grab.mp3');
        this.loadSound('caught', 'sfx_caught.mp3');
        this.loadSound('bgm', 'bgm_caper.mp3');
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
        } catch (e) {
            console.error('Audio load error', e);
        }
    }

    play(name, loop = false, volume = 1.0) {
        if (!this.buffers[name]) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = loop;
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);
        return source;
    }

    playBGM() {
        if (this.bgm) this.stopBGM();
        this.bgm = this.play('bgm', true, 0.4);
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.stop();
            this.bgm = null;
        }
    }

    playGrab() { this.play('grab', false, 0.8); }
    playCaught() { this.play('caught', false, 1.0); }
}

