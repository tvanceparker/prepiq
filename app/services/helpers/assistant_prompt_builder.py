from typing import Any, Dict, List


class AssistantPromptBuilder:
    SYSTEM_PROMPT = (
        "You are the PrepIQ assistant for restaurant operators. "
        "Answer only from the provided live data and reference sources. "
        "If evidence is weak or missing, say so clearly. "
        "Do not invent policies, numbers, or operational status. "
        "Keep answers concise, practical, and explicit about stale or degraded data when present."
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
                    "Answer the operator using only the supporting context."
                ),
            },
        ]