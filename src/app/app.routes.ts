import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ImportTripsComponent } from './import-trips/import-trips.component';
import { TripSummaryComponent } from './trip-summary/trip-summary.component';
import { TripDashboardComponent } from './trip-dashboard/trip-dashboard.component';

// app-routing.module.ts
export const  routes: Routes = [
    { path: '', redirectTo: '/import-trips', pathMatch: 'full' },
    { path: 'import-trips', component: ImportTripsComponent },
    { path: 'trip-summary', component: TripSummaryComponent },
    { path: 'dashboard', component: TripDashboardComponent }
  ];
  

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
