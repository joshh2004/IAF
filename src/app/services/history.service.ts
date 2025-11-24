import { Injectable } from '@angular/core';

export interface HistoryEntry {
  type: 'excel' | 'video';
  fileName: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {

  private history: HistoryEntry[] = [];

  addEntry(entry: HistoryEntry) {
    this.history.push(entry);
    this.saveToLocal();
  }

  getHistory(): HistoryEntry[] {
    return this.history;
  }

  loadFromLocal() {
    const data = localStorage.getItem('upload_history');
    if (data) {
      this.history = JSON.parse(data);
    }
  }

  private saveToLocal() {
    localStorage.setItem('upload_history', JSON.stringify(this.history));
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('upload_history');
  }
  deleteEntry(index: number) {
    this.history.splice(index, 1);
    this.saveToLocal();
  }
  
}
