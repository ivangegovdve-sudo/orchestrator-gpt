const { spawnSync } = require('child_process');

function resolveSeats(resolved) {
  const families = new Set();
  const seats = [];
  for (const m of resolved) {
    if (m.value === null) continue; // "A null price is UNKNOWN, never zero"
    const family = m.id.split('/')[0];
    if (families.has(family)) continue; // Independent family quorum

    seats.push(m);
    families.add(family);
    if (seats.length === 3) break;
  }
  return seats;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const init = {
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "council-resolver", version: "1.0" } }
  };

  const call = {
    jsonrpc: "2.0", id: 2, method: "tools/call",
    params: {
      name: "dashboard_resolve_model",
      arguments: {
        intent: "cheapest_capable",
        constraints: { providers: ["openrouter"], free: true, outputModality: "text" },
        fallbackDepth: 10
      }
    }
  };

  const input = JSON.stringify(init) + '\n' + JSON.stringify(call) + '\n';

  try {
    const result = spawnSync('npx', ['-y', 'open-dashboard-mcp@1.1.7'], { input, maxBuffer: 100 * 1024 * 1024, timeout: 60000 });
    const out = result.stdout.toString();
const parts = out.split('\n');
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].includes('"id":2') && parts[i].includes('"result":')) {
            const parsed = JSON.parse(parts[i]);
            if (parsed.result.isError) {
                 return res.status(500).json({ error: parsed.result.content[0].text });
            }
            const text = parsed.result.content[0].text;
            const data = JSON.parse(text);
            const seats = resolveSeats(data.resolved || []);

            if (seats.length < 3) {
              return res.status(503).json({ error: "Insufficient free models for a quorum" });
            }

            return res.status(200).json({ proposer: seats[0].id, critic: seats[1].id, synthesis: seats[2].id, seats });
        }
    }

    return res.status(500).json({ error: "Failed to parse MCP output", stderr: result.stderr.toString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports.resolveSeats = resolveSeats;
