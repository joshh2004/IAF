import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DownloadService } from '../download.service';
import { HistoryService } from '../services/history.service';






@Component({
  selector: 'app-excel-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './excel-reader.component.html',
  styleUrls: ['./excel-reader.component.css']
})
export class ExcelReaderComponent {
  // expose globals to template
  Math = Math;
  Object = Object;

  // Excel data
  tableData: Record<string, any>[] = [];
  firstRow: Record<string, any> | null = null;

  // UI controls
  headingVisible = false;

  // Donut
  driverScore = 0;
  radius = 80;
  totalCircumference = 2 * Math.PI * this.radius;
  redArc = 0;
  blueArc = 0;
  greenArc = 0;
  emptyArc = 0;

  // Events & timeline
  eventCounts: Record<string, number> = {};
  // For plotting
  eventBaseTypes: string[] = []; // "Hit","Sleepy","Break" (per row)
  eventStart: number[] = [];     // seconds start
  eventEnd: number[] = [];       // seconds end
  videoLengthSeconds = 0;
  expandedEvent: string | null = null;
  eventTimeline: Record<string, { start: number; end: number }[]> = {};

  // Chart instance
  eventChart: any = null;
  constructor(private historyService: HistoryService) {}

  @ViewChild('eventVideo') eventVideo: any;
videoFileUrl: string = "";   // When you allow uploading video later
snippetEndTime = 0;

  // ---------------- Helpers ----------------
  normalizeKey(k: string | undefined) {
    return (k ?? '').toString().trim().toLowerCase();
  }
  // Convert HH:MM:SS, MM:SS, "1 hr 45 mins", or numeric -> seconds
  hhmmssToSeconds(str: string | number): number {
    if (str === null || str === undefined) return 0;
    const s = String(str).trim();

    // numeric seconds
    if (/^\d+$/.test(s)) return Number(s);

    // hh:mm:ss or mm:ss
    const parts = s.split(':').map(p => p.trim());
    if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
    if (parts.length === 2 && parts.every(p => /^\d+$/.test(p))) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }

    // human readable (1 hr 45 mins)
    const hrMatch = s.match(/(\d+)\s*hr/);
    const minMatch = s.match(/(\d+)\s*min/);
    const secMatch = s.match(/(\d+)\s*sec/);
    const hrs = hrMatch ? Number(hrMatch[1]) : 0;
    const mins = minMatch ? Number(minMatch[1]) : 0;
    const secs = secMatch ? Number(secMatch[1]) : 0;
    if (hrs || mins || secs) return hrs * 3600 + mins * 60 + secs;

    // fallback numeric with unit detection
    const num = parseFloat(s.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) {
      if (/min/i.test(s)) return Math.round(num * 60);
      return Math.round(num);
    }
    return 0;
  }


  convertExcelDate(excelValue: any): string {
    // If it's already a readable date string like "07-Aug" or "07-Aug-2024"
    if (typeof excelValue === 'string') {
      const parsed = new Date(excelValue);
  
      if (!isNaN(parsed.getTime())) {
        // Format to dd-MMM-yyyy
        return parsed.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
  
      // If it's "07-Aug" with no year, add current year
      if (/^\d{2}-[A-Za-z]{3}$/.test(excelValue)) {
        const withYear = excelValue + '-' + new Date().getFullYear();
        const parsed2 = new Date(withYear);
        return parsed2.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
  
      return excelValue; // fallback
    }
  
    // If the value is an Excel serial number (number format)
    if (typeof excelValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const converted = new Date(excelEpoch.getTime() + excelValue * 86400000);
      return converted.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  
    return '';
  }
  

  // ---------------- File load ----------------
  onFileSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const raw: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (!raw || raw.length === 0) {
        alert('No data found in sheet.');
        return;
      }

      // assign
      this.tableData = raw;
      this.firstRow = raw[0];

      // Optional: auto-convert Excel serial date values in the "date" column
      const hdrs = Object.keys(this.firstRow || {});
      const dateHeader = hdrs.find(h => this.normalizeKey(h) === 'date');
      if (dateHeader) {
        for (const r of this.tableData) {
          const v = r[dateHeader];
          if (typeof v === 'number') r[dateHeader] = this.convertExcelDate(v);
        }
      }

      // Driver score detection
      const headers = Object.keys(this.firstRow || {});
      const scoreHeader = headers.find(h => {
        const hn = this.normalizeKey(h);
        return (hn.includes('driver') && hn.includes('score')) || hn === 'score' || hn === 'driver score';
      }) || headers.find(h => this.normalizeKey(h).includes('score'));

      if (scoreHeader) {
        const rawScore = (this.firstRow as Record<string, any>)[scoreHeader];
        const numericScore = Number(String(rawScore).replace(/[^0-9.-]/g, ''));
        this.driverScore = isFinite(numericScore) ? Math.max(0, Math.min(100, numericScore)) : 0;
      } else {
        this.driverScore = 0;
      }
      this.updateDonutSegments();

      // video length detection
      const videoLenHeader = headers.find(h => this.normalizeKey(h) === 'video length');
      if (videoLenHeader) {
        const rawLen = (this.firstRow as Record<string, any>)[videoLenHeader];
        this.videoLengthSeconds = this.hhmmssToSeconds(rawLen);
      } else {
        this.videoLengthSeconds = 0;
      }

      // events
      this.extractEventCounts();
      this.extractEventsForTimeline();

      // render chart
      this.renderEventTimeline();

      // show UI
      this.headingVisible = true;
      // Save Excel upload in history
this.historyService.addEntry({
  type: 'excel',
  fileName: file.name,
  timestamp: new Date()
});

    };

    reader.readAsArrayBuffer(file);
  }

  // -------------- Donut ---------------
  updateDonutSegments() {
    const score = Math.max(0, Math.min(100, this.driverScore));
    const redLimit = 20, blueLimit = 50;
    const redPart = Math.min(score, redLimit);
    const bluePart = Math.max(0, Math.min(score, blueLimit) - redLimit);
    const greenPart = Math.max(0, score - blueLimit);

    this.redArc = (redPart / 100) * this.totalCircumference;
    this.blueArc = (bluePart / 100) * this.totalCircumference;
    this.greenArc = (greenPart / 100) * this.totalCircumference;
    this.emptyArc = Math.max(0, this.totalCircumference - (this.redArc + this.blueArc + this.greenArc));
  }

  getScoreLabel(): string {
    if (this.driverScore <= 20) return 'Bad';
    if (this.driverScore <= 50) return 'Average';
    return 'Good';
  }

  // -------------- Event counts ---------------
  extractEventCounts() {
    this.eventCounts = {};
    if (!this.tableData || this.tableData.length === 0) return;
    const headers = Object.keys(this.tableData[0] || {});
    const eventHeader = headers.find(h => this.normalizeKey(h) === 'event');
    if (!eventHeader) return;

    for (const row of this.tableData) {
      const ev = String(row[eventHeader] ?? '').trim();
      if (!ev) continue;
      this.eventCounts[ev] = (this.eventCounts[ev] || 0) + 1;
    }
  }

  // -------------- Extract events --------------
  extractEventsForTimeline() {
    this.eventBaseTypes = [];
    this.eventStart = [];
    this.eventEnd = [];
    this.eventTimeline = {};  // NEW
  
    if (!this.tableData || this.tableData.length === 0) return;
  
    const headers = Object.keys(this.tableData[0] || {});
    const eventHeader = headers.find(h => this.normalizeKey(h) === 'event');
    const startHeader = headers.find(h => this.normalizeKey(h).includes('start'));
    const endHeader = headers.find(h => this.normalizeKey(h).includes('end'));
  
    if (!eventHeader || !startHeader || !endHeader) return;
  
    for (const row of this.tableData) {
      const evRaw = row[eventHeader];
      const sRaw = row[startHeader];
      const eRaw = row[endHeader];
  
      if (!evRaw || !sRaw || !eRaw) continue;
  
      const ev = String(evRaw).trim();
      const start = (typeof sRaw === 'number') ? Math.round(sRaw * 86400) : this.hhmmssToSeconds(sRaw);
      const end = (typeof eRaw === 'number') ? Math.round(eRaw * 86400) : this.hhmmssToSeconds(eRaw);
  
      if (isNaN(start) || isNaN(end) || end <= start) continue;
  
      this.eventBaseTypes.push(ev);
      this.eventStart.push(start);
      this.eventEnd.push(end);
  
      // NEW: build grouped structure
      if (!this.eventTimeline[ev]) {
        this.eventTimeline[ev] = [];
      }
      this.eventTimeline[ev].push({ start, end });
    }
  }
  playEventSnippet(start: number, end: number) {
    if (!this.eventVideo) return;
  
    const video: HTMLVideoElement = this.eventVideo.nativeElement;
  
    // Show modal FIRST
    const modal = document.getElementById("videoModal");
    if (modal) modal.style.display = "block";
  
    // Ensure metadata is loaded before setting currentTime
    const playAfterSeek = () => {
      video.currentTime = start;
      video.play();
  
      const stopper = () => {
        if (video.currentTime >= end) {
          video.pause();
          video.removeEventListener("timeupdate", stopper);
        }
      };
      video.addEventListener("timeupdate", stopper);
    };
  
    if (video.readyState >= 1) {
      playAfterSeek();
    } else {
      video.onloadedmetadata = () => playAfterSeek();
    }
  }
  
  
  
  closeVideo() {
    const video = this.eventVideo.nativeElement;
    video.pause();
    document.getElementById("videoModal")!.style.display = "none";
  }
  onVideoUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFileUrl = URL.createObjectURL(file);
  
      // Save Video upload in history
      this.historyService.addEntry({
        type: 'video',
        fileName: file.name,
        timestamp: new Date()
      });
    }
  }
  
  
  
  toggleEvent(ev: string) {
    this.expandedEvent = this.expandedEvent === ev ? null : ev;
  }
  
  downloadPage() {
    const element = document.getElementById('tripOverviewPage');
    if (!element) return;
  
    html2canvas(element, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
  
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
  
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
      let heightLeft = imgHeight;
      let y = 0;
  
      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
  
      while (heightLeft > 0) {
        y = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
  
      const fileName = 'trip-overview-' + Date.now() + '.pdf';
  
      // 🔥 VERY IMPORTANT — get Blob BEFORE saving file
      const pdfBlob = pdf.output('blob');
      const pdfURL = URL.createObjectURL(pdfBlob);
  
      // trigger download
      pdf.save(fileName);
  
      // save metadata into localStorage
      let pdfList = JSON.parse(localStorage.getItem('downloadedPdfs') || '[]');
      pdfList.push({
        name: fileName,
        date: new Date().toLocaleString(),
        url: pdfURL
      });
  
      localStorage.setItem('downloadedPdfs', JSON.stringify(pdfList));
    });
  }
  

  
  // -------------- Render vertical bars (baseline bars) --------------
  renderEventTimeline() {
    if ((!this.eventStart.length && !this.eventEnd.length) || (this.eventStart.length === 0)) {
      if (this.eventChart) { try { this.eventChart.destroy(); } catch {} this.eventChart = null; }
      return;
    }
  
    const canvas = document.getElementById('eventTimelineChart') as HTMLCanvasElement | null;
    if (!canvas) {
      setTimeout(() => this.renderEventTimeline(), 50);
      return;
    }
  
    if (this.eventChart) {
      try { this.eventChart.destroy(); } catch {}
      this.eventChart = null;
    }
  
    const dataPoints = this.eventStart.map((s, i) => {
      const start = s;
      const end = this.eventEnd[i];
      const duration = Math.max(0, end - start);
      return { x: start, y: duration, eventType: this.eventBaseTypes[i] };
    });
  
    const colorMap: Record<string, string> = {
      'hit': 'rgba(255,0,0,0.85)',
      'sleepy': 'rgba(0,123,255,0.85)',
      'break': 'rgba(255,193,7,0.85)'
    };
    const bgColors = dataPoints.map(d => colorMap[d.eventType.toLowerCase()] ?? 'rgba(150,150,150,0.85)');
  
    const xMax = this.videoLengthSeconds > 0 ? this.videoLengthSeconds : Math.max(...this.eventEnd, 0);
  
    this.eventChart = new Chart(canvas as any, {
      type: 'bar',
      data: {
        datasets: [{
          label: 'Event duration',
          data: dataPoints,
          backgroundColor: bgColors,
          borderColor: '#000',
          borderWidth: 0.5,
          barThickness: 20,
          maxBarThickness: 25
        }]
      },
      options: {
        parsing: {
          xAxisKey: 'x',
          yAxisKey: 'y'
        },
  
        // ==============================
        // CLICK HANDLER FOR VIDEO SNIPPET
        // ==============================
        onClick: (evt) => {
          if (!this.eventChart) return;
  
          const points = this.eventChart.getElementsAtEventForMode(
            evt,
            'nearest',
            { intersect: true },
            false
          );
  
          if (points.length > 0) {
            const p = points[0];
            const raw: any = this.eventChart.data.datasets[0].data[p.index];
  
            const start = raw.x;
            const duration = raw.y;
            const end = start + duration;
  
            this.highlightSelectedBar(p.index);
            this.playEventSnippet(start, end);
          }
        },
  
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: xMax,
            title: { display: true, text: 'Video Timeline' },
            ticks: {
              callback: (val) => this.secondsToLabel(Number(val))
            }
          },
          y: {
            type: 'linear',
            title: { display: true, text: 'Event Duration' },
            ticks: {
              callback: (val) => this.secondsToLabel(Number(val))
            },
            beginAtZero: true
          }
        },
  
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const d = ctx.raw;
                return `${d.eventType} — ${this.secondsToLabel(d.y)} (Start: ${this.secondsToLabel(d.x)})`;
              }
            }
          }
        },
  
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  highlightSelectedBar(index: number) {
    if (!this.eventChart) return;
  
    const dataset = this.eventChart.data.datasets[0];
  
    dataset.backgroundColor = (dataset.data as any[]).map((_: any, i: number) =>
      i === index ? "rgba(0,0,0,0.9)" : "rgba(150,150,150,0.5)"
    );
    
  
    this.eventChart.update();
  }
  

  // format seconds -> HH:MM:SS or MM:SS
  secondsToLabel(sec: number): string {
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = Math.floor(sec % 60);
    if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  // cleanup
  ngOnDestroy() {
    if (this.eventChart) {
      try { this.eventChart.destroy(); } catch { }
      this.eventChart = null;
    }
  }

  // Helper used in the template
  getFirst(keyLike: string): any {
    if (!this.firstRow) return '';
    const foundKey = Object.keys(this.firstRow || {}).find(k => this.normalizeKey(k).includes(this.normalizeKey(keyLike)));
    return foundKey ? (this.firstRow as Record<string, any>)[foundKey] ?? '' : '';
  }
}
