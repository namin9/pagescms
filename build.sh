#!/bin/bash
# 1. 넥스트 빌드 및 OpenNext 변환
npm run build
npx @opennextjs/cloudflare@latest build

# 2. Cloudflare Pages가 인식할 수 있도록 _worker.js 폴더 생성
mkdir -p .open-next/assets/_worker.js

# 3. 흩어진 파일들을 모두 _worker.js 폴더 안으로 이사시키기
mv .open-next/worker.js .open-next/assets/_worker.js/index.js
mv .open-next/cloudflare .open-next/assets/_worker.js/
mv .open-next/server-functions .open-next/assets/_worker.js/
mv .open-next/middleware .open-next/assets/_worker.js/
mv .open-next/.build .open-next/assets/_worker.js/