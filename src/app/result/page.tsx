'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Sparkles } from 'lucide-react'
import ResultCard from '@/components/ResultCard'
import { calculateScore, getTopTypes } from '@/lib/scoring'
import { thinkingHabitTypes } from '@/data/thinkingHabitTypes'
import { Answer, ThinkingHabitType, TypeId } from '@/types/diagnosis'
import { supabase } from '@/lib/supabase'
import {
  clearDiagnosis,
  getAnswers,
  getProfile,
  getResponseId,
  isSaved,
  setResponseId,
  setSaved,
} from '@/lib/storage'

export default function ResultPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [answers, setAnswersState] = useState<Record<string, Answer>>({})
  const [satisfaction, setSatisfaction] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const saveAttempted = useRef(false)

  const typeMap = useMemo(
    () => new Map(thinkingHabitTypes.map((t) => [t.id, t])),
    []
  )

  useEffect(() => {
    const saved = getAnswers()
    if (Object.keys(saved).length === 0) {
      router.replace('/')
      return
    }
    setAnswersState(saved)
    setHydrated(true)
  }, [router])

  const result = useMemo(() => {
    if (!hydrated) return null
    return calculateScore(Object.values(answers), thinkingHabitTypes)
  }, [hydrated, answers])

  const topRanking = useMemo(() => {
    if (!result) return []
    return getTopTypes(result, 3)
      .map((entry) => ({
        ...entry,
        type: typeMap.get(entry.typeId as TypeId),
      }))
      .filter((e): e is typeof e & { type: ThinkingHabitType } => Boolean(e.type))
  }, [result, typeMap])

  // 結果が確定したらSupabaseに1度だけ保存する
  useEffect(() => {
    if (!result || topRanking.length === 0) return
    if (saveAttempted.current) return
    saveAttempted.current = true

    if (!supabase) return // Supabase未設定なら何もしない（アプリは壊さない）
    if (isSaved()) return // 既に保存済みなら二重insertしない

    const profile = getProfile()
    const id = getResponseId() ?? crypto.randomUUID()
    setResponseId(id)

    const payload = {
      id,
      name: profile.name || null,
      email: profile.email || null,
      answers,
      scores: result.scores,
      correction_scores: result.correctionScores,
      ranking: result.ranking,
      top_type_id: topRanking[0]?.typeId ?? null,
      second_type_id: topRanking[1]?.typeId ?? null,
      third_type_id: topRanking[2]?.typeId ?? null,
      top_category: topRanking[0]?.type.category ?? null,
      source: 'beta',
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }

    supabase
      .from('thinking_habit_responses')
      .insert(payload)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase insert failed:', error.message)
          return
        }
        setSaved(true)
      })
  }, [result, topRanking, answers])

  const handleSubmitFeedback = async () => {
    setFeedbackSent(true)
    if (!supabase) return
    const id = getResponseId()
    if (!id) return
    const { error } = await supabase
      .from('thinking_habit_responses')
      .update({ satisfaction, feedback: feedback.trim() || null })
      .eq('id', id)
    if (error) console.error('Supabase feedback update failed:', error.message)
  }

  const handleRestart = () => {
    clearDiagnosis()
    router.push('/')
  }

  if (!hydrated || !result) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10 text-slate-400">
        結果を計算中…
      </main>
    )
  }

  const top = topRanking[0]

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
      <div className="mb-6 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-100">
        この結果は開発中のβ版です。現時点では、自己理解と対話のきっかけとしてご活用ください。
      </div>

      {top && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="mb-2 flex items-center gap-2 text-indigo-600">
            <Sparkles size={20} />
            <span className="text-sm font-semibold">あなたの1位タイプ</span>
          </div>
          <p className="text-xs font-medium text-slate-400">
            {top.type.category}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {top.type.name}
          </h1>
          <p className="mt-2 text-base font-medium text-indigo-700">
            {top.type.catchCopy}
          </p>

          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {top.type.summary}
          </p>

          <dl className="mt-6 space-y-4">
            <ResultDetail label="強みとして出る時" value={top.type.strength} />
            <ResultDetail label="弱みとして出る時" value={top.type.weakness} />
            <ResultDetail label="今日の1アクション" value={top.type.action} />
            <ResultDetail label="周囲に頼むこと" value={top.type.askOthers} />
          </dl>

          {top.type.note && (
            <p className="mt-6 rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              {top.type.note}
            </p>
          )}
        </section>
      )}

      {topRanking.length > 1 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            併発しやすい傾向
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {topRanking.slice(1, 3).map((entry, i) => (
              <ResultCard
                key={entry.typeId}
                rank={i + 2}
                type={entry.type}
                score={entry.score}
              />
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        ※
        この結果は回答時点の傾向を表したものです。状況や役割によって出やすい癖は変化します。固定的なラベルではなく、変化のヒントとしてご覧ください。
      </p>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          結果への納得度を教えてください（任意）
        </h2>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSatisfaction(n)}
              disabled={feedbackSent}
              className={`h-10 w-10 rounded-full border text-sm font-bold transition disabled:opacity-60 ${
                satisfaction === n
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400">1：当てはまらない 〜 5：とても当てはまる</p>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={feedbackSent}
          rows={3}
          placeholder="感想や、しっくりこなかった点があれば教えてください"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
        />

        <button
          type="button"
          onClick={handleSubmitFeedback}
          disabled={feedbackSent}
          className="mt-3 rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-900 disabled:opacity-50"
        >
          {feedbackSent ? '送信しました。ありがとうございます' : 'フィードバックを送る'}
        </button>
      </section>

      <button
        type="button"
        onClick={handleRestart}
        className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <RotateCcw size={16} />
        もう一度診断する
      </button>
    </main>
  )
}

function ResultDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-indigo-600">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-slate-700">{value}</dd>
    </div>
  )
}
