import { Answer, ScoreResult, ThinkingHabitType, TypeId } from '@/types/diagnosis'

export function calculateScore(
  answers: Answer[],
  types: ThinkingHabitType[]
): ScoreResult {
  const scores: Record<string, number> = {}
  const correctionScores: Record<string, number> = {}

  for (const type of types) {
    scores[type.id] = 0
    correctionScores[type.id] = 0
  }

  for (const answer of answers) {
    const questionNo = Number(answer.questionId.replace('Q', ''))
    const isCorrection = questionNo >= 29
    const point = isCorrection ? 0.4 : 1

    for (const typeId of answer.typeIds) {
      if (!typeId.startsWith('#')) continue
      if (!(typeId in scores)) continue

      scores[typeId] += point

      if (isCorrection) {
        correctionScores[typeId] += point
      }
    }
  }

  const typeMap = new Map(types.map((type) => [type.id, type]))

  const ranking = Object.entries(scores)
    .map(([typeId, score]) => ({
      typeId,
      score,
      correctionScore: correctionScores[typeId] ?? 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      if (b.correctionScore !== a.correctionScore) {
        return b.correctionScore - a.correctionScore
      }

      const typeA = typeMap.get(a.typeId as TypeId)
      const typeB = typeMap.get(b.typeId as TypeId)

      if ((typeA?.resultPriority ?? 999) !== (typeB?.resultPriority ?? 999)) {
        return (typeA?.resultPriority ?? 999) - (typeB?.resultPriority ?? 999)
      }

      return (typeA?.no ?? 999) - (typeB?.no ?? 999)
    })

  return { scores, correctionScores, ranking }
}

export function getTopTypes(result: ScoreResult, count = 3) {
  return result.ranking.slice(0, count)
}
