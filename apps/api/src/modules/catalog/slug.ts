// Slug helpers live in the shared lib so every sluggable module (catalog,
// wholesale, …) reuses one implementation. Re-exported here for back-compat.
export { slugify, uniqueSlug } from "../../lib/slug.js";
