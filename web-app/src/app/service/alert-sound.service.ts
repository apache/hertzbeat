import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlertSoundService {
  private audio: HTMLAudioElement;
  private isPlaying = false;

  constructor() {
    this.audio = new Audio();
    this.audio.src = '/assets/audio/default-alert.mp3';
    this.audio.load();
  }

  playAlertSound(): void {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.audio.volume = 1.0;
      this.audio
        .play()
        .catch(error => {
          console.error('Failed to play sound:', error);
        })
        .finally(() => {
          this.isPlaying = false;
        });
    }
  }
}
