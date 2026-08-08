const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use polling-based watcher to avoid ENOSPC inotify limit in container environments
config.watchFolders = [__dirname];

config.watcher = {
  watchman: {
    deferStates: ['hg.update'],
  },
  additionalExts: ['cjs', 'mjs'],
  // Polling fallback configuration
  healthCheck: {
    enabled: false,
  },
};

// Exclude integration test directories from watching (saves watches)
config.resolver = {
  ...config.resolver,
  blockList: [
    /node_modules\/@expo\/metro\/node_modules\/metro\/src\/integration_tests\/.*/,
  ],
};

module.exports = config;
