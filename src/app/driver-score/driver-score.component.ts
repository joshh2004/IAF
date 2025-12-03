import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
interface GaugeSegment {
  value: number;
  color: string;
}

@Component({
  selector: 'app-driver-score',
  templateUrl: './driver-score.component.html',
  styleUrls: ['./driver-score.component.css'],
  imports: [CommonModule]
})
export class DriverScoreComponent implements OnChanges {

  @Input() segments: GaugeSegment[] = [];
  @Input() score = 0;

  totalLength = 252;  // Measured arc length
  dashSegments: { color: string; length: number; offset: number }[] = [];

  ngOnChanges() {
    const totalValue = this.segments.reduce((a, b) => a + b.value, 0);

    let currentOffset = 0;

    this.dashSegments = this.segments.map(seg => {
      const length = (seg.value / totalValue) * this.totalLength;

      const segment = {
        color: seg.color,
        length,
        offset: -currentOffset
      };

      currentOffset += length;

      return segment;
    });
  }
}
