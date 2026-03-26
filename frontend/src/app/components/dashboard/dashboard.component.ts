import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';
import { DataService, Summary, Member, Transaction } from '../../services/data.service';
import { forkJoin } from 'rxjs';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('resultChart') resultChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dateChart')   dateChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChart')    pieChartRef!: ElementRef<HTMLCanvasElement>;

  summary: Summary | null = null;
  members: Member[] = [];
  transactions: Transaction[] = [];
  loading = true;
  error = '';

  private resultChart: any = null;
  private dateChart: any = null;
  private pieChart: any = null;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private destroyCharts(): void {
    if (this.resultChart) { this.resultChart.destroy(); this.resultChart = null; }
    if (this.dateChart)   { this.dateChart.destroy();   this.dateChart = null; }
    if (this.pieChart)    { this.pieChart.destroy();     this.pieChart = null; }
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      summary: this.dataService.getSummary(),
      members: this.dataService.getMembers(),
      transactions: this.dataService.getTransactions()
    }).subscribe({
      next: (data) => {
        this.summary = data.summary;
        this.members = data.members;
        this.transactions = data.transactions;
        this.loading = false;
        // Wait for DOM update then draw charts
        setTimeout(() => this.buildCharts(), 50);
      },
      error: (err) => {
        this.error = 'Failed to load data. Make sure the backend is running on port 3000.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  private buildCharts(): void {
    this.destroyCharts();
    this.buildResultChart();
    this.buildDateChart();
    this.buildPieChart();
  }

  private buildResultChart(): void {
    if (!this.resultChartRef) return;
    const ctx = this.resultChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Sort members by result ascending (most negative first)
    const sorted = [...this.members].sort((a, b) => a.result - b.result);
    const labels = sorted.map(m => m.member);
    const data   = sorted.map(m => m.result);
    const colors = data.map(v => v >= 0
      ? 'rgba(63, 185, 80, 0.85)'
      : 'rgba(248, 81, 73, 0.85)'
    );
    const borders = data.map(v => v >= 0 ? '#3fb950' : '#f85149');

    this.resultChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Result ($)',
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` $${ctx.parsed.y.toFixed(2)}`
            },
            backgroundColor: '#1c2128',
            borderColor: '#30363d',
            borderWidth: 1,
            titleColor: '#e6edf3',
            bodyColor: '#8b949e'
          }
        },
        scales: {
          x: {
            ticks: { color: '#8b949e', font: { size: 11 } },
            grid: { color: 'rgba(48,54,61,0.5)' }
          },
          y: {
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (v: number) => '$' + v.toLocaleString()
            },
            grid: { color: 'rgba(48,54,61,0.5)' }
          }
        }
      }
    });
  }

  private buildDateChart(): void {
    if (!this.dateChartRef) return;
    const ctx = this.dateChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Aggregate amounts by date
    const dateMap = new Map<string, number>();
    for (const t of this.transactions) {
      const cur = dateMap.get(t.date) || 0;
      dateMap.set(t.date, cur + t.amount);
    }

    // Sort dates in chronological order
    const dateOrder = ['Feb 26', 'Mar 5', 'Mar 10', 'Mar 18', 'Mar 20', 'Mar 24', 'Mar 25'];
    const labels: string[] = [];
    const data: number[] = [];
    for (const d of dateOrder) {
      if (dateMap.has(d)) {
        labels.push(d);
        data.push(parseFloat((dateMap.get(d) || 0).toFixed(2)));
      }
    }

    this.dateChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Amount ($)',
          data,
          backgroundColor: 'rgba(31, 111, 235, 0.7)',
          borderColor: '#388bfd',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` $${ctx.parsed.y.toFixed(2)}`
            },
            backgroundColor: '#1c2128',
            borderColor: '#30363d',
            borderWidth: 1,
            titleColor: '#e6edf3',
            bodyColor: '#8b949e'
          }
        },
        scales: {
          x: {
            ticks: { color: '#8b949e', font: { size: 12 } },
            grid: { color: 'rgba(48,54,61,0.5)' }
          },
          y: {
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (v: number) => '$' + v.toLocaleString()
            },
            grid: { color: 'rgba(48,54,61,0.5)' }
          }
        }
      }
    });
  }

  private buildPieChart(): void {
    if (!this.pieChartRef) return;
    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Aggregate absolute amounts by member
    const memberMap = new Map<string, number>();
    for (const t of this.transactions) {
      const cur = memberMap.get(t.name) || 0;
      memberMap.set(t.name, cur + Math.abs(t.amount));
    }

    const entries = Array.from(memberMap.entries()).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const data   = entries.map(e => parseFloat(e[1].toFixed(2)));

    const palette = [
      '#388bfd', '#3fb950', '#f85149', '#d29922', '#bc8cff',
      '#39d353', '#79c0ff', '#ffb86c', '#ff6e96', '#56d364',
      '#ffa657', '#db61a2'
    ];

    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: '#1c2128',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#8b949e',
              font: { size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.label}: $${ctx.parsed.toFixed(2)}`
            },
            backgroundColor: '#1c2128',
            borderColor: '#30363d',
            borderWidth: 1,
            titleColor: '#e6edf3',
            bodyColor: '#8b949e'
          }
        }
      }
    });
  }

  // Template helpers
  formatAmount(n: number): string {
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getTopMembers(): Member[] {
    return [...this.members]
      .sort((a, b) => Math.abs(b.result) - Math.abs(a.result))
      .slice(0, 5);
  }

  getMemberInitials(name: string): string {
    return name.slice(0, 2).toUpperCase();
  }

  getTransactionsByDate(): { date: string; count: number; total: number }[] {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of this.transactions) {
      const cur = map.get(t.date) || { count: 0, total: 0 };
      map.set(t.date, { count: cur.count + 1, total: cur.total + t.amount });
    }
    const order = ['Feb 26', 'Mar 5', 'Mar 10', 'Mar 18', 'Mar 20', 'Mar 24', 'Mar 25'];
    return order.filter(d => map.has(d)).map(d => ({ date: d, ...map.get(d)! }));
  }
}
