import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverScoreComponent } from './driver-score.component';

describe('DriverScoreComponent', () => {
  let component: DriverScoreComponent;
  let fixture: ComponentFixture<DriverScoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverScoreComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverScoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
