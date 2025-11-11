// Compatibility layer: general data storage now uses Oracle
const { initOracle, getOracle } = require('./oracle');

async function initDatabase() {
  await initOracle();
}

function getDatabase() {
  return getOracle();
}

module.exports = {
  initDatabase,
  getDatabase
};

