const { spawnSync } = require('child_process');

// `null`, an empty string, or a non-zero value is not a free price. The MCP
// result is remote input, so keep this check at the API boundary too.
function isZeroPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value === 0;
  if (typeof value !== 'string' || value.trim() === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

function resolveSeats(resolved) {
  const families = new Set();
  const seats = [];
  for (const model of resolved) {
    if (!model || typeof model.id !== 'string' || !model.id.endsWith(':free')) continue;
    if (!isZeroPrice(model.value)) continue; // Unknown and priced are never free.
    const family = model.id.split('/')[0];
    if (families.has(family)) continue; // Independent family quorum

    seats.push(model);
    families.add(family);
    if (seats.length === 3) break;
  }
  return seats;
}

function mcpInput() {
  const init = {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'council-resolver', version: '1.0' } },
  };
  const call = {
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: {
      name: 'dashboard_resolve_model',
      arguments: {
        intent: 'cheapest_capable',
        constraints: { providers: ['openrouter'], free: true, outputModality: 'text' },
        fallbackDepth: 10,
      },
    },
  };
  return `${JSON.stringify(init)}\n${JSON.stringify(call)}\n`;
}

// Kept separate from the HTTP adapter so its real MCP path can be exercised
// with a stubbed process boundary. `verifiedAt` is assigned only after the MCP
// has returned a usable three-family quorum; a failed lookup has no success
// timestamp to advertise.
function resolveLiveRoster({ spawnSyncImpl = spawnSync, now = () => new Date() } = {}) {
  const result = spawnSyncImpl('npx', ['-y', 'open-dashboard-mcp@1.1.7'], {
    input: mcpInput(), maxBuffer: 100 * 1024 * 1024, timeout: 60000,
  });
  if (result?.error) throw result.error;

  const output = result?.stdout?.toString() || '';
  const responseLine = output.split('\n').reverse().find((line) => (
    line.includes('"id":2') && line.includes('"result"')
  ));
  if (!responseLine) {
    const error = new Error('Failed to parse MCP output');
    error.stderr = result?.stderr?.toString() || '';
    throw error;
  }

  const parsed = JSON.parse(responseLine);
  if (parsed.result?.isError) {
    throw new Error(parsed.result.content?.[0]?.text || 'MCP model resolution failed');
  }
  const data = JSON.parse(parsed.result?.content?.[0]?.text || '{}');
  const seats = resolveSeats(data.resolved || []);
  if (seats.length < 3) {
    const error = new Error('The latest live check confirmed no free-model quorum.');
    error.code = 'NO_FREE_QUORUM';
    throw error;
  }

  return {
    proposer: seats[0].id,
    critic: seats[1].id,
    synthesis: seats[2].id,
    seats,
    verifiedAt: now().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    return res.status(200).json(resolveLiveRoster());
  } catch (error) {
    return res.status(error.code === 'NO_FREE_QUORUM' ? 503 : 500).json({ error: error.message });
  }
};

module.exports.isZeroPrice = isZeroPrice;
module.exports.resolveSeats = resolveSeats;
module.exports.resolveLiveRoster = resolveLiveRoster;
