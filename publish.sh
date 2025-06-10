#!/bin/bash

cd "$(dirname "$0")"

echo "Installing dependencies..."
pnpm i 

echo "Building distribution..."
rm -rf dist
npx tsup

echo "Publishing to npm..."
pnpm publish