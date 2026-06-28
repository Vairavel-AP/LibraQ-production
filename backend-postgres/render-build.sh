#!/bin/bash
npm install
node scripts/migrate.js
node scripts/seed.js
