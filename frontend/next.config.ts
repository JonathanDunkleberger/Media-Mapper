// Duplicate TS config removed in favor of consolidated next.config.js.
// Keep file exporting the JS config to satisfy any TS-based tooling expecting .ts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsConfig = require('./next.config.js');
export default jsConfig;

