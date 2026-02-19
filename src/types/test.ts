export interface TestOption {
    text: string;
    correct: boolean;
}

export interface TestQuestion {
    id: string;
    type: 'choice' | 'text';
    text: string;
    points: number;
    options: TestOption[];
    explanation: string;
    correctAnswers: string[]; // for text type
}

export interface TestStage {
    id: string;
    title: string;
    content: string; // markdown
    questions: TestQuestion[];
}

export type GradingMode = 'auto-simple' | 'auto-complex' | 'manual';

export interface Test {
    id: string;
    title: string;
    description: string;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
    gradingMode: GradingMode;
    published: boolean;
    stages: TestStage[];
}

export interface TestSubmission {
    id: string;
    testId: string;
    studentName: string;
    studentLastName: string;
    studentClass: string;
    fingerprint: string;
    submittedAt: number;
    answers: Record<string, string | number>; // questionId -> answer
    score?: number;
    maxScore?: number;
    graded: boolean;
    grade?: number; // 2-5
    teacherComments?: Record<string, string>;
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function createEmptyQuestion(): TestQuestion {
    return {
        id: generateId(),
        type: 'choice',
        text: '',
        points: 1,
        options: [
            { text: '', correct: true },
            { text: '', correct: false },
        ],
        explanation: '',
        correctAnswers: [],
    };
}

export function createEmptyStage(): TestStage {
    return {
        id: generateId(),
        title: 'Этап 1',
        content: '',
        questions: [createEmptyQuestion()],
    };
}

export function calcGrade(score: number, maxScore: number): number {
    if (maxScore === 0) return 2;
    const pct = (score / maxScore) * 100;
    if (pct >= 90) return 5;
    if (pct >= 70) return 4;
    if (pct >= 50) return 3;
    return 2;
}
