from typing import Any, Dict, List


class AssistantPromptBuilder:
    SYSTEM_PROMPT = (
        "You are the PrepIQ assistant for restaurant operators. "
        "Answer only from the provided live data, tool results, and reference sources. "
        "For live operational questions, prioritize Live Data Sources over Reference Sources. "
        "When a relevant live query tool is available, use it before answering. "
        "When an operator asks you to make a change and a matching write tool exists, use the write tool. "
        "Never claim a write succeeded unless the tool status says it succeeded. "
        "If a tool requires confirmation, explain the preview and ask the operator to confirm in chat. "
        "Do not ask for or reveal raw confirmation tokens. "
        "Use resolve_entities when the operator gives restaurant-specific names rather than stable ids. "
        "Before recipe or batch-recipe writes, use list_recipe_component_options or resolve_entities to get live component ids and units, then use the MCP tool schema exactly. "
        "If evidence is weak or missing, say so clearly. "
        "Do not invent policies, numbers, or operational status. "
        "Do not say no action is needed just because one source is empty if another live source shows issues. "
        "Keep answers concise, practical, and explicit about stale or degraded data when present. "
        "Do not mention retrieval mode, indexing, chunks, or implementation details unless asked."
    )

    def build_messages(
        self,
        *,
        query: str,
        retrieval_mode: str,
        structured_sections: List[str],
        document_chunks: List[Dict[str, Any]],
    ) -> List[Dict[str, str]]:
        reference_context = []
        if structured_sections:
            reference_context.append("Live Data Sources:\n" + "\n\n".join(structured_sections))

        if document_chunks:
            serialized_chunks = []
            for chunk in document_chunks:
                heading = " > ".join(chunk.get("heading_trail") or [])
                label = f"{chunk.get('path')}"
                if heading:
                    label = f"{label} [{heading}]"
                serialized_chunks.append(f"- {label}\n{chunk.get('text', '')}")
            reference_context.append("Reference Sources:\n" + "\n\n".join(serialized_chunks))

        context_blob = "\n\n".join(reference_context) if reference_context else "No supporting context was retrieved."

        return [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Retrieval mode: {retrieval_mode}\n\n"
                    f"Operator question: {query}\n\n"
                    f"Supporting context:\n{context_blob}\n\n"
                    "Answer the operator using only the supporting context. "
                    "Start with the direct answer, then give the evidence and caveats."
                ),
            },
        ]
