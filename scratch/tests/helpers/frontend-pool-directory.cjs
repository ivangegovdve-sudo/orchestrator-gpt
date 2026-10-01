const assert = require('node:assert/strict');

function visibleText(markup) {
  return markup.replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function assertPoolDirectory(home, pools) {
  const directories = [...home.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/gi)]
    .filter(([, , content]) => /href=["']\/web\/pools\//i.test(content));
  assert.equal(directories.length, 1, 'one navigation landmark contains the pool directory');
  const [, attributes, content] = directories[0];
  assert.match(attributes, /aria-(?:label|labelledby)=["'][^"']+["']/i, 'the directory has an accessible name');
  assert.doesNotMatch(attributes, /\bhidden(?:\s|=|$)|aria-hidden=["']true["']/i);
  const links = [...content.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(([, attrs, text]) => ({ attributes: attrs, href: attrs.match(/\bhref=["']([^"']+)["']/i)?.[1], text: visibleText(text) }))
    .filter(({ href }) => href?.startsWith('/web/pools/'));
  assert.equal(links.length, pools.length, 'every pool remains a static, usable link');
  assert.deepEqual(links.map(({ href }) => href).sort(), pools.map(({ route }) => route).sort());
  for (const pool of pools) {
    const link = links.find(({ href }) => href === pool.route);
    assert.ok(link.text.includes(pool.publicName), `${pool.id} retains its public name`);
    assert.doesNotMatch(link.attributes, /\bdisabled\b|aria-disabled=["']true["']|tabindex=["']-1["']|\btarget=/i);
  }
  return links;
}

module.exports = { assertPoolDirectory };
