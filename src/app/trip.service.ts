// src/app/trip.service.ts
import { Injectable } from '@angular/core';

// src/app/trip.service.ts
export interface Trip {
  name: string;
  status: 'Not Processed' | 'Processed';
  tripId?: string;
  driverScore?: number;
}


  @Injectable({ providedIn: 'root' })
  export class TripService {
    trips: Trip[] = [];             // all imported trips
    processedTrips: Trip[] = [];    // trips after processing
  
    moveToProcessed(trip: Trip) {
      const index = this.trips.indexOf(trip);
      if (index > -1) {
        this.trips.splice(index, 1);
        trip.status = 'Processed';
        this.processedTrips.push(trip);
      }
    }
    
  }
  
