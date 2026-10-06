import { z } from 'zod';

// Google's responseJsonSchema supports this subset. Full constraints are still
// enforced by the unchanged Zod contract after the response is received.
const supported = new Set(['$id', '$defs', '$ref', '$anchor', 'type', 'format', 'title', 'description',
  'enum', 'items', 'prefixItems', 'minItems', 'maxItems', 'minimum', 'maximum',
  'anyOf', 'oneOf', 'properties', 'additionalProperties', 'required']);
function project(node) {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return node;
  return Object.fromEntries(Object.entries(node).filter(([key]) => supported.has(key)).map(([key, value]) => {
    if (key === 'properties' || key === '$defs') return [key, Object.fromEntries(Object.entries(value).map(([name, child]) => [name, project(child)]))];
    if (['anyOf', 'oneOf', 'prefixItems'].includes(key)) return [key, value.map(project)];
    if (key === 'items' || key === 'additionalProperties') return [key, project(value)];
    return [key, value];
  }));
}
export const geminiJsonSchema = schema => project(z.toJSONSchema(schema));
