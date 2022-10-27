const path = require('path');

const distPath = path.join(__dirname, '../dist');
const inAppTutorialShortHeadersPath = path.join(
  distPath,
  'database',
  'inAppTutorialShortHeaders.json'
);

module.exports = { distPath, inAppTutorialShortHeadersPath };
