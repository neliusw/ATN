#!/usr/bin/env node
// trustctl - ATN CLI tool

import { Command } from 'commander';

const program = new Command();

program
  .name('trustctl')
  .description('ATN CLI tool for agent operations')
  .version('0.1.0');

program.parse(process.argv);
