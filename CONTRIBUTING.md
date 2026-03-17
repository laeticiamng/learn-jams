# Contributing — Mandatory Code Rules

Before merging any PR, all changes **must** pass:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # vite build
npm run test        # vitest run
npm run lint        # eslint
```

## Forbidden Patterns

### 1. Untyped catch blocks

```typescript
// WRONG
catch (err) {
  console.error(err.message);
}

// CORRECT
catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Internal error";
  console.error(message);
}
```

### 2. Supabase `.insert()` with single object

```typescript
// WRONG
.insert({ name: "foo" })

// CORRECT
.insert([{ name: "foo" }])
```

### 3. JSX `<line>` in React Three Fiber scenes

React interprets `<line>` as an SVG element, not a Three.js Line.

```tsx
// WRONG
<line geometry={geo} material={mat} />

// CORRECT
<primitive object={new THREE.Line(geometry, material)} />
// or use @react-three/drei Line component
```

### 4. `base64Encode` with `Uint8Array`

Deno's `base64Encode()` accepts `string | ArrayBuffer`, not `Uint8Array`.

```typescript
// WRONG
base64Encode(uint8array);

// CORRECT
base64Encode(uint8array.buffer);
// or use response.arrayBuffer() directly
```

### 5. Deno streams — invalid compression formats

`CompressionStream` / `DecompressionStream` only accept:
`"gzip"`, `"deflate"`, `"deflate-raw"`

```typescript
// WRONG
new DecompressionStream("raw")

// CORRECT
new DecompressionStream("deflate-raw")
```

### 6. React hooks `exhaustive-deps`

Include all dependencies. If intentionally omitting, add a comment explaining why:

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps — mount-once: only run on initial load
```

## Quick Validation Commands

```bash
# Check for untyped catch blocks
grep -rn 'catch\s*(\s*\w\+\s*)' --include='*.ts' --include='*.tsx' src/ supabase/ | grep -v ': unknown'

# Check for non-array Supabase inserts
grep -rn '\.insert({' --include='*.ts' --include='*.tsx' src/ supabase/

# Check for JSX <line> in R3F files
grep -rn '<line\s' --include='*.tsx' src/components/cognitio/
```
