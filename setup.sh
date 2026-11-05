#!/bin/bash
# インターネット鎖国くん — Vercel デプロイセットアップ
set -e

REPO="internet-sakoku"
GITHUB_USER="Yomibito-Shirazu-jp"

echo "🔒 インターネット鎖国くん セットアップ"
echo "========================================"

# Git初期化
git init
git add -A
git commit -m "feat: initial commit — インターネット鎖国くん"

# GitHubリポジトリ作成 & push
echo ""
echo "📦 GitHubにpush..."
gh repo create "$GITHUB_USER/$REPO" --private --source=. --push

echo ""
echo "✅ GitHubにpush完了: https://github.com/$GITHUB_USER/$REPO"
echo ""
echo "次のステップ:"
echo "  1. https://vercel.com/new を開く"
echo "  2. '$REPO' を選択してImport"
echo "  3. 環境変数を設定（.env.local.example 参照）"
echo "  4. Deploy !"
