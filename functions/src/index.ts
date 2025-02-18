import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as speech from "@google-cloud/speech";
import { google } from 'googleapis';
import { Request, Response } from 'express';

admin.initializeApp();

const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2";
const HUGGINGFACE_API_KEY = process.env['HUGGINGFACE_API_KEY'];

const client = new speech.SpeechClient();

export const askQuestion = functions.https.onRequest(async (req: Request, res: Response) => {
    try {
        const { question, context = "This is an AI Learning Assistant. Ask me anything!" } = req.body;
        const response = await axios.post(
            HUGGINGFACE_API_URL,
            { question, context },
            { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` } }
        );
        res.json({ answer: response.data.answer });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Store user queries in Firestore
export const saveUserQuery = functions.https.onRequest(async (req: Request, res: Response) => {
    try {
        const { userId, question, answer } = req.body;
        await admin.firestore().collection("queries").add({
            userId,
            question,
            answer,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Speech-to-Text with simpler types
export const speechToText = functions.https.onRequest(async (req: Request, res: Response) => {
    try {
        const audio = req.body.audio;
        const request = {
            config: {
                encoding: 'LINEAR16' as const,
                languageCode: "en-US"
            },
            audio: { content: audio }
        };
        
        const [response] = await client.recognize(request);
        const transcript = response?.results?.[0]?.alternatives?.[0]?.transcript || '';
        res.json({ text: transcript });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Forms API initialization
export const generateQuiz = functions.https.onRequest(async (req: Request, res: Response) => {
    try {
        const { topic } = req.body;
        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env['GOOGLE_CLIENT_EMAIL'],
                private_key: process.env['GOOGLE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
                client_id: process.env['GOOGLE_CLIENT_ID']
            },
            scopes: ['https://www.googleapis.com/auth/forms.body']
        });

        const authClient = await auth.getClient();
        const forms = google.forms({
            version: 'v1',
            auth: authClient as any // Type assertion to fix compatibility
        });
        
        const form = await forms.forms.create({
            requestBody: {
                info: {
                    title: `Quiz: ${topic}`,
                    documentTitle: `Learning Quiz - ${topic}`
                }
            }
        });
        
        const formId = form.data.formId;
        const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
        
        await admin.firestore().collection("quizzes").add({
            topic,
            formId,
            formUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({ 
            quiz_link: formUrl,
            formId: formId
        });
    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).send(error);
    }
}); 