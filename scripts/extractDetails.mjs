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

// 発動場面はmd上では8項目あるが、重複・類似をまとめて5項目以内に再編集する。
// 表示で切り捨てるのではなく、内容を統合した編集版をここで一元管理する。
const SCENE_OVERRIDES = {
  '#1': [
    '部下に任せた仕事の品質や納期が不安な時',
    '顧客や上司からの期待が高く、自分が最終責任を負う案件',
    '部下の進みが遅く「自分でやった方が早い」と感じた時',
    '過去に任せて失敗した経験がある時',
    '自分の存在価値や貢献実感が揺らぐ時',
  ],
  '#2': [
    '仕事を渡した直後で、まだ報告がない時',
    '途中経過が見えにくい業務',
    '納期が近い、または期待値の高い案件',
    '過去にミスや遅延があった、力量がまだ読めないメンバーに任せる時',
    '自分が最終責任を負う仕事',
  ],
  '#3': [
    '初めて、または力量がまだ読めないメンバーに任せる時',
    '裁量や責任範囲を決め、どこまで口を出すか迷う時',
    '失敗の影響が大きく、品質や納期に不安がある仕事を渡す時',
    '部下から相談された時',
    '部下に嫌われたくないと感じる時',
  ],
  '#4': [
    '部下から質問され、答えを求められた時',
    '自分が知らない領域の判断を求められた時',
    '過去の成功体験が通用しない状況に直面した時',
    '部下が自分より詳しい領域で成果を出し、有能感が揺らぐ時',
    '会議で方針を求められ、力量を見られていると感じる時',
  ],
  '#5': [
    '耳の痛いフィードバックや改善点、問題行動を伝える時',
    '相手が落ち込んでいる、または関係性がまだ浅いメンバーに伝える時',
    '嫌われたくない相手に本音を伝える時',
    '会議で反対意見を言う必要がある時',
    'チームの空気が悪くなりそうな時',
  ],
  '#6': [
    '会議で意見が割れ、反対意見を言う必要がある時',
    'ネガティブな情報を共有する時',
    '上司や強いメンバーに違和感があり、言いにくい論点がある時',
    'その場で結論を出す、または部署間で利害がぶつかる時',
    'チームの空気が悪くなりそうな時',
  ],
  '#7': [
    '経営や上司との会議で、上位者の反応が気になる時',
    'すでに示された強い方針に違和感がある時',
    '現場の声を上げるべき時',
    '反対意見を出すと浮きそう、場の期待と自分の意見がズレている時',
    '評価や信頼に関わる場面',
  ],
  '#8': [
    '1on1や飲み会など、距離が近づく場面',
    '評価や指摘、厳しい指示を出す時',
    '部下との関係が変化する時や、年齢の近い若手と関わる時',
    '部下の本音を聞きたい時',
    '上司としての威厳が気になる時',
  ],
  '#9': [
    '同じミスが繰り返され、期待を裏切られた時',
    '成果基準が下がり、甘い空気がチームに広がっている時',
    '納期や品質に影響が出た時',
    '部下の当事者意識が低く、厳しくしなければと感じた時',
    '我慢していた不満が限界を超えた時',
  ],
  '#10': [
    '部下が不安や感情を出した、落ち込んでいる時',
    '共感を求められた時',
    '感情的な対立や、会議が感情論になっていると感じた時',
    '問題を早く解決したい時',
    '感情を扱うのが苦手で、弱く見られたくない時',
  ],
  '#11': [
    '成果が出ない時',
    '責任範囲を問われたり、フィードバックを受けた時',
    '他部署との連携やリソース不足など、外部要因に直面した時',
    '上層部の方針に納得できない時',
    '自分の非を認めるのが怖く、これ以上責任を負いたくない時',
  ],
  '#12': [
    '部下が困っている、悩みを打ち明けてくれた時',
    '頼られた時',
    '相手が自分で解決できそうだが、時間がかかる・進みが遅い時',
    '相手が失敗しそうに見える時',
    '自分が必要とされている感覚が欲しい時',
  ],
  '#13': [
    '資料や企画を提出する前、顧客や上司に見せる前',
    '部下の成果物をレビューする時',
    '品質や専門性が評価され、ミスが目立ちやすい案件',
    '正解が見えにくい企画初期',
    '周囲からの期待値が高い時',
  ],
  '#14': [
    '昇進直後や、新しい役割を任された時',
    '自分より経験豊富なメンバーを率いる時',
    '成果を褒められたり、人前で実績を話す時',
    '大きな意思決定を求められた時',
    '周囲の期待が高まり、失敗で評価が下がりそうな時',
  ],
  '#15': [
    '新しいやり方やツールが導入され、環境が変化する時',
    '過去のやり方が通用しにくく、自分の得意領域が相対化された時',
    '若手や中途の活躍を見る時',
    '自分の経験が軽く扱われ、新しい価値観に違和感がある時',
    '現場感のない改革に見える時',
  ],
  '#16': [
    '予定に空きがある、または周囲が忙しそうな時',
    '自分の貢献が見えにくく、仕事量が価値に見える職場にいる時',
    '休むことや、考える時間を取ることに罪悪感がある時',
    '最近どうか聞かれた時',
    '部下に任せるより自分でやった方が早いと感じる時',
  ],
  '#17': [
    'チームが成果を出し、上位者へ報告する時',
    '部下のアイデアが評価され、部下が自分より目立った時',
    '自分の関与が見えにくく、管理職としての存在価値が不安な時',
    '同僚や他部署と比較される時',
    '成果の功労者を問われた時',
  ],
  '#18': [
    '新しい挑戦や、知らない領域の判断を求められた時',
    '自信がないテーマに向き合い、まだ準備不足だと思う時',
    '資格や研修が安心材料に見え、実践より学習の方が安全に感じる時',
    '失敗した時の影響が大きく見える時',
    '周囲に詳しい人がいる時',
  ],
  '#19': [
    '褒められたり、期待をかけられた時',
    '人前で成果を話す、注目を浴びた時',
    '自信があるように見られたくない、失敗で責められそうな時',
    'フィードバックを受ける時',
    '場を和ませたい時',
  ],
  '#20': [
    '前例がなく、これまでのやり方が通用しない判断を求められた時',
    '曖昧で方針が固まっていない状況で責任を持つ時',
    '上司から明確な答えが示されていない時',
    '複数の選択肢で迷う時',
    '失敗の影響が大きく、評価や信頼に関わる判断',
  ],
  '#21': [
    '過去に失敗した領域に似た判断や、責任を問われた経験を思い出す時',
    'リスクある提案や、若手・部下の楽観的な提案を受けた時',
    '新しい施策や、前例の少ない仕事に取り組む時',
    '失敗時の影響が大きく見える時',
    '同じ痛みを繰り返したくない時',
  ],
  '#22': [
    '評価面談の前後や、上位者に報告する時',
    '自分の成果が見えにくく、周囲から反応が返ってこない時',
    '失敗すると評価が下がりそう、「どう思われるか」が気になる時',
    '他マネージャーと比較される時',
    '方針に自信がない時',
  ],
  '#23': [
    '新しい施策を提案する、リスクを伴う判断を求められた時',
    '情報が不完全で、コントロールできない要素が多い時',
    '過去の失敗が思い出される時',
    '想定外の変化が起きた時',
    '自分が責任を負う判断をするのに、周囲が楽観的すぎると感じる時',
  ],
  '#24': [
    '業務改善や変革を求められ、新しい提案が出た時',
    '前例のないやり方を試す、責任ある変更判断をする時',
    '現場が混乱しそう、失敗の責任が自分に来そうな時',
    '過去のやり方で一定の成果が出ている時',
    '変更の効果がまだ見えない時',
  ],
  '#25': [
    '上司からの改善指摘や360度フィードバックを受けた時',
    '自分の判断を否定され、有能感が揺らぐ時',
    '言い方がきつい、人前で指摘された時',
    '部下から率直な意見をもらった時',
    '失敗や弱点を認める必要がある時',
  ],
  '#26': [
    '同僚が昇進した、他チームが表彰された時',
    '部下や同僚の成果が注目され、大きく取り上げられた時',
    '評価枠が限られた競争的な職場にいる時',
    '自分の成果が見えにくい時',
    '自分が置いていかれたように感じた時',
  ],
  '#27': [
    '組織方針に納得がいかず、上位者に違和感がある時',
    '変革テーマが始まる時',
    '過去に提案が通らず、自分の影響力を信じにくい時',
    '周囲だけが盛り上がっている時',
    '本気で関わると傷つきそう、失望したくない時',
  ],
  '#28': [
    '採用・抜擢や、次世代リーダーを選ぶ時',
    '評価面談で人材の可能性を見る、育成対象を選ぶ時',
    '1on1で相性を感じ、自分と似た考えの部下に出会った時',
    '自分と違う価値観の人を理解しにくい時',
    '成果の出し方が自分と違うメンバーを見る時',
  ],
  '#29': [
    '苦手な部下に対応する時',
    '世代や職種、タイプ分類で相手を捉える時',
    '過去の印象が強く、相手の行動が理解しにくいメンバーを見る時',
    '短時間で判断し、相手に振り回されたくない時',
    'チーム編成を考える時',
  ],
  '#30': [
    '部下が自分と違う進め方をし、やり方が遠回りに見える時',
    '納期が迫り、品質に不安がある時',
    '自分の経験がある領域で相談され、成功体験が強く思い出される時',
    '成果が出ていない部下に助言する時',
    '若手や未経験者に教える時',
  ],
  '#31': [
    '新メンバーが期待通りに動かない時',
    '文化の違うメンバーと働き、業務の前提がずれた時',
    '報連相の基準が合わない時',
    '「普通はこうする」と感じる、チームの基準が下がって見える時',
    '説明が面倒で、スピードを優先したい時',
  ],
  '#32': [
    '部下のペースが遅く、結論を出すのに時間がかかる時',
    'じっくり考える必要がある局面や、会議で議論が長引く時',
    '納期が迫っている時',
    'チャンスを逃しそうに見える時',
    '自分ならすぐできると思う、停滞した空気が苦手な時',
  ],
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

  // 発動場面（統合済みの編集版があればそれを使う）
  const sceneSec = find('発動')
  const extractedScenes = sceneSec ? toBullets(sceneSec.lines) : []
  const triggerScenes = SCENE_OVERRIDES[id] ?? extractedScenes
  if (triggerScenes.length === 0) warnings.push(`WARN triggerScenes empty: ${fname}`)
  if (!SCENE_OVERRIDES[id]) warnings.push(`WARN no scene override (using ${extractedScenes.length} raw): ${fname}`)

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
