# codex-build123d-modeling

## 日本語

Codex に自然言語で依頼して、[build123d](https://build123d.readthedocs.io/) のモデルコードを作成するためのテンプレートです。作成したモデルは GLB・STEP・STL 形式へ出力し、ブラウザ上のビューアで確認できます。

このリポジトリは AI API を組み込んだアプリケーションではありません。リポジトリ内で Codex を起動し、作りたいモデルを依頼して使用します。モデルのソースコードも成果物として保存されるため、生成後の確認や修正が可能です。

### 必要なもの

- [Codex](https://openai.com/codex/)
- [uv](https://docs.astral.sh/uv/)
- [pnpm](https://pnpm.io/)

### セットアップ

リポジトリをクローンし、プロジェクトのルートで依存関係をインストールします。

```powershell
git clone https://github.com/opvelll/codex-build123d-modeling.git
cd codex-build123d-modeling
uv sync
pnpm install
```

### Codex にモデルを依頼する

Codex アプリなどでこのプロジェクトを開き、自然言語で依頼します。

依頼例:

> パイプ椅子をモデリングして。モデルをビルドし、GLB・STEP・STLを生成してビューアで確認できるようにしてください。

Codex はモデルごとに `models/<model-id>/model.py` を作成します。モデルコードは `MODEL` メタデータと、build123d の形状を返す `build_model()` 関数を公開します。

### モデルを生成する

特定のモデルだけを生成する場合:

```powershell
uv run python build_models.py pipe_chair
```

すべてのモデルを生成する場合:

```powershell
uv run python build_models.py --all
```

生成されたファイルは `output/<model-id>/` に保存され、モデル一覧は `output/models.json` に書き出されます。

```text
output/pipe_chair/pipe_chair.glb
output/pipe_chair/pipe_chair.step
output/pipe_chair/pipe_chair.stl
output/models.json
```

### ブラウザで確認する

開発サーバーを起動します。

```powershell
pnpm dev
```

ブラウザで <http://127.0.0.1:4173/viewer.html> を開いてください。ビューアは `output/models.json` を読み込むため、モデルを追加するたびに React の画面を編集する必要はありません。

![パイプ椅子を表示したモデルビューア](<doc/スクリーンショット 2026-06-14 204326.png>)

### 主なディレクトリ

```text
models/
  pipe_chair/
    model.py       # build123dのモデルソース
output/
  pipe_chair/      # 生成されたGLB・STEP・STL
  models.json      # ビューアが読み込むモデル一覧
src/               # React・Three.js製のビューア
build_models.py    # モデルの検証、出力、一覧生成
```

### 確認コマンド

```powershell
pnpm test
pnpm build
```

### ライセンス

このリポジトリは [MIT License](LICENSE) で公開します。

---

## English

This repository is a template for asking Codex to create reviewable [build123d](https://build123d.readthedocs.io/) model code. Models can be exported as GLB, STEP, and STL files and inspected in the browser-based viewer.

It is not an application with an embedded AI API. Open the repository in Codex and describe the model you want to create. The generated model source remains part of the project, so it can be reviewed and edited after generation.

### Requirements

- [Codex](https://openai.com/codex/)
- [uv](https://docs.astral.sh/uv/)
- [pnpm](https://pnpm.io/)

### Setup

Clone the repository and install the dependencies from the project root.

```powershell
git clone https://github.com/opvelll/codex-build123d-modeling.git
cd codex-build123d-modeling
uv sync
pnpm install
```

### Ask Codex for a model

Open this project in the Codex app or another Codex environment and describe the model in natural language.

Example request:

> Model a folding pipe chair. Build the model, generate GLB, STEP, and STL files, and make it available in the viewer.

For each model, Codex creates `models/<model-id>/model.py`. The model module exposes `MODEL` metadata and a `build_model()` function that returns the build123d shape.

### Generate model files

Generate one model:

```powershell
uv run python build_models.py pipe_chair
```

Generate every model:

```powershell
uv run python build_models.py --all
```

Generated files are written to `output/<model-id>/`, and the model catalog is written to `output/models.json`.

```text
output/pipe_chair/pipe_chair.glb
output/pipe_chair/pipe_chair.step
output/pipe_chair/pipe_chair.stl
output/models.json
```

### Inspect models in the browser

Start the development server:

```powershell
pnpm dev
```

Open <http://127.0.0.1:4173/viewer.html>. The viewer reads `output/models.json`, so adding a model does not require a model-specific React screen.

![Model viewer displaying the folding pipe chair](<doc/スクリーンショット 2026-06-14 204326.png>)

### Repository layout

```text
models/
  pipe_chair/
    model.py       # Reviewable build123d model source
output/
  pipe_chair/      # Generated GLB, STEP, and STL files
  models.json      # Model catalog read by the viewer
src/               # React and Three.js viewer
build_models.py    # Model validation, export, and catalog generation
```

### Verification

```powershell
pnpm test
pnpm build
```

### License

This repository is available under the [MIT License](LICENSE).
