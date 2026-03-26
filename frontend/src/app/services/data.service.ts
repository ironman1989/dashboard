import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  _id: string;
  date: string;
  name: string;
  amount: number;
  transactionHash: string | null;
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
  private apiBase = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiBase}/transactions`);
  }

  getMembers(): Observable<Member[]> {
    return this.http.get<Member[]>(`${this.apiBase}/members`);
  }

  getSummary(): Observable<Summary> {
    return this.http.get<Summary>(`${this.apiBase}/summary`);
  }
}
