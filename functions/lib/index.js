"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuiz = exports.speechToText = exports.saveUserQuery = exports.askQuestion = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const speech = __importStar(require("@google-cloud/speech"));
const googleapis_1 = require("googleapis");
admin.initializeApp();
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2";
const HUGGINGFACE_API_KEY = process.env['HUGGINGFACE_API_KEY'];
const client = new speech.SpeechClient();
exports.askQuestion = functions.https.onRequest(async (req, res) => {
    try {
        const { question, context = "This is an AI Learning Assistant. Ask me anything!" } = req.body;
        const response = await axios_1.default.post(HUGGINGFACE_API_URL, { question, context }, { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` } });
        res.json({ answer: response.data.answer });
    }
    catch (error) {
        res.status(500).send(error);
    }
});
// Store user queries in Firestore
exports.saveUserQuery = functions.https.onRequest(async (req, res) => {
    try {
        const { userId, question, answer } = req.body;
        await admin.firestore().collection("queries").add({
            userId,
            question,
            answer,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).send(error);
    }
});
// Speech-to-Text with simpler types
exports.speechToText = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const audio = req.body.audio;
        const request = {
            config: {
                encoding: 'LINEAR16',
                languageCode: "en-US"
            },
            audio: { content: audio }
        };
        const [response] = await client.recognize(request);
        const transcript = ((_d = (_c = (_b = (_a = response === null || response === void 0 ? void 0 : response.results) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.alternatives) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.transcript) || '';
        res.json({ text: transcript });
    }
    catch (error) {
        res.status(500).send(error);
    }
});
// Forms API initialization
exports.generateQuiz = functions.https.onRequest(async (req, res) => {
    var _a;
    try {
        const { topic } = req.body;
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials: {
                client_email: process.env['GOOGLE_CLIENT_EMAIL'],
                private_key: (_a = process.env['GOOGLE_PRIVATE_KEY']) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
                client_id: process.env['GOOGLE_CLIENT_ID']
            },
            scopes: ['https://www.googleapis.com/auth/forms.body']
        });
        const authClient = await auth.getClient();
        const forms = googleapis_1.google.forms({
            version: 'v1',
            auth: authClient // Type assertion to fix compatibility
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
    }
    catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).send(error);
    }
});
//# sourceMappingURL=index.js.map