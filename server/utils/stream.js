/**
 * Utility for JSON-line streaming (NDJSON)
 * Each chunk is a valid JSON object followed by a newline.
 */
function sendChunk(res, data) {
  res.write(JSON.stringify(data) + '\n');
}

module.exports = { sendChunk };
