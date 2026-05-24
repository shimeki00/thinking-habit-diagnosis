export type TypeId = `#${number}`

export type Choice = {
  id: 'A' | 'B' | 'C' | 'D' | 'E'
  text: string
  typeIds: string[]
}

export type Question = {
  id: string
  no: number
  part: string
  sceneCategory: string
  text: string
  choices: Choice[]
}

export type ThinkingHabitType = {
  id: TypeId
  no: number
  name: string
  category: string
  summary: string
  catchCopy: string
  typicalBehavior: string
  triggerScene: string
  protecting: string
  threatPerception: string
  strength: string
  weakness: string
  orgImpact: string
  action: string
  askOthers: string
  note: string
  resultPriority: number
}

export type Answer = {
  questionId: string
  choiceId: string
  selectedText: string
  typeIds: string[]
}

export type Section = { title: string; body: string }

export type TypeDetail = {
  intro: string[]
  strengths: Section[]
  weaknesses: Section[]
  triggerScenes: string[]
  teamImpact: string[]
  leverage: Section[]
  askOthers: string
  todayAction: string
  closingNote: string
}

export type ScoreResult = {
  scores: Record<string, number>
  correctionScores: Record<string, number>
  ranking: Array<{
    typeId: string
    score: number
    correctionScore: number
  }>
}
