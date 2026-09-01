@echo off
echo =====================================================================
echo  SUMI-TAH - Automated Threat Hunting Platform Installer
echo =====================================================================
npm install
call npx prisma generate
call npx prisma db push
call npx tsx prisma/seed.ts
echo [SUCCESS] SUMI-TAH installation and database setup complete!
pause