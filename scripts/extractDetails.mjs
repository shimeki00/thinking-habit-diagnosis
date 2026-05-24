import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MD_DIR = '/Users/shimeki/Downloads/プライベート、シェア 7/思考の癖32タイプ 定義マスター'
const OUT = path.join(__dirname, '../src/data/typeDetails.ts')

function parseFrontmatter(content) {
  const lines = content.split('\n')
  const result = {}
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.+)$/)
    if (m) result[m[1].trim()] = m[2].trim()
  }
  return result
}

function splitSections(body) {
  const sections = []
  let current = null
  for (const line of body.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { heading: line.slice(3).trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

function parseSubSections(lines) {
  const subs = []
  let cur = null
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (cur) subs.push(cur)
      cur = { title: line.replace(/^###\s+\d+\.\s*/, '').trim(), bodyLines: [] }
    } else if (cur) {
      cur.bodyLines.push(line)
    }
  }
  if (cur) subs.push(cur)
  return subs.map(s => ({ title: s.title, body: s.bodyLines.join('\n').trim() }))
}

function toParas(lines) {
  return lines.join('\n').split(/\n\n+/).map(s => s.trim()).filter(Boolean)
}

function toBullets(lines) {
  return lines
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim())
}

const files = fs.readdirSync(MD_DIR).filter(f => f.endsWith('.md'))
const details = {}
const warnings = []

for (const fname of files) {
  const raw = fs.readFileSync(path.join(MD_DIR, fname), 'utf-8')
  // フロントマターは最初の # 見出し行より前（行頭から始まるキー: 値形式）
  const firstHeading = raw.indexOf('\n## ')
  const title1idx = raw.indexOf('\n# ')
  // ID を取得
  const idMatch = raw.match(/^ID:\s*(#\d+)/m)
  if (!idMatch) { warnings.push(`SKIP (no ID): ${fname}`); continue }
  const id = idMatch[1]

  // 本文（最初の ## 以降）
  const bodyStart = raw.indexOf('\n## ')
  if (bodyStart === -1) { warnings.push(`SKIP (no ## sections): ${fname}`); continue }
  const body = raw.slice(bodyStart + 1)
  const sections = splitSections(body)

  const find = (...keywords) => sections.find(s => keywords.some(k => s.heading.includes(k)))

  // intro: 最初の ## セクション（タイプ名が入っている見出し）の本文
  const introSec = sections[0]
  const intro = toParas(introSec?.lines ?? [])

  // 強み
  const strengthSec = find('強み')
  const strengths = strengthSec ? parseSubSections(strengthSec.lines) : []
  if (strengths.length === 0) warnings.push(`WARN strengths empty: ${fname}`)

  // 弱み
  const weakSec = find('弱み', '注意点')
  const weaknesses = weakSec ? parseSubSections(weakSec.lines) : []
  if (weaknesses.length === 0) warnings.push(`WARN weaknesses empty: ${fname}`)

  // 発動場面
  const sceneSec = find('発動')
  const triggerScenes = sceneSec ? toBullets(sceneSec.lines) : []
  if (triggerScenes.length === 0) warnings.push(`WARN triggerScenes empty: ${fname}`)

  // チームへの影響
  const teamSec = find('チーム', '影響')
  const teamImpact = teamSec ? toParas(teamSec.lines) : []

  // 自分の活かし方
  const leverageSec = find('活かし方', '活かす')
  const leverage = leverageSec ? parseSubSections(leverageSec.lines) : []

  // 周囲に頼むこと
  const askSec = find('周囲に頼む', '頼む')
  const askOthers = askSec ? toParas(askSec.lines).join('\n\n') : ''

  // 今日の1アクション
  const actionSec = find('1アクション', 'アクション', '1歩')
  const todayAction = actionSec ? toParas(actionSec.lines).join('\n\n') : ''

  // 注意書き（'注意点'を含む弱みセクションと混同しないよう厳密に）
  const noteSec = sections.find(s => s.heading === '注意書き')
  const closingNote = noteSec ? toParas(noteSec.lines).join('\n\n') : ''

  details[id] = { intro, strengths, weaknesses, triggerScenes, teamImpact, leverage, askOthers, todayAction, closingNote }
}

// 生成
const json = JSON.stringify(details, null, 2)
  .replace(/"([^"]+)":/g, (_, k) => `  ${k}:`)  // not valid TS; use JSON import instead

// TSとして書き出す
const tsContent = `import { TypeDetail } from '@/types/diagnosis'

export const typeDetails: Record<string, TypeDetail> = ${JSON.stringify(details, null, 2)}
`
fs.writeFileSync(OUT, tsContent, 'utf-8')

console.log(`\n✅ Generated ${Object.keys(details).length} types → src/data/typeDetails.ts`)
if (warnings.length) {
  console.log('\n⚠️  Warnings:')
  warnings.forEach(w => console.log(' ', w))
}
