#!/usr/bin/env bash
# AI 语言实验室 · 部署 Cloudflare Worker（TTS + KV 云同步）
# 用法（在本机 bash / Git Bash 执行）：
#   CLOUDFLARE_API_TOKEN=xxxx CLOUDFLARE_ACCOUNT_ID=yyyy bash tools/deploy_worker.sh
# 说明：
#   - 凭证仅来自环境变量，不写入任何文件
#   - 自动创建 KV namespace（如 wrangler.toml 尚未绑定 SYNC_KV）
#   - 把 KV id 写入 wrangler.toml
#   - 重新 deploy 同一份 worker.js 到 ailab-tts.1905068699.workers.dev
#   - 部署后该地址的 /api/sync 即从 503 变为可用；前端同步面板默认复用此地址，无需改代码
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?缺少环境变量 CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?缺少环境变量 CLOUDFLARE_ACCOUNT_ID}"

cd "$(dirname "$0")/.."
TOML="$(pwd)/wrangler.toml"

if grep -q 'binding *= *"SYNC_KV"' "$TOML"; then
  echo "[1/3] wrangler.toml 已绑定 SYNC_KV，跳过创建。"
else
  echo "[1/3] 创建 KV namespace 'ailab-sync' ..."
  RESP=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"title":"ailab-sync"}')
  NS_ID=$(printf '%s' "$RESP" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(j.success?j.result.id:"")}catch(e){process.stdout.write("")}})')
  if [ -z "$NS_ID" ]; then echo "创建失败，Cloudflare 返回：$RESP"; exit 1; fi
  echo "      新 KV id = $NS_ID"
  node -e "const fs=require('fs');const p=process.argv[1];const id=process.argv[2];let t=fs.readFileSync(p,'utf8');t+='\n[[kv_namespaces]]\nbinding=\"SYNC_KV\"\nid=\"'+id+'\"\n';fs.writeFileSync(p,t);" "$TOML" "$NS_ID"
  echo "      已写入 wrangler.toml"
fi

echo "[2/3] 部署 Worker（npx wrangler deploy）..."
npx wrangler deploy

echo "[3/3] 验证健康检查与同步接口 ..."
echo "--- /health ---"
curl -s -m 20 "https://ailab-tts.1905068699.workers.dev/health" || echo "(请求失败)"
echo
echo "--- /api/sync?k=abcdef0123456789 (期望 ok:true,empty:true) ---"
curl -s -m 20 "https://ailab-tts.1905068699.workers.dev/api/sync?k=abcdef0123456789" || echo "(请求失败)"
echo
echo "部署完成。"
