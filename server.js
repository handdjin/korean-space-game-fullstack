import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = 3001;
const DB_FILE = './quizzes.json';

app.use(cors());
app.use(express.json());

// 초기 기본 퀴즈 데이터
const initialQuizzes = [
  { id: 1, question: "오늘날씨가참좋다.", answer: "오늘 날씨가 참 좋다." },
  { id: 2, question: "너는할수있다.", answer: "너는 할 수 있다." }
];

// DB 읽기
const readData = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialQuizzes, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

// DB 저장
const saveData = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// [Read] 전체 퀴즈 목록 조회
app.get('/api/quizzes', (req, res) => {
  res.json(readData());
});

// [Create] 새 퀴즈 추가
app.post('/api/quizzes', (req, res) => {
  const quizzes = readData();
  const newQuiz = { id: Date.now(), ...req.body };
  quizzes.push(newQuiz);
  saveData(quizzes);
  res.status(201).json(newQuiz);
});

// [Update] 퀴즈 수정
app.put('/api/quizzes/:id', (req, res) => {
  const quizzes = readData();
  const id = Number(req.params.id);
  const index = quizzes.findIndex(q => q.id === id);
  if (index !== -1) {
    quizzes[index] = { id, ...req.body };
    saveData(quizzes);
    res.json(quizzes[index]);
  } else {
    res.status(404).json({ error: "Quiz not found" });
  }
});

// [Delete] 퀴즈 삭제
app.delete('/api/quizzes/:id', (req, res) => {
  let quizzes = readData();
  const id = Number(req.params.id);
  quizzes = quizzes.filter(q => q.id !== id);
  saveData(quizzes);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});