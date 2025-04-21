import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface LayoutItem {
  id: number;
  metrics: string;
  position: { x: number; y: number };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardLayoutService {
  private layoutKey = 'dashboard_layout';
  private layoutSubject = new BehaviorSubject<LayoutItem[]>([]);

  constructor() {
    this.loadLayout();
  }

  private loadLayout() {
    const savedLayout = localStorage.getItem(this.layoutKey);
    if (savedLayout) {
      this.layoutSubject.next(JSON.parse(savedLayout));
    }
  }

  saveLayout(items: LayoutItem[]) {
    localStorage.setItem(this.layoutKey, JSON.stringify(items));
    this.layoutSubject.next(items);
  }

  updateItemPosition(id: number, metrics: string, position: { x: number; y: number }) {
    const currentLayout = this.layoutSubject.value;
    const itemIndex = currentLayout.findIndex(item => item.id === id && item.metrics === metrics);

    if (itemIndex > -1) {
      currentLayout[itemIndex].position = position;
    } else {
      currentLayout.push({ id, metrics, position });
    }

    this.saveLayout(currentLayout);
  }

  getLayout() {
    return this.layoutSubject.asObservable();
  }
}
