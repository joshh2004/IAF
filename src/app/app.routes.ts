import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ExcelReaderComponent } from './excel-reader/excel-reader.component';
import { DownloadsComponent } from './downloads/downloads.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'trip-overview', component: ExcelReaderComponent },
  { path: 'downloads', loadComponent: () => import('./downloads/downloads.component').then(m => m.DownloadsComponent) },
  { path: 'history', loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent) }
];
