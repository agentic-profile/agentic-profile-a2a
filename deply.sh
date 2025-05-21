#!/bin/bash

cd "$(dirname "$0")"

echo "Building distribution..."
pnpm i 
pnpm build

echo "Cleaning up mode_modules - removing non-production ones..."
rm -rf node_modules
pnpm i --prod

echo "Creating upload zipfile..."
rm function.zip 
zip -r function.zip \
    package.json \
    keyring.json \
    index.js \
    dist/* \
    www/* \
    node_modules/* --exclude 'node_modules/@aws-sdk/*'

echo "Deploying to Lambda..."
#aws lambda update-function-code --function-name agentic-profile-a2a --zip-file fileb://function.zip --profile agentic

echo "Done!"