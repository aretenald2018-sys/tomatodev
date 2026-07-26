import assert from 'node:assert/strict';

function _sourceWithFunction(sourceOrSources, name) {
  const sources = Array.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources];
  const tokens = [`async function ${name}`, `function ${name}`];
  const source = sources.find(candidate => (
    typeof candidate === 'string'
    && tokens.some(token => candidate.includes(token))
  ));
  assert.ok(source, `${name} should exist`);
  return source;
}

export function extractFunctionSource(sourceOrSources, name) {
  const source = _sourceWithFunction(sourceOrSources, name);
  const asyncStart = source.indexOf(`async function ${name}`);
  const normalStart = source.indexOf(`function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : normalStart;
  const signatureEnd = source.indexOf(') {', start);
  const braceStart = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
  assert.ok(braceStart > start, `${name} body should start`);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} body should end`);
}

export function sliceFunctionRange(sourceOrSources, startName, endName) {
  const sources = Array.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources];
  const source = sources.find(candidate => (
    typeof candidate === 'string'
    && candidate.includes(`function ${startName}`)
    && candidate.includes(`function ${endName}`)
  ));
  assert.ok(source, `${startName}..${endName} should exist in one source`);
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start);
  assert.ok(start >= 0 && end > start, `${startName} should precede ${endName}`);
  return source.slice(start, end);
}
