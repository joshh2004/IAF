import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

declare global {
  interface Window {
    electronAPI: {
      importTrips: () => Promise<{ folderPath: string; trips: string[] } | null>;
      loadTripJson: (tripFolder: string) => Promise<any>;
      getTripVideo: (tripFolder: string) => Promise<{ success: boolean; videoPath?: string; error?: string }>;
      deleteTripFolder: (tripFolder: string) => Promise<{ success?: boolean; error?: string }>;
    };
  }
}

interface Trip {
  name: string;
  status: 'Not Processed' | 'Processed';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatToolbarModule,
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  trips: Trip[] = [];
  processedTrips: Trip[] = [];
  currentPage: 'import' | 'summary' = 'import';
  @ViewChild('sidenav') sidenav!: MatSidenav;

  constructor(private router: Router) {}

  // -------------------------
  // IMPORT TRIPS
  // -------------------------
  async importTrips() {
    if (!window.electronAPI) {
      console.error('Electron API not available!');
      return;
    }

    const result = await window.electronAPI.importTrips();
    if (!result) {
      alert("No trips found");
      return;
    }

    // Only add trips that are not already processed
    const newTrips: Trip[] = result.trips
    .filter(name => !this.processedTrips.find(t => t.name === name))
    .map(name => ({ name, status: 'Not Processed' as const }));
  

    this.trips = [...this.trips, ...newTrips];
  }

  // -------------------------
  // PROCESS TRIP (Load JSON + Navigate to Dashboard)
  // -------------------------
  async processTrip(trip: Trip) {
    try {
      // 1️⃣ Load JSON
      const res = await window.electronAPI.loadTripJson(trip.name);
      if (!res || res.error) {
        alert(res?.error ?? 'No JSON found inside trip!');
        return;
      }
      const jsonData = res.data;

      // 2️⃣ Load video path
      let videoPath: string | null = null;
      const videoRes = await window.electronAPI.getTripVideo(trip.name);
      if (videoRes?.success && videoRes.videoPath) videoPath = videoRes.videoPath;

      // 3️⃣ Move trip to processed
      trip.status = 'Processed';
      this.trips = this.trips.filter(t => t !== trip);
      this.processedTrips.push(trip);

      // 4️⃣ Navigate to dashboard
      console.log('Navigating to dashboard with:', trip.name);
      this.router.navigate(['/dashboard'], {
        state: { tripName: trip.name, json: jsonData, video: videoPath }
      }).then(success => {
        console.log('Navigation success?', success);
        if (!success) {
          alert('Navigation failed. Trip folder not deleted.');
        }
      });

      console.log('Folder deletion will be handled by Dashboard after video load.');
    } catch (err) {
      console.error('Error processing trip:', err);
      alert('Error processing trip');
    }
  }

  // -------------------------
  // NAVBAR PAGE TOGGLE
  // -------------------------

  togglePage() {
    if (this.currentPage === 'import') {
      this.router.navigate(['/trip-summary']);
      this.currentPage = 'summary';
    } else {
      this.router.navigate(['/import-trips']);
      this.currentPage = 'import';
    }
  }
  

  // -------------------------
  // DELETE TRIP FROM LIST (UI only)
  // -------------------------
  deleteTrip(trip: Trip) {
    this.trips = this.trips.filter(t => t !== trip);
  }

  toggleSidenav() {
    this.sidenav.toggle();
  }

  goto(path: string) {
    this.router.navigate([path])
  }
}
