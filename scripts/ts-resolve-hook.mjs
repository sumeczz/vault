// Resolve hook: doplni .ts u relativnich importu bez pripony (vite styl).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && !specifier.endsWith(".mjs")) {
      return await next(`${specifier}.ts`, context);
    }
    throw e;
  }
}
