import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
@Component({
  selector: 'app-home',
  imports: [MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(private route: Router){}
  
  goto(location: string): void{
    this.route.navigate([location])
  }
}
