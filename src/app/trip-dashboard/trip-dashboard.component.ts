import {
  Component,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DriverScoreComponent } from '../driver-score/driver-score.component';
import { color } from 'html2canvas/dist/types/css/types/color';
type EventEntry = {
  startIso: string;
  endIso: string;
  startOffset: number;
  endOffset: number;
  duration: number;
};

@Component({
  selector: 'app-trip-dashboard',
  imports: [CommonModule, MatButtonModule, MatIconModule, DriverScoreComponent],
  templateUrl: './trip-dashboard.component.html',
  styleUrls: ['./trip-dashboard.component.css']
})
export class TripDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('eventVideo') eventVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('pdfContent') pdfContent!: ElementRef<HTMLDivElement>;

  tripName: string | null = null;
  trip: any = null;
  overallScore = 0;

  parameterKeys: any[] = [];
  eventTimeline: Record<string, EventEntry[]> = {};
  parameterWeights: Record<string, number> = {};

  headingVisible = false;
  videoFileUrl = '';
  videoModalOpen = false;

  // Donut chart
  radius = 80;
  totalCircumference = 2 * Math.PI * this.radius;
  redArc = 0;
  blueArc = 0;
  greenArc = 0;
  emptyArc = 0;

  mergedChart: any = null;
  expandedParam: string | null = null;
  colorList: string[] = ['#1E2362', '#6B73C6', '#D8DBF8', '#191d52', '#0f1130'];
  segments: any[] = [];

  totalDriverScore:number = 0;

  constructor(private router: Router) {}

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------
  ngOnInit(): void {
    const navState = history.state;

    const jsonData = navState?.json ?? null;
    this.tripName = navState?.tripName ?? null;

    const videoPath = navState?.video ?? null;

    if (jsonData) {
      this.loadJson(jsonData);
      if (videoPath) this.videoFileUrl = this.pathToFileUrl(videoPath);
      return;
    }

    console.warn('No JSON found in navigation.');
  }

  // ---------------------------------------------------------
  // LOAD JSON INTO UI
  // ---------------------------------------------------------
  loadJson(json: any) {
    this.trip = json;
    this.overallScore = Number(json.overallScore || 0);

    this.prepareParameters();
    this.driverScore()
    //this.updateDonutSegments();
    this.renderMergedTimeline();

    this.headingVisible = true;
  }

  getEventName(str: string): string{
    let eventName: string = '';
    switch(str){
      case 'seatbelt_violation':
        eventName = 'Seat Belt';
      break;
      case 'harsh_braking':
        eventName = 'Harsh Braking';
      break;
      case 'mobile_phone_usage':
        eventName = 'Mobile Phone Usage';
      break;
      case 'drowsiness_level':
        eventName = 'Drowsiness';
      break;
    }
    return eventName;
  }

  getEventCount(obj: any): number {
    let count: number = 0;
    let item = obj['breach_time_stamps'];
    Object.keys(item).forEach((key)=>{
      count = count + item[key].length;
    });
    return count;
  }

  driverScore(): void {
    let scoreDetails: any = this.trip?.driving_score?.severity_sigmas;
    this.totalDriverScore = this.trip?.overallScore;
    let scores: any = [];
    Object.keys(scoreDetails).forEach((key: string, i)=> {
      let obj = {
        name: key,
        value: scoreDetails[key],
        color: this.colorList[i]
      }
      scores.push(obj);
    });
    this.segments = scores;
  }

  prepareParameters() {
    this.parameterKeys = [];
    this.parameterWeights = {};
    this.eventTimeline = {};

    this.parameterKeys = this.trip?.driving_score?.severity_threshold_breaches;
    console.log('this.trip', this.trip);
    console.log('this.parameterKeys', this.parameterKeys);
    // const categories = this.trip?.categories ?? {};

    // for (const catKey of Object.keys(categories)) {
    //   const params = categories[catKey]?.parameters ?? {};

    //   for (const pKey of Object.keys(params)) {
    //     const p = params[pKey];
    //     this.parameterWeights[pKey] = p.weight ?? 0;

    //     const events = (p.events ?? []).map((ev: any) => {
    //       const startMs = new Date(ev.startTime).getTime();
    //       const endMs = new Date(ev.endTime).getTime();
    //       const tripStartMs = new Date(this.trip.tripStartTime).getTime();

    //       const startOffset = Math.max(
    //         0,
    //         Math.round((startMs - tripStartMs) / 1000)
    //       );
    //       const endOffset = Math.max(
    //         0,
    //         Math.round((endMs - tripStartMs) / 1000)
    //       );

    //       return {
    //         startIso: ev.startTime,
    //         endIso: ev.endTime,
    //         startOffset,
    //         endOffset,
    //         duration: endOffset - startOffset
    //       };
    //     });

    //     this.eventTimeline[pKey] = events;
    //     this.parameterKeys.push(pKey);
    //   }
    // }

    // this.parameterKeys.sort(
    //   (a, b) => (this.parameterWeights[b] ?? 0) - (this.parameterWeights[a] ?? 0)
    // );
  }

  // ---------------------------------------------------------
  // COMPUTED LABELS
  // ---------------------------------------------------------
  get formattedTripDuration(): string {
    if (!this.trip?.tripDurationMin) return '';
    const hr = Math.floor(this.trip.tripDurationMin / 60);
    const mm = this.trip.tripDurationMin % 60;
    return `${hr}h ${mm}m`;
  }

  get tripStartLabel(): string {
    return this.trip?.tripStartTime
      ? new Date(this.trip.tripStartTime).toLocaleString()
      : '';
  }

  get tripEndLabel(): string {
    return this.trip?.tripEndTime
      ? new Date(this.trip.tripEndTime).toLocaleString()
      : '';
  }

  toIsoLocal(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  // ---------------------------------------------------------
  // DONUT SCORE METER
  // ---------------------------------------------------------
  updateDonutSegments() {
    const score = Math.min(100, Math.max(0, this.overallScore));

    const redLimit = 20;
    const blueLimit = 50;

    const redPart = Math.min(score, redLimit);
    const bluePart = Math.max(0, Math.min(score, blueLimit) - redLimit);
    const greenPart = Math.max(0, score - blueLimit);

    this.redArc = (redPart / 100) * this.totalCircumference;
    this.blueArc = (bluePart / 100) * this.totalCircumference;
    this.greenArc = (greenPart / 100) * this.totalCircumference;

    this.emptyArc =
      this.totalCircumference -
      (this.redArc + this.blueArc + this.greenArc);
  }

  getScoreLabel(): string {
    if (this.overallScore <= 20) return 'Bad';
    if (this.overallScore <= 50) return 'Average';
    return 'Good';
  }

  // ---------------------------------------------------------
  // MERGED TIMELINE CHART
  // ---------------------------------------------------------
  renderMergedTimeline() {
    const flat: any[] = [];
    const breaches: any[] = this.trip?.driving_score?.severity_threshold_breaches;
    breaches.forEach((breach:any)=>{
      Object.keys(breach.breach_time_stamps).forEach((item)=>{
        breach.breach_time_stamps[item].forEach((elem: any)=>{
          const startMs = new Date(elem).getTime();      
          const tripStartMs = new Date(this.trip.tripStartTime).getTime();
          const startOffset = Math.max(0,Math.round((startMs - tripStartMs) / 1000));
          console.log('startOffset', startOffset);
          flat.push({
            x: startOffset,
            y: 2,
            eventType: breach.param_name,
            raw: breach
          })
        })
        
      });
    });
    // for (const p of Object.keys(this.eventTimeline)) {
    //   for (const ev of this.eventTimeline[p]) {
    //     flat.push({
    //       x: ev.startOffset,
    //       y: ev.duration,
    //       eventType: p,
    //       raw: ev
    //     });
    //   }
    // }

    //flat.sort((a, b) => a.x - b.x);

    const canvas = document.getElementById(
      'mergedEventTimelineChart'
    ) as HTMLCanvasElement;

    if (!canvas) {
      setTimeout(() => this.renderMergedTimeline(), 50);
      return;
    }

    if (this.mergedChart) this.mergedChart.destroy();

    // palette
    const palette: Record<string, string> = {};
    const baseColors = [
      'rgba(46,204,113,0.85)',
      'rgba(52,152,219,0.85)',
      'rgba(231,76,60,0.85)',
      'rgba(241,196,15,0.85)',
      'rgba(155,89,182,0.85)',
      'rgba(26,188,156,0.85)'
    ];

    let ci = 0;
    for (const p of breaches) {
      palette[p.param_name] = baseColors[ci++ % baseColors.length];
    }
    console.log('palette', palette);
    console.log('flat', flat);
    this.mergedChart = new Chart(canvas, {
      type: 'bar',
      data: {
        datasets: [
          {
            data: flat,
            backgroundColor: flat.map(d => palette[d.eventType]),
            borderWidth: 0.5,
            barThickness: 18
          }
        ]
      },
      options: {
        parsing: { xAxisKey: 'x', yAxisKey: 'y' },
        onClick: evt => {
          const pts = this.mergedChart.getElementsAtEventForMode(
            evt,
            'nearest',
            { intersect: true },
            false
          );
          console.log(pts);
          if (pts.length > 0) {
            const idx = pts[0].index;
            const d = this.mergedChart.data.datasets[0].data[idx];
            console.log('d', d)
            //this.highlightSelectedBar(idx);
            this.playEventSnippet(d.x, d.x + 5);
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: this.trip?.tripDurationMin * 60,
            ticks: { callback: v => this.secondsToLabel(Number(v)) }
          },
          y: { beginAtZero: true }
        },
        plugins: { legend: { display: false } },
        responsive: true
      }
    });
  }

  highlightSelectedBar(index: number) { 
    if (!this.mergedChart) return; 
    const dataset = this.mergedChart.data.datasets[0]; 
    dataset.backgroundColor = (dataset.data as any[]).map((_: any, i: number) => i === index ? 
    "rgba(0,0,0,0.9)" : "rgba(150,150,150,0.5)" ); this.mergedChart.update(); }

  // ---------------------------------------------------------
  // PLAY VIDEO SNIPPET
  // ---------------------------------------------------------
  playEventSnippet(startSec: number, endSec: number) {
    if (!this.videoFileUrl) {
      alert('No video available.');
      return;
    }

    const video = this.eventVideo.nativeElement;
    this.videoModalOpen = true;

    setTimeout(() => {
      const play = () => {
        //video.currentTime = Math.min(startSec, video.duration - 0.5);
        video.play();
        // const stopper = () => {
        //   if (video.currentTime >= endSec) {
        //     video.pause();
        //     video.removeEventListener('timeupdate', stopper);
        //   }
        // };

        // video.addEventListener('timeupdate', stopper);
      };
      play();
      // if (video.readyState >= 1) play();
      // else video.onloadedmetadata = () => play();
    }, 500);
  }

  closeVideo() {
    const v = this.eventVideo?.nativeElement;
    if (v) v.pause();
    this.videoModalOpen = false;
  }

  // ---------------------------------------------------------
  // EXPORT PDF
  // ---------------------------------------------------------
  downloadTripPdf() {
    if (!this.pdfContent) return;

    const source = this.pdfContent.nativeElement;

    html2canvas(source, { scale: 2 }).then(canvas => {
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${this.tripName || 'trip'}.pdf`);
    });
  }

  // ---------------------------------------------------------
  // UTIL
  // ---------------------------------------------------------
  secondsToLabel(sec: number) {
    const mm = Math.floor(sec / 60);
    const ss = Math.floor(sec % 60);
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  pathToFileUrl(abs: string) {
    return `localfile://?path=${encodeURIComponent(abs.replace(/\\/g, '/'))}`;
  }

  goBack() {
    this.router.navigate(['/import-trips']);
  }

  toggleParam(p: string) {
    this.expandedParam = this.expandedParam === p ? null : p;
  }

  // ---------------------------------------------------------
  // CLEANUP – DELETE TRIP FOLDER AUTOMATICALLY
  // ---------------------------------------------------------
  async ngOnDestroy() {
    if (this.mergedChart) {
      this.mergedChart.destroy();
    }

    const video = this.eventVideo?.nativeElement;
    if (video) video.pause();

    // if (this.tripName && window.electronAPI?.deleteTripFolder) {
    //   try {
    //     await window.electronAPI.deleteTripFolder(this.tripName);
    //     console.log(`Trip folder "${this.tripName}" deleted.`);
    //   } catch (err) {
    //     console.warn('Error deleting trip folder:', err);
    //   }
    // }
  }
}
