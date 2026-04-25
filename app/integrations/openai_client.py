import os
import json
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, List, Optional

import httpx


EMBEDDING_BATCH_SIZE = max(1, int(os.getenv("OPENAI_EMBEDDING_BATCH_SIZE", "16")))


@dataclass(frozen=True)
class OpenAIToolInvocation:
    tool_call_id: str
    name: str
    arguments: dict[str, Any]
    result: dict[str, Any]


@dataclass(frozen=True)
class OpenAIAnswerResult:
    answer: str
    tool_invocations: list[OpenAIToolInvocation]


class OpenAIClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-mini")
        self.embedding_model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def generate_answer(self, messages: List[dict], temperature: float = 0.2) -> str:
        if not self.api_key:
            raise ValueError("OpenAI API key is not configured")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.chat_model,
                    "temperature": temperature,
                    "messages": messages,
                },
            )
            response.raise_for_status()
            payload = response.json()
            choices = payload.get("choices") or []
            if not choices:
                raise ValueError("OpenAI returned no completion choices")
            message = choices[0].get("message") or {}
            return str(message.get("content") or "").strip()

    async def generate_answer_with_tools(
        self,
        messages: List[dict[str, Any]],
        tools: List[dict[str, Any]],
        tool_executor: Callable[[str, dict[str, Any] | None], Awaitable[dict[str, Any]]],
        *,
        temperature: float = 0.2,
        max_round_trips: int = 4,
    ) -> OpenAIAnswerResult:
        if not self.api_key:
            raise ValueError("OpenAI API key is not configured")

        conversation = [dict(message) for message in messages]
        invocations: list[OpenAIToolInvocation] = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            for _ in range(max_round_trips):
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.chat_model,
                        "temperature": temperature,
                        "messages": conversation,
                        "tools": tools,
                        "tool_choice": "auto",
                    },
                )
                response.raise_for_status()
                payload = response.json()
                choices = payload.get("choices") or []
                if not choices:
                    raise ValueError("OpenAI returned no completion choices")

                message = choices[0].get("message") or {}
                content = str(message.get("content") or "").strip()
                tool_calls = message.get("tool_calls") or []
                if not tool_calls:
                    return OpenAIAnswerResult(answer=content, tool_invocations=invocations)

                conversation.append(
                    {
                        "role": "assistant",
                        "content": content or "",
                        "tool_calls": tool_calls,
                    }
                )

                for tool_call in tool_calls:
                    function = tool_call.get("function") or {}
                    name = str(function.get("name") or "")
                    arguments_text = function.get("arguments") or "{}"
                    try:
                        parsed_arguments = json.loads(arguments_text) if isinstance(arguments_text, str) else {}
                    except json.JSONDecodeError:
                        parsed_arguments = {"_raw_arguments": arguments_text}

                    result = await tool_executor(name, parsed_arguments)
                    invocations.append(
                        OpenAIToolInvocation(
                            tool_call_id=str(tool_call.get("id") or ""),
                            name=name,
                            arguments=parsed_arguments if isinstance(parsed_arguments, dict) else {},
                            result=result,
                        )
                    )
                    conversation.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.get("id"),
                            "content": json.dumps(result, ensure_ascii=True, default=str),
                        }
                    )

        return OpenAIAnswerResult(
            answer="I could not complete the tool-assisted answer cleanly from the available live data.",
            tool_invocations=invocations,
        )

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("OpenAI API key is not configured")
        if not texts:
            return []

        embeddings: List[List[float]] = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
                batch = texts[start : start + EMBEDDING_BATCH_SIZE]
                response = await client.post(
                    f"{self.base_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.embedding_model,
                        "input": batch,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                data = payload.get("data") or []
                batch_embeddings = [
                    item.get("embedding") or [] for item in sorted(data, key=lambda item: item.get("index", 0))
                ]
                if len(batch_embeddings) != len(batch):
                    raise ValueError("OpenAI returned an unexpected number of embeddings")
                embeddings.extend(batch_embeddings)
        return embeddings