import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DriverScoreComponent } from '../driver-score/driver-score.component';
@Component({
  selector: 'app-driver-panel',
  imports: [MatInputModule, MatButtonModule, DriverScoreComponent],
  templateUrl: './driver-panel.component.html',
  styleUrl: './driver-panel.component.css'
})
export class DriverPanelComponent {
  segments: any[] = [
    { value: 40, color: '#1E2362' },     // dark
    { value: 20, color: '#6B73C6' },     // medium
    { value: 40, color: '#D8DBF8' }      // light
  ]
}
