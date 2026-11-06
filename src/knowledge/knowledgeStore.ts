import { fallbackFacts, type KnowledgeFact } from './fallbackFacts'

/**
 * The facts the scene may show. For now this is the built-in list.
 * Stage K2 will load published facts from Supabase here, with this list as the fallback.
 */
export function getKnowledgeFacts(): readonly KnowledgeFact[] {
  return fallbackFacts
}