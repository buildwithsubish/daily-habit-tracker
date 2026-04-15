import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';

const appreciationMessages = [
    { emoji: '🔥', message: "You're on fire! Keep that streak alive — consistency beats intensity every time." },
    { emoji: '🌟', message: 'Small steps daily lead to giant leaps yearly. You are building something amazing.' },
    { emoji: '💪', message: 'Showing up is 90% of the battle. You already won today.' },
    { emoji: '🚀', message: 'Your habits are compounding — future you will be grateful.' },
    { emoji: '🎯', message: "Focus is a superpower. You're wielding it like a pro." },
    { emoji: '✨', message: "Every completed habit is a vote for the person you're becoming." },
    { emoji: '🏆', message: "Champions aren't born — they're made one habit at a time." },
    { emoji: '🌱', message: "Growth isn't always visible, but it's always happening. Keep going." },
    { emoji: '⚡', message: 'Discipline is choosing between what you want now and what you want most.' },
    { emoji: '🎉', message: "You've built more momentum than you realize. Celebrate that!" },
    { emoji: '💎', message: 'Pressure creates diamonds. Your daily effort is forging something brilliant.' },
    { emoji: '🧠', message: 'Your brain is rewiring itself with every repetition. Science is on your side.' },
    { emoji: '🌈', message: 'Tough days still count. Showing up imperfectly is better than not at all.' },
    { emoji: '🦁', message: 'Be the lion of your habits — fierce, focused, and relentless.' },
    { emoji: '❤️', message: "Self-improvement is an act of self-love. You're worth this effort." },
];

export async function GET(request: NextRequest) {
    try {
        requireAuth(request);

        const index = Math.floor(Math.random() * appreciationMessages.length);
        const selected = appreciationMessages[index];

        return NextResponse.json({
            ...selected,
            id: index,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch appreciation' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
