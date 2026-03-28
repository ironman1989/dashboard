import { Component, OnInit } from '@angular/core';
import { DataService, Transaction } from '../../services/data.service';

type SortKey = 'date' | 'name' | 'amount';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  loading = true;
  error = '';

  searchQuery = '';
  sortKey: SortKey = 'date';
  sortDir: SortDir = 'asc';

  pageSize = 12;
  currentPage = 1;

  showForm = false;
  formDate = '';
  formName = '';
  formAmount = '';
  formHash = '';
  formError = '';
  formSaving = false;

  constructor(public dataService: DataService) {}

  ngOnInit(): void {
    if (this.dataService.selectedPeriod) {
      this.loadTransactions();
    } else {
      this.dataService.getPeriods().subscribe({
        next: (periods) => {
          this.dataService.periods = periods;
          this.dataService.selectedPeriod = periods[periods.length - 1] || '';
          this.loadTransactions();
        },
        error: () => { this.error = 'Failed to load periods.'; this.loading = false; }
      });
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.formError = '';
  }

  submitTransaction(): void {
    if (!this.formDate.trim() || !this.formName.trim() || !this.formAmount) {
      this.formError = 'Date, name and amount are required.';
      return;
    }
    const amount = parseFloat(this.formAmount);
    if (isNaN(amount)) {
      this.formError = 'Amount must be a number.';
      return;
    }
    this.formSaving = true;
    this.formError = '';
    this.dataService.addTransaction({
      date: this.formDate.trim(),
      name: this.formName.trim(),
      amount,
      transactionHash: this.formHash.trim() || null,
      period: this.dataService.selectedPeriod
    }).subscribe({
      next: () => {
        this.formSaving = false;
        this.showForm = false;
        this.formDate = '';
        this.formName = '';
        this.formAmount = '';
        this.formHash = '';
        this.loadTransactions();
      },
      error: (err) => {
        this.formSaving = false;
        this.formError = err?.error?.error || 'Failed to save transaction.';
      }
    });
  }

  selectPeriod(period: string): void {
    if (period === this.dataService.selectedPeriod) return;
    this.dataService.selectedPeriod = period;
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;
    this.error = '';
    this.currentPage = 1;
    this.dataService.getTransactions(this.dataService.selectedPeriod || undefined).subscribe({
      next: (data) => {
        this.allTransactions = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load transactions. Is the backend running?';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.applyFilters();
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

  private applyFilters(): void {
    let result = [...this.allTransactions];

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.date.toLowerCase().includes(q) ||
        String(t.amount).includes(q) ||
        (t.transactionHash && t.transactionHash.toLowerCase().includes(q))
      );
    }

    const dateOrder = this.sortDates([...new Set(this.allTransactions.map(t => t.date))]);
    result.sort((a, b) => {
      let cmp = 0;
      if (this.sortKey === 'date') {
        cmp = (dateOrder.indexOf(a.date) ?? 999) - (dateOrder.indexOf(b.date) ?? 999);
      } else if (this.sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (this.sortKey === 'amount') {
        cmp = a.amount - b.amount;
      }
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredTransactions = result;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.pageSize);
  }

  get paginatedTransactions(): Transaction[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  isHashUrl(hash: string | null): boolean {
    return !!hash && (hash.startsWith('http://') || hash.startsWith('https://'));
  }

  formatAmount(n: number): string {
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getChainLabel(hash: string | null): string {
    if (!hash) return '';
    if (hash.includes('bscscan')) return 'BSC';
    if (hash.includes('etherscan')) return 'ETH';
    return '';
  }

  getSortIcon(key: SortKey): string {
    if (this.sortKey !== key) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  get filteredTotal(): number {
    return parseFloat(this.filteredTransactions.reduce((s, t) => s + t.amount, 0).toFixed(2));
  }

  get uniqueMembers(): number {
    return new Set(this.filteredTransactions.map(t => t.name)).size;
  }
}
