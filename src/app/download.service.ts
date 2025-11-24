import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  private downloadsKey = 'downloaded_reports';

  constructor() {}

  saveDownload(fileName: string, fileBlob: Blob) {
    const url = URL.createObjectURL(fileBlob);

    const newFile = { fileName, url, date: new Date().toISOString() };

    const existing = this.getDownloads();

    existing.push(newFile);

    localStorage.setItem(this.downloadsKey, JSON.stringify(existing));
  }

  getDownloads() {
    return JSON.parse(localStorage.getItem(this.downloadsKey) || '[]');
  }
}
