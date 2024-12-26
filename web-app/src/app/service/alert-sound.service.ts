import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlertSoundService {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
    this.audio.src = '/assets/audio/default-alert-CN.mp3';
    this.audio.load();
  }

  playAlertSound(lang: string): void {
    if (lang === 'zh-CN' || lang === 'zh-TW') {
      this.audio.src = '/assets/audio/default-alert-CN.mp3';
    } else {
      this.audio.src = '/assets/audio/default-alert-EN.mp3';
    }

    this.audio.load();
    this.audio.play().catch(error => {
      console.warn('Failed to play alert sound:', error);
    });
  }
}
