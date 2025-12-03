// src/app/import-trips/import-trips.component.ts
import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TripService, Trip } from '../trip.service'; // <-- shared service
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-import-trips',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './import-trips.component.html',
  styleUrls: ['./import-trips.component.css']
})
export class ImportTripsComponent implements OnInit {
  trips: Trip[] = [];
  displayedColumns: string[] = ['name', 'duration', 'action'];
  constructor(private router: Router, private tripService: TripService) {}

  ngOnInit() {
    // restore trips if previously loaded
    this.trips = this.tripService.trips || [];
    this.importTrips();
  }

  async importTrips() {
    if (!window.electronAPI) return alert('Electron API not available');

    const result = await window.electronAPI.importTrips();
    if (!result) return alert("No trips found");

    this.trips = result.trips.map(name => ({ name, duration: '', status: 'Not Processed' }));
    this.tripService.trips = this.trips; // save to service
  }

  async processTrip(trip: Trip) {
    const res = await window.electronAPI.loadTripJson(trip.name);
    if (!res || res.error) return alert(res?.error ?? 'No JSON found');
  
    const jsonData = res.data;
  
    // Extract tripId + driverScore from JSON
    const tripId = jsonData.tripId || jsonData.trip_id || 'Unknown';
    const driverScore = jsonData.overallScore || jsonData.driverScore || 0;
  
    // Attach values to Trip object
    trip.tripId = tripId;
    trip.driverScore = driverScore;
  
    // Save inside service
    this.tripService.moveToProcessed(trip);
  
    // Load video
    const videoRes = await window.electronAPI.getTripVideo(trip.name);
    const videoPath = videoRes?.success ? videoRes.videoPath : null;
  
    // Navigate
    this.router.navigate(['/dashboard'], {
      state: { tripName: trip.name, json: jsonData, video: videoPath }
    });
  }
  
  deleteTrip(trip: Trip) {
    this.trips = this.trips.filter(t => t !== trip);
    this.tripService.trips = this.trips; // update service
  }
}
