import { Component, OnInit } from '@angular/core';
import { HistoryService, HistoryEntry } from '../services/history.service';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-history',
  standalone: true,             // ✅ REQUIRED FOR ROUTING
  imports: [CommonModule, DatePipe, UpperCasePipe],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {

  historyList: HistoryEntry[] = [];

  constructor(private historyService: HistoryService) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.historyService.loadFromLocal();
    this.historyList = [...this.historyService.getHistory()]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  deleteEntry(index: number) {
    this.historyService.deleteEntry(index);
    this.loadHistory();
  }

  clearAll() {
    this.historyService.clearHistory();
    this.historyList = [];
  }
}
