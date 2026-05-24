import { ThinkingHabitType } from '@/types/diagnosis'

type ResultCardProps = {
  rank: number
  type: ThinkingHabitType
  score: number
}

export default function ResultCard({ rank, type, score }: ResultCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          {rank}
        </span>
        <span className="text-xs font-medium text-slate-400">
          {type.category}
        </span>
        <span className="ml-auto text-xs text-slate-400">
          {score.toFixed(1)}pt
        </span>
      </div>
      <h3 className="text-base font-bold text-slate-900">{type.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{type.catchCopy}</p>
    </div>
  )
}
