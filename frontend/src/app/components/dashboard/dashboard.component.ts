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
  topMembers: Member[] = [];
  transactionsByDate: { date: string; count: number; total: number }[] = [];
  loading = true;
  error = '';

  private resultChart: any = null;
  private dateChart: any = null;
  private pieChart: any = null;

  constructor(public dataService: DataService) {}

  ngOnInit(): void {
    if (this.dataService.selectedPeriod) {
      this.loadData();
    } else {
      this.dataService.getPeriods().subscribe({
        next: (periods) => {
          this.dataService.periods = periods;
          this.dataService.selectedPeriod = periods[periods.length - 1] || '';
          this.loadData();
        },
        error: () => { this.error = 'Failed to load periods.'; this.loading = false; }
      });
    }
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

  selectPeriod(period: string): void {
    if (period === this.dataService.selectedPeriod) return;
    this.dataService.selectedPeriod = period;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    const p = this.dataService.selectedPeriod || undefined;

    forkJoin({
      summary: this.dataService.getSummary(p),
      members: this.dataService.getMembers(p),
      transactions: this.dataService.getTransactions(p)
    }).subscribe({
      next: (data) => {
        this.summary = data.summary;
        this.members = data.members;
        this.transactions = data.transactions;
        this.topMembers = [...data.members].sort((a, b) => Math.abs(b.result) - Math.abs(a.result)).slice(0, 5);
        this.transactionsByDate = this.computeTransactionsByDate(data.transactions);
        this.loading = false;
        setTimeout(() => this.buildCharts(), 50);
      },
      error: (err) => {
        this.error = 'Failed to load data. Make sure the backend is running.';
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

    const sorted = [...this.members].sort((a, b) => a.result - b.result);
    const labels = sorted.map(m => m.member);
    const data   = sorted.map(m => m.result);
    const colors = data.map(v => v >= 0 ? 'rgba(63, 185, 80, 0.85)' : 'rgba(248, 81, 73, 0.85)');
    const borders = data.map(v => v >= 0 ? '#3fb950' : '#f85149');

    this.resultChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Result ($)', data, backgroundColor: colors, borderColor: borders, borderWidth: 1, borderRadius: 4 }] },
      options: {
        animation: false,
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c: any) => ` $${c.parsed.y.toFixed(2)}` }, backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' }
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 }, callback: (v: number) => '$' + v.toLocaleString() }, grid: { color: 'rgba(48,54,61,0.5)' } }
        }
      }
    });
  }

  private buildDateChart(): void {
    if (!this.dateChartRef) return;
    const ctx = this.dateChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const dateMap = new Map<string, number>();
    for (const t of this.transactions) {
      dateMap.set(t.date, (dateMap.get(t.date) || 0) + t.amount);
    }
    const labels = this.sortDates([...dateMap.keys()]);
    const data = labels.map(d => parseFloat((dateMap.get(d) || 0).toFixed(2)));

    this.dateChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Total Amount ($)', data, backgroundColor: 'rgba(31, 111, 235, 0.7)', borderColor: '#388bfd', borderWidth: 1, borderRadius: 4 }] },
      options: {
        animation: false,
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c: any) => ` $${c.parsed.y.toFixed(2)}` }, backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' }
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 12 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 }, callback: (v: number) => '$' + v.toLocaleString() }, grid: { color: 'rgba(48,54,61,0.5)' } }
        }
      }
    });
  }

  private buildPieChart(): void {
    if (!this.pieChartRef) return;
    const ctx = this.pieChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const memberMap = new Map<string, number>();
    for (const t of this.transactions) {
      memberMap.set(t.name, (memberMap.get(t.name) || 0) + Math.abs(t.amount));
    }
    const entries = Array.from(memberMap.entries()).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const data   = entries.map(e => parseFloat(e[1].toFixed(2)));
    const palette = ['#388bfd','#3fb950','#f85149','#d29922','#bc8cff','#39d353','#79c0ff','#ffb86c','#ff6e96','#56d364','#ffa657','#db61a2'];

    this.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: palette.slice(0, labels.length), borderColor: '#1c2128', borderWidth: 2, hoverOffset: 6 }] },
      options: {
        animation: false,
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { color: '#8b949e', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { callbacks: { label: (c: any) => ` ${c.label}: $${c.parsed.toFixed(2)}` }, backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' }
        }
      }
    });
  }

  private sortDates(dates: string[]): string[] {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return [...dates].sort((a, b) => {
      const [am, ad] = a.split(' ');
      const [bm, bd] = b.split(' ');
      const d = months.indexOf(am) - months.indexOf(bm);
      return d !== 0 ? d : parseInt(ad) - parseInt(bd);
    });
  }

  private computeTransactionsByDate(transactions: Transaction[]): { date: string; count: number; total: number }[] {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of transactions) {
      const cur = map.get(t.date) || { count: 0, total: 0 };
      map.set(t.date, { count: cur.count + 1, total: cur.total + t.amount });
    }
    return this.sortDates([...map.keys()]).map(d => ({ date: d, ...map.get(d)! }));
  }

  formatAmount(n: number): string {
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getMemberInitials(name: string): string {
    return name.slice(0, 2).toUpperCase();
  }
}
