import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private db = getFirestore(initializeApp(environment.firebase));

  constructor(private http: HttpClient) {}

  askQuestion(question: string): Observable<any> {
    return this.http.post<any>(
      'https://api-inference.huggingface.co/models/deepset/roberta-base-squad2',
      { question },
      { headers: { Authorization: `Bearer ${environment.huggingface.apiKey}` } }
    );
  }

  saveQuery(userId: string, question: string, answer: string): Observable<any> {
    return from(addDoc(collection(this.db, 'queries'), {
      userId,
      question,
      answer,
      timestamp: serverTimestamp()
    }));
  }

  generateQuiz(topic: string): Observable<any> {
    return from(addDoc(collection(this.db, 'quizzes'), {
      topic,
      createdAt: serverTimestamp(),
      questions: [
        {
          question: `What is ${topic}?`,
          options: ['A', 'B', 'C', 'D']
        }
      ]
    }));
  }
} 