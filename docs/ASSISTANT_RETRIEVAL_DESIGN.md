# Assistant Retrieval Design

## Retrieval Modes

The assistant supports three retrieval modes:

- structured retrieval for live restaurant state
- document retrieval for procedures, setup, and uploaded knowledge
- blended retrieval when a question needs both

Current live note:

- the current implementation retrieves from indexed `docs/`, `notes/`, and uploaded assistant files
- uploads are stored server-side and indexed per restaurant
- vector retrieval is live using OpenAI embeddings plus database-backed similarity search
- lexical rescue and heuristic reranking still sit on top of vector retrieval for quality and fallback

## Chunking

- target chunk size: about 350 tokens
- overlap: about 75 tokens
- chunking style: heading-aware so chunks preserve document structure
- stored metadata:
  - source type
  - source path
  - heading trail
  - chunk index
  - token count
  - checksum
  - adjacent chunk references
  - restaurant scope when tenant-bound

## Retrieval Pipeline

1. classify query into structured, document, or blended
2. ensure built-in `docs/` and `notes/` sources are indexed for the current restaurant
3. embed the user query with the configured OpenAI embedding model
4. retrieve top 24 chunk candidates with database-backed vector similarity
5. merge in lexical rescue candidates for exact or heading-heavy matches
6. union and dedupe candidates
7. rerank candidates
8. keep top 5 base chunks
9. expand neighbors around top 3 base chunks
10. trim final document context to prompt budget
11. append structured live-data results separately for blended answers

## Phase 1 Reranking

Phase 1 uses application-controlled reranking, not a dedicated reranker model.

Current live note:

- the current implementation combines vector similarity, lexical overlap, heading match, source priority, freshness, and diversity control
- lexical rescue remains useful for procedure questions that contain exact terminology or heading phrases

Current live score shape:

`score = 0.55 * retrieval_score + 0.20 * lexical_overlap + 0.15 * heading_match + 0.05 * source_priority + 0.05 * freshness_bonus - diversity_penalty`

## Citation Rules

- every answer should return structured citations
- document citations should include source label, file path, heading trail, chunk index, and snippet
- structured citations should include service name and freshness metadata where relevant
- blended answers should separate live data sources from reference sources
- unsupported claims should be softened when evidence is weak or missing

## Phase 1 Rationale

The current phase 1 corpus is still small to medium, so database-backed vector search plus application-controlled reranking is the best quality-versus-complexity tradeoff without introducing an external vector database yet.
