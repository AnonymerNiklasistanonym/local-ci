#!/usr/bin/env sh

bun add -d bun-plugin-pino
bun install --production
bun build.ts
bun remove bun-plugin-pino
npm install
