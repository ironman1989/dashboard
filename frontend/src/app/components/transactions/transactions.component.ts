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

  // Pagination
  pageSize = 12;
  currentPage = 1;

  // Date order for sorting
  private dateOrder = [
    'Feb 26', 'Mar 5', 'Mar 10', 'Mar 18', 'Mar 20', 'Mar 24', 'Mar 25'
  ];

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading = true;
    this.error = '';
    this.dataService.getTransactions().subscribe({
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
      this.sortDir = key === 'amount' ? 'asc' : 'asc';
    }
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.allTransactions];

    // Filter by search
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.date.toLowerCase().includes(q) ||
        String(t.amount).includes(q) ||
        (t.transactionHash && t.transactionHash.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (this.sortKey === 'date') {
        const ai = this.dateOrder.indexOf(a.date);
        const bi = this.dateOrder.indexOf(b.date);
        cmp = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
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
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
    }
  }

  isHashUrl(hash: string | null): boolean {
    return !!hash && (hash.startsWith('http://') || hash.startsWith('https://'));
  }

  formatAmount(n: number): string {
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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

  // Stats for current filter
  get filteredTotal(): number {
    return parseFloat(
      this.filteredTransactions.reduce((s, t) => s + t.amount, 0).toFixed(2)
    );
  }

  get uniqueMembers(): number {
    return new Set(this.filteredTransactions.map(t => t.name)).size;
  }
}
