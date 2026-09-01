#!/usr/bin/env bash
set -e
echo "====================================================================="
echo " SUMI-TAH - Automated Threat Hunting Platform Installer"
echo "====================================================================="
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
echo "[SUCCESS] SUMI-TAH installation and database setup complete!"