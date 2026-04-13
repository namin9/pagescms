#!/bin/bash
npm run build
npx @opennextjs/cloudflare@latest build

mkdir -p .open-next/assets/_worker.js
mv .open-next/worker.js .open-next/assets/_worker.js/index.js
mv .open-next/cloudflare .open-next/assets/_worker.js/
mv .open-next/server-functions .open-next/assets/_worker.js/
mv .open-next/middleware .open-next/assets/_worker.js/
mv .open-next/.build .open-next/assets/_worker.js/

# 25MB 용량 제한 통과를 위한 찌꺼기 파일 다이어트
find .open-next/assets/_worker.js -name "*.map" -type f -delete
find .open-next/assets/_worker.js -name "*.md" -type f -delete