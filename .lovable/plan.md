

## Plan : Correction des 23 erreurs de build restantes

### 3 catégories d'erreurs

**1. `err` is of type 'unknown' (19 erreurs dans ~15 edge functions)**

Tous les `catch (err)` doivent devenir `catch (err: unknown)` avec un cast `(err as Error).message`. Fichiers concernés :
- `experiment-assign`, `experiment-record-measurement`, `guardian-accept-link`, `guardian-invite`, `guardian-send-service-alert`, `guardian-send-weekly-summary`, `product-track-event`, `provider-openai-image`, `provider-openai-llm`, `provider-openai-tts`, `provider-openai-video`, `provider-resend-email`, `provider-twilio-sms`, `seed-get-transformations`, `webhook-resend`, `webhook-stripe`, `webhook-suno`, `webhook-twilio`

Pattern appliqué partout :
```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Internal error";
  // ...utiliser message
}
```

**2. `DecompressionStream("raw")` (1 erreur dans `cognitio-ingest`)**

`"raw"` n'est pas un `CompressionFormat` valide dans Deno. Remplacer par `"deflate-raw"` qui est le format standard pour l'inflation brute sans en-tête zlib.

**3. `<line>` JSX conflit Three.js / SVG (2 erreurs dans `EscapeRoom3DScene.tsx` et `LearningRoom3D.tsx`)**

React interprète `<line>` comme un élément SVG. Pour R3F (React Three Fiber), il faut utiliser la primitive avec un `<primitive object={...} />` ou forcer le type avec un cast. La solution la plus propre :
```tsx
{/* Remplacer <line geometry={geometry}> par : */}
<primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.04 }))} />
```

**4. `base64Encode(Uint8Array)` incompatible (1 erreur dans `provider-openai-tts`)**

Passer `audioBuffer` (ArrayBuffer) directement au lieu de `new Uint8Array(audioBuffer)` :
```typescript
const audioBase64 = base64Encode(audioBuffer);
```

---

### Prompt Claude Code pour éviter ces erreurs à l'avenir

Voici le prompt à utiliser :

```text
## Règles TypeScript strictes pour Edge Functions Deno & React Three Fiber

1. CATCH BLOCKS : Toujours typer `catch (err: unknown)` et utiliser
   `err instanceof Error ? err.message : "Unknown error"` — JAMAIS `err.message` directement.

2. DENO STREAMS : Les valeurs valides pour DecompressionStream/CompressionStream sont
   uniquement "gzip", "deflate", "deflate-raw". Jamais "raw".

3. REACT THREE FIBER <line> : Ne jamais utiliser `<line>` en JSX R3F car React
   l'interprète comme un SVG. Utiliser `<primitive object={new THREE.Line(...)} />`
   à la place.

4. DENO base64 : `base64Encode()` de deno/std accepte `string | ArrayBuffer`,
   pas `Uint8Array`. Passer l'ArrayBuffer directement.

5. SUPABASE INSERT : Toujours utiliser le format tableau `.insert([{...}])`.
```

---

### Résumé : ~20 fichiers à éditer, zéro changement de logique, uniquement du typage.

