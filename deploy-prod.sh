#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== Pushing to GitHub ==="
git push origin main

echo ""
echo "=== Deploying to robson-dev ==="
ssh robson-dev "bash /home/robsonduarte/plano-gh/deploy.sh"

echo ""
echo "=== Live at https://dieta.invictagroup.com.br ==="
