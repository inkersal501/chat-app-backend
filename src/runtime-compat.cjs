// Older JWT transitive dependencies still reference buffer.SlowBuffer.
// Node.js 25 removed that alias; Buffer provides the same prototype/API here.
const buffer = require("node:buffer");

if (typeof buffer.SlowBuffer !== "function") {
  buffer.SlowBuffer = buffer.Buffer;
}
