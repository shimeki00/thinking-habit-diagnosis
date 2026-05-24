'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Sparkles, ChevronDown } from 'lucide-react'
import { calculateScore, getTopTypes } from '@/lib/scoring'
import { thinkingHabitTypes } from '@/data/thinkingHabitTypes'
import { typeDetails } from '@/data/typeDetails'
import { Answer, ThinkingHabitType, TypeId, TypeDetail, Section } from '@/types/diagnosis'
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
        detail: typeDetails[entry.typeId],
      }))
      .filter((e): e is typeof e & { type: ThinkingHabitType } => Boolean(e.type))
  }, [result, typeMap])

  useEffect(() => {
    if (!result || topRanking.length === 0) return
    if (saveAttempted.current) return
    saveAttempted.current = true
    if (!supabase) return
    if (isSaved()) return

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
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }

    supabase
      .from('thinking_habit_responses')
      .insert(payload)
      .then(({ error }) => {
        if (error) { console.error('Supabase insert failed:', error.message); return }
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
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          {/* ヘッダー */}
          <div className="p-6 sm:p-8 pb-4">
            <div className="mb-2 flex items-center gap-2 text-indigo-600">
              <Sparkles size={20} />
              <span className="text-sm font-semibold">あなたの1位タイプ</span>
            </div>
            <p className="text-xs font-medium text-slate-400">{top.type.category}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {top.type.name}
            </h1>
            <p className="mt-2 text-base font-medium text-indigo-700">
              {top.type.catchCopy}
            </p>

            {/* 目次チップ */}
            <nav className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'あなたはこんな人', href: '#intro' },
                { label: '強み', href: '#strengths' },
                { label: '気をつけたい時', href: '#weaknesses' },
                { label: '出やすい場面', href: '#scenes' },
                { label: '活かし方', href: '#leverage' },
                { label: '今日の1歩', href: '#today' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {top.detail && <TypeDetailView detail={top.detail} />}
        </section>
      )}

      {/* 2位・3位 */}
      {topRanking.length > 1 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">併発しやすい傾向</h2>
          <div className="space-y-3">
            {topRanking.slice(1, 3).map((entry, i) => (
              <SecondaryTypeCard key={entry.typeId} rank={i + 2} entry={entry} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        ※ この結果は回答時点の傾向を表したものです。状況や役割によって出やすい癖は変化します。固定的なラベルではなく、変化のヒントとしてご覧ください。
      </p>

      {/* フィードバック */}
      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">結果への納得度を教えてください（任意）</h2>
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

function renderBody(text: string): string {
  // blockquote: lines starting with "> " → <blockquote>
  const lines = text.split('\n')
  const out: string[] = []
  let inQuote = false
  for (const line of lines) {
    if (line.startsWith('> ')) {
      if (!inQuote) { out.push('<blockquote class="border-l-2 border-slate-300 pl-3 text-slate-500 italic my-1">'); inQuote = true }
      out.push(line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'))
    } else if (line === '>') {
      if (inQuote) out.push('')
    } else {
      if (inQuote) { out.push('</blockquote>'); inQuote = false }
      out.push(line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'))
    }
  }
  if (inQuote) out.push('</blockquote>')
  return out.join('\n')
}

function TypeDetailView({ detail }: { detail: TypeDetail }) {
  return (
    <div className="divide-y divide-slate-100">
      {/* あなたはこんな人 */}
      {detail.intro.length > 0 && (
        <div id="intro" className="scroll-mt-20 px-6 py-6 sm:px-8">
          <SectionHeading>あなたはこんな人</SectionHeading>
          <div className="mt-3 space-y-3">
            {detail.intro.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderBody(para) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 強み */}
      {detail.strengths.length > 0 && (
        <div id="strengths" className="scroll-mt-20 px-6 py-6 sm:px-8">
          <SectionHeading accent="emerald">強み</SectionHeading>
          <div className="mt-3 space-y-3">
            {detail.strengths.map((s, i) => (
              <SectionCard key={i} section={s} color="emerald" num={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* 気をつけたい時 */}
      {detail.weaknesses.length > 0 && (
        <div id="weaknesses" className="scroll-mt-20 px-6 py-6 sm:px-8">
          <SectionHeading accent="amber">強みが出すぎると</SectionHeading>
          <div className="mt-3 space-y-3">
            {detail.weaknesses.map((s, i) => (
              <SectionCard key={i} section={s} color="amber" num={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* 出やすい場面 */}
      {detail.triggerScenes.length > 0 && (
        <div id="scenes" className="scroll-mt-20 px-6 py-6 sm:px-8">
          <SectionHeading>出やすい場面</SectionHeading>
          <ul className="mt-3 space-y-2">
            {detail.triggerScenes.map((scene, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 text-slate-400">
                  <span className="block h-1.5 w-1.5 rounded-full bg-slate-300" />
                </span>
                {scene}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* チームへの影響 */}
      {detail.teamImpact.length > 0 && (
        <div className="px-6 py-6 sm:px-8">
          <SectionHeading>チームへの影響</SectionHeading>
          <div className="mt-3 rounded-lg bg-slate-50 p-4 space-y-3">
            {detail.teamImpact.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderBody(para) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 自分の活かし方 */}
      {detail.leverage.length > 0 && (
        <div id="leverage" className="scroll-mt-20 px-6 py-6 sm:px-8">
          <SectionHeading accent="indigo">自分の活かし方</SectionHeading>
          <div className="mt-3 space-y-3">
            {detail.leverage.map((s, i) => (
              <SectionCard key={i} section={s} color="indigo" num={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* 今日の1歩 */}
      {detail.todayAction && (
        <div id="today" className="scroll-mt-20 px-6 py-6 sm:px-8">
          <SectionHeading>今日の1歩</SectionHeading>
          <div className="mt-3 rounded-xl bg-indigo-600 p-5 text-white">
            <p className="text-sm leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: renderBody(detail.todayAction) }}
            />
          </div>
        </div>
      )}

      {/* 周囲に頼むこと */}
      {detail.askOthers && (
        <div className="px-6 py-6 sm:px-8">
          <SectionHeading>周囲に頼むこと</SectionHeading>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
            {detail.askOthers}
          </p>
        </div>
      )}

      {/* 注意書き */}
      {detail.closingNote && (
        <div className="px-6 py-5 sm:px-8">
          <p className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            {detail.closingNote}
          </p>
        </div>
      )}
    </div>
  )
}

function SectionHeading({ children, accent }: { children: React.ReactNode; accent?: 'emerald' | 'amber' | 'indigo' }) {
  const colors = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    indigo: 'text-indigo-700',
  }
  return (
    <h2 className={`text-sm font-bold ${accent ? colors[accent] : 'text-slate-800'}`}>
      {children}
    </h2>
  )
}

function SectionCard({ section, color, num }: { section: Section; color: 'emerald' | 'amber' | 'indigo'; num: number }) {
  const styles = {
    emerald: { badge: 'bg-emerald-100 text-emerald-700', card: 'border-emerald-100 bg-emerald-50' },
    amber: { badge: 'bg-amber-100 text-amber-700', card: 'border-amber-100 bg-amber-50' },
    indigo: { badge: 'bg-indigo-100 text-indigo-700', card: 'border-indigo-100 bg-indigo-50' },
  }
  const s = styles[color]
  return (
    <div className={`rounded-lg border p-4 ${s.card}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.badge}`}>
          {num}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{section.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: renderBody(section.body) }}
          />
        </div>
      </div>
    </div>
  )
}

function SecondaryTypeCard({
  rank,
  entry,
}: {
  rank: number
  entry: { typeId: string; score: number; type: ThinkingHabitType; detail?: TypeDetail }
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{entry.type.category}</p>
          <p className="font-semibold text-slate-800">{entry.type.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{entry.type.catchCopy}</p>
        </div>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && entry.detail && (
        <div className="border-t border-slate-100">
          <TypeDetailView detail={entry.detail} />
        </div>
      )}
    </div>
  )
}
