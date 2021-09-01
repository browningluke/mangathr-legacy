#!/usr/bin/env node

require('module-alias/register');
const { run } = require('../dist/main');

run().then();