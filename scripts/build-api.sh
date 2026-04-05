#!/bin/bash
set -e

echo "Building API Lambda functions..."

rm -rf api-dist
mkdir -p api-dist

FUNCTIONS=("analyze-property" "comps" "calls-remaining" "fred-proxy" "hud-proxy")

for func in "${FUNCTIONS[@]}"; do
  echo "  Bundling $func..."
  mkdir -p "api-dist/$func"

  npx esbuild "api/$func.ts" \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile="api-dist/$func/index.js" \
    --external:duckdb

  # duckdb has native binaries — copy the full module for functions that use it
  if [[ "$func" == "analyze-property" || "$func" == "comps" ]]; then
    mkdir -p "api-dist/$func/node_modules"
    cp -r "node_modules/duckdb" "api-dist/$func/node_modules/"
  fi

  cd "api-dist/$func"
  zip -r "../$func.zip" . -x "*.map"
  cd ../..
  rm -rf "api-dist/$func"

  SIZE=$(du -sh "api-dist/$func.zip" | cut -f1)
  echo "  ✅ $func.zip ($SIZE)"
done

echo ""
echo "Done. Run 'terraform apply' in terraform/ to deploy."
