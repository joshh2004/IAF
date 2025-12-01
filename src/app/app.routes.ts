import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ImportTripsComponent } from './import-trips/import-trips.component';
import { TripSummaryComponent } from './trip-summary/trip-summary.component';
import { TripDashboardComponent } from './trip-dashboard/trip-dashboard.component';
import { HomeComponent } from './home/home.component';

// app-routing.module.ts
export const  routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'import-trips', component: ImportTripsComponent },
    { path: 'trip-summary', component: TripSummaryComponent },
    { path: 'dashboard', component: TripDashboardComponent },
    { path: 'home', component: HomeComponent }
];
  

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
