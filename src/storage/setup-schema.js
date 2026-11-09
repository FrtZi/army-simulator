// The setup file as a JSON Schema (CFG-06), for tools and agents that validate what they write. Built from the
// dictionary, so both say the same. As lenient as the reader (setup-file.js): an unknown field is ignored, not
// refused; only a bonus's target is closed, since an unknown filter would silently select no troop.

const SCHEMA_DRAFT = "https://json-schema.org/draft/2020-12/schema";
const TYPES = { text: "string", integer: "integer", number: "number", list: "array", object: "object" };

const ids = (list) => list.map((entry) => entry.id);

/** One element's own constraints: its type and its value domain. */
function constraints({ dataType, valueDomain }, valueLists) {
  const schema = { type: TYPES[dataType] };
  if (valueDomain.const !== undefined) schema.const = valueDomain.const;
  if (valueDomain.min !== undefined) schema.minimum = valueDomain.min;
  if (valueDomain.max !== undefined) schema.maximum = valueDomain.max;
  if (valueDomain.list) schema.enum = ids(valueLists[valueDomain.list]);
  if (valueDomain.filters) {
    const filter = (name) => ({ type: "array", items: { enum: ids(valueLists[name]) } });
    schema.properties = Object.fromEntries(valueDomain.filters.map((name) => [name, filter(name)]));
    schema.additionalProperties = false;
  }
  return schema;
}

/** Adds a child element to its parent's schema (an object's properties, or a list's items), required or not. */
function addChild(parent, field, child, required) {
  const holder = parent.type === "array" ? (parent.items ??= { type: "object" }) : parent;
  (holder.properties ??= {})[field] = child;
  if (required) (holder.required ??= []).push(field);
}

/** The JSON Schema of the file the dictionary describes. */
export function setupSchema(dictionary) {
  const root = {
    $schema: SCHEMA_DRAFT,
    title: `Army Simulator setup, version ${dictionary.version}, ${dictionary.gameName}`,
    type: "object",
  };
  const byName = new Map();
  for (const element of dictionary.elements) {
    const schema = { description: element.definition, ...constraints(element, dictionary.valueLists) };
    const [, parentName, field] = element.name.match(/^(?:(.+?)(?:\[\])?\.)?([^.]+)$/);
    addChild(parentName ? byName.get(parentName) : root, field, schema, element.obligation === "required");
    byName.set(element.name, schema);
  }
  return root;
}
