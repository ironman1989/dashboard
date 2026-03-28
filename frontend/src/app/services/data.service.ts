import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  _id: string;
  date: string;
  name: string;
  amount: number;
  transactionHash: string | null;
  period?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Member {
  _id: string;
  member: string;
  pending: number;
  income: number;
  etc: number;
  from3Team: number;
  result: number;
  period?: string;
}

export interface Summary {
  totalTransactions: number;
  totalAmount: number;
  totalResult: number;
  totalMembers: number;
  positiveMembers: number;
  negativeMembers: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiBase = '/api';

  periods: string[] = [];
  selectedPeriod = '';

  constructor(private http: HttpClient) {}

  getPeriods(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiBase}/members/periods/list`);
  }

  getTransactions(period?: string): Observable<Transaction[]> {
    const params = period ? `?period=${encodeURIComponent(period)}` : '';
    return this.http.get<Transaction[]>(`${this.apiBase}/transactions${params}`);
  }

  getMembers(period?: string): Observable<Member[]> {
    const params = period ? `?period=${encodeURIComponent(period)}` : '';
    return this.http.get<Member[]>(`${this.apiBase}/members${params}`);
  }

  getSummary(period?: string): Observable<Summary> {
    const params = period ? `?period=${encodeURIComponent(period)}` : '';
    return this.http.get<Summary>(`${this.apiBase}/summary${params}`);
  }

  addTransaction(tx: { date: string; name: string; amount: number; transactionHash: string | null; period: string }): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiBase}/transactions`, tx);
  }
}
