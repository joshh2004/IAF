import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportTripsComponent } from './import-trips.component';

describe('ImportTripsComponent', () => {
  let component: ImportTripsComponent;
  let fixture: ComponentFixture<ImportTripsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportTripsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportTripsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
