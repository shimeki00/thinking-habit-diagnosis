'use client'

import { Check } from 'lucide-react'
import { Choice, Question } from '@/types/diagnosis'

type QuestionCardProps = {
  question: Question
  choices: Choice[]
  selectedChoiceId: string | null
  onSelect: (choice: Choice) => void
}

export default function QuestionCard({
  question,
  choices,
  selectedChoiceId,
  onSelect,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <p className="mb-1 text-xs font-semibold tracking-wide text-indigo-600">
        {question.part} ・ {question.sceneCategory}
      </p>
      <h2 className="mb-6 text-lg font-bold leading-relaxed text-slate-900 sm:text-xl">
        {question.text}
      </h2>

      <ul className="space-y-3">
        {choices.map((choice) => {
          const selected = choice.id === selectedChoiceId
          return (
            <li key={choice.id}>
              <button
                type="button"
                onClick={() => onSelect(choice)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition sm:text-base ${
                  selected
                    ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    selected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  {selected ? <Check size={14} strokeWidth={3} /> : ''}
                </span>
                <span className="text-slate-800">{choice.text}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
