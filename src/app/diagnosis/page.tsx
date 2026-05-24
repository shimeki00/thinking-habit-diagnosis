'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import QuestionCard from '@/components/QuestionCard'
import { questions } from '@/data/questions'
import { shuffleArray } from '@/lib/shuffle'
import { Answer, Choice } from '@/types/diagnosis'
import { getAnswers, setAnswers } from '@/lib/storage'

export default function DiagnosisPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswersState] = useState<Record<string, Answer>>({})

  // 選択肢の並び順は問題ごとに一度だけシャッフルし、戻っても同じ順序を保つ
  const shuffledChoices = useMemo(() => {
    const map: Record<string, Choice[]> = {}
    for (const q of questions) {
      map[q.id] = shuffleArray(q.choices)
    }
    return map
  }, [])

  useEffect(() => {
    const saved = getAnswers()
    setAnswersState(saved)
    // 最初の未回答設問から再開する
    const firstUnanswered = questions.findIndex((q) => !saved[q.id])
    setCurrentIndex(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered)
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10 text-slate-400">
        読み込み中…
      </main>
    )
  }

  const total = questions.length
  const question = questions[currentIndex]
  const currentAnswer = answers[question.id]
  const isLast = currentIndex === total - 1

  const handleSelect = (choice: Choice) => {
    const answer: Answer = {
      questionId: question.id,
      choiceId: choice.id,
      selectedText: choice.text,
      typeIds: choice.typeIds,
    }
    const next = { ...answers, [question.id]: answer }
    setAnswersState(next)
    setAnswers(next)

    setTimeout(() => {
      if (currentIndex === total - 1) {
        router.push('/result')
      } else {
        setCurrentIndex((i) => i + 1)
      }
    }, 300)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const handleNext = () => {
    if (!currentAnswer) return
    if (isLast) {
      router.push('/result')
      return
    }
    setCurrentIndex(currentIndex + 1)
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
      <div className="mb-6">
        <ProgressBar current={currentIndex + 1} total={total} />
      </div>

      <QuestionCard
        question={question}
        choices={shuffledChoices[question.id]}
        selectedChoiceId={currentAnswer?.choiceId ?? null}
        onSelect={handleSelect}
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} />
          戻る
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!currentAnswer}
          className="flex items-center gap-1 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? '結果を見る' : '次へ'}
          {!isLast && <ChevronRight size={18} />}
        </button>
      </div>

      {!currentAnswer && (
        <p className="mt-3 text-center text-xs text-slate-400">
          選択すると次へ進めます
        </p>
      )}
    </main>
  )
}
