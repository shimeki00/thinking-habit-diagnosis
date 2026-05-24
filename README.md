# 思考の癖診断 β版

マネジメント場面で無意識に出やすい「思考の癖」を可視化する自己理解ツール（β版）。
32問（サンプル版は6問）に回答すると、上位3タイプが表示され、回答データを Supabase に保存できます。

技術スタック：Next.js (App Router) / TypeScript / Tailwind CSS / Supabase / Vercel

---

## 1. ローカルで動かす

```bash
cd thinking-habit-diagnosis
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。
Supabase 未設定でも診断〜結果表示まで動作します（保存だけ行われません）。

> **メモ：webpack を使っています**
> このリポジトリの `dev` / `build` は `--webpack` 付きで実行します（`package.json` の scripts）。
> 親フォルダ名に日本語（マルチバイト文字）が含まれると Turbopack がビルド時に panic するため、回避策として webpack を使用しています。
> Vercel 上のパスは ASCII なので問題は出ませんが、scripts のままで問題なくデプロイできます。

---

## 2. Supabase 設定

### 2-1. テーブル作成

Supabase の SQL Editor で以下を実行：

```sql
create table if not exists thinking_habit_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  email text,
  answers jsonb not null,
  scores jsonb not null,
  correction_scores jsonb,
  ranking jsonb not null,
  top_type_id text,
  second_type_id text,
  third_type_id text,
  top_category text,
  source text default 'beta',
  feedback text,
  satisfaction integer,
  user_agent text
);

alter table thinking_habit_responses enable row level security;

create policy "Allow anonymous insert"
on thinking_habit_responses
for insert
to anon
with check (true);

create policy "Do not allow anonymous select"
on thinking_habit_responses
for select
to anon
using (false);

create policy "Allow anonymous update feedback only"
on thinking_habit_responses
for update
to anon
using (true)
with check (true);
```

> テスト版のため匿名 insert を許可しています。本番化する際はポリシーを見直してください。

### 2-2. 環境変数

プロジェクト直下に `.env.local` を作成：

```
NEXT_PUBLIC_SUPABASE_URL=SupabaseのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabaseのanon public key
```

値は Supabase ダッシュボードの Project Settings → API から取得します。
設定後、`npm run dev` を再起動すると結果画面表示時に回答が保存されます。

> **保存の仕組み**：結果画面の表示時に1回だけ insert します。
> 行 ID はクライアントで生成して localStorage に保持し、同じ回答を二重保存しません。
> 納得度・自由記述は「フィードバックを送る」で同じ行に update されます。

---

## 3. 本データへの差し替え

現在 `src/data/thinkingHabitTypes.ts` と `src/data/questions.ts` は **サンプルデータ**（プレースホルダ）です。
Notion の以下2つの DB から出力した完全データに差し替えてください。

- 🧠 思考の癖32タイプ 定義マスター → `thinkingHabitTypes.ts`（32件）
- 🧭 思考の癖診断 32問版｜設問設計DB → `questions.ts`（Q01〜Q32）

差し替え時の注意：

- 文言は要約・修正しない
- `typeIds` は必ず文字列配列にする（例：`"#1,#3,#20"` → `["#1", "#3", "#20"]`）
- `"補正：低リスク"` は `["補正：低リスク"]` とする（スコアリングでは加点されません）
- Q29〜Q32 は補正設問（+0.4点）、Q01〜Q28 は通常設問（+1点）
- 差し替え後 `npm run build` が通ることを確認

---

## 4. Vercel デプロイ

1. このプロジェクトを GitHub リポジトリに push
2. Vercel で New Project → 該当リポジトリを Import
   - サブフォルダ構成のため、Root Directory に `thinking-habit-diagnosis` を指定
3. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
4. Deploy
5. 公開 URL で診断 → 結果表示 → Supabase に保存されることを確認

---

## 5. 動作確認チェックリスト

ローカル：
- [ ] `npm run dev` で起動できる
- [ ] 名前・メール未入力でも開始できる
- [ ] 全設問を回答できる／未回答では次へ進めない／戻れる
- [ ] 結果画面で 1位・2位・3位が表示される
- [ ] Supabase 未設定でも結果画面が表示される
- [ ] Supabase 設定済みなら回答が保存される

ビルド：
- [ ] `npm run build` が成功する（TypeScript / ESLint エラーなし）

Vercel：
- [ ] Import できる／環境変数を設定できている
- [ ] 公開 URL で診断が動き、Supabase に保存される

---

## ディレクトリ構成

```
src/
  app/
    page.tsx            トップ画面
    diagnosis/page.tsx  設問画面
    result/page.tsx     結果画面（スコア計算・Supabase保存）
  components/
    ProgressBar.tsx
    QuestionCard.tsx
    ResultCard.tsx
  data/
    questions.ts            ← 本データに差し替え
    thinkingHabitTypes.ts   ← 本データに差し替え
  lib/
    scoring.ts   スコアリング
    shuffle.ts   選択肢シャッフル
    storage.ts   localStorage 管理
    supabase.ts  Supabaseクライアント（未設定なら null）
  types/
    diagnosis.ts
```
