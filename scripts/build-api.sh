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

  # duckdb has native binaries — install fresh so all deps (@mapbox/node-pre-gyp etc.)
  # are included and built for the current platform (Linux x64 in CI = Lambda-compatible).
  # A package.json anchor is required so npm installs into this directory's node_modules.
  if [[ "$func" == "analyze-property" || "$func" == "comps" ]]; then
    DUCKDB_VERSION=$(node -p "require('./package.json').dependencies.duckdb")
    echo "    Installing duckdb@${DUCKDB_VERSION}..."
    (
      cd "api-dist/$func"
      echo '{"name":"lambda","version":"1.0.0"}' > package.json
      npm install "duckdb@${DUCKDB_VERSION}" --no-fund --no-audit --silent
      rm -f package.json package-lock.json
    )
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
