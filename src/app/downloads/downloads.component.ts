import { Component } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-downloads',
  standalone: true,
  imports: [CommonModule, NgForOf, NgIf],   // ⬅ removed DatePipe
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.css']
})
export class DownloadsComponent {

  pdfList: any[] = [];

  constructor() {
    this.loadPdfs();
  }

  loadPdfs() {
    this.pdfList = JSON.parse(localStorage.getItem('downloadedPdfs') || '[]');
  }

  openPDF(file: any) {
    if (file.url) {
      window.open(file.url, "_blank");
    } else {
      alert("PDF file not available");
    }
  }

  deletePdf(index: number) {
    this.pdfList.splice(index, 1);
    localStorage.setItem('downloadedPdfs', JSON.stringify(this.pdfList));
  }

  clearAll() {
    if (confirm("Are you sure you want to clear all downloads?")) {
      this.pdfList = [];
      localStorage.removeItem('downloadedPdfs');
    }
  }
}
