'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Clock } from 'lucide-react'
import { questions } from '@/data/questions'
import { clearDiagnosis, getProfile, setProfile } from '@/lib/storage'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const profile = getProfile()
    setName(profile.name)
    setEmail(profile.email)
  }, [])

  const handleStart = () => {
    setProfile({ name: name.trim(), email: email.trim() })
    // 新しい診断を始めるので、前回の回答・保存フラグはリセットする
    clearDiagnosis()
    router.push('/diagnosis')
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:py-16">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div className="mb-4 flex items-center gap-2 text-indigo-600">
          <Brain size={28} />
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold">
            β版
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          思考の癖診断
        </h1>

        <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
          <Clock size={16} />
          <span>所要時間：5〜8分（全{questions.length}問）</span>
        </div>

        <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {`この診断は、あなたのマネジメント場面で無意識に出やすい「思考の癖」を可視化するためのものです。
良い／悪いを判定するものではなく、行動変容のヒントを得るための自己理解ツールです。
直近1〜3ヶ月の実際の行動を思い出し、「理想の自分」ではなく「実際に近い自分」で回答してください。`}
        </p>

        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-100">
          これは開発中のβ版です。結果は自己理解と対話のきっかけとしてご活用ください。
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              お名前（任意）
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              メールアドレス（任意）
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-base font-bold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
        >
          診断をはじめる
        </button>
      </div>
    </main>
  )
}
