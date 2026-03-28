import { Component, OnInit } from '@angular/core';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Financial Dashboard';
  menuOpen = false;

  constructor(public dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.getPeriods().subscribe({
      next: (periods) => {
        this.dataService.periods = periods;
        if (!this.dataService.selectedPeriod) {
          this.dataService.selectedPeriod = periods[periods.length - 1] || '';
        }
      }
    });
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu()  { this.menuOpen = false; }
}
