import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TripService, Trip } from '../trip.service';

@Component({
  selector: 'app-trip-summary',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './trip-summary.component.html',
  styleUrls: ['./trip-summary.component.css']
})
export class TripSummaryComponent implements OnInit {
  trips: Trip[] = [];

  constructor(private router: Router, private tripService: TripService) {}

  ngOnInit() {
    // ✅ Load processed trips from tripService
    this.trips = this.tripService.processedTrips;
  }

  async goToDashboard(trip: Trip) {
    try {
      // Load JSON
      const res = await window.electronAPI.loadTripJson(trip.name);
      if (!res || res.error) {
        alert(res?.error ?? 'No JSON found inside trip!');
        return;
      }
      const jsonData = res.data;

      // Load video path
      let videoPath: string | null = null;
      const videoRes = await window.electronAPI.getTripVideo(trip.name);
      if (videoRes?.success && videoRes.videoPath) videoPath = videoRes.videoPath;

      // Navigate to dashboard
      this.router.navigate(['/dashboard'], {
        state: { tripName: trip.name, json: jsonData, video: videoPath }
      });
    } catch (err) {
      console.error('Error opening dashboard for trip:', trip.name, err);
      alert('Failed to open trip dashboard');
    }
  }
}
