import pytest

from app.integrations.openai_client import OpenAIClient


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeAsyncClient:
    requests = []

    def __init__(self, *args, **kwargs):
        self.call_count = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers, json):
        self.call_count += 1
        FakeAsyncClient.requests.append(json)
        if self.call_count == 1:
            return FakeResponse(
                {
                    "choices": [
                        {
                            "message": {
                                "content": "",
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "resolve_entities",
                                            "arguments": (
                                                '{"entities":[{"entity_type":"ingredient","query":"garlic"}]}'
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ]
                }
            )

        return FakeResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": "Use supplier A for garlic.",
                            "tool_calls": [],
                        }
                    }
                ]
            }
        )


@pytest.mark.asyncio
async def test_generate_answer_with_tools_runs_tool_loop(monkeypatch):
    import app.integrations.openai_client as openai_module

    FakeAsyncClient.requests = []
    monkeypatch.setattr(openai_module.httpx, "AsyncClient", FakeAsyncClient)

    async def fake_tool_executor(name, arguments):
        assert name == "resolve_entities"
        assert arguments == {
            "entities": [
                {
                    "entity_type": "ingredient",
                    "query": "garlic",
                }
            ]
        }
        return {
            "ok": True,
            "tool": name,
            "status": "succeeded",
            "data": {"results": [{"query": "garlic", "match": "Garlic"}]},
            "error": None,
        }

    client = OpenAIClient(api_key="test-key")
    result = await client.generate_answer_with_tools(
        messages=[
            {"role": "system", "content": "You are helpful."},
            {"role": "user", "content": "What should I do about garlic?"},
        ],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "resolve_entities",
                    "description": "Resolve named entities.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "entities": {"type": "array"},
                        },
                    },
                },
            }
        ],
        tool_executor=fake_tool_executor,
    )

    assert result.answer == "Use supplier A for garlic."
    assert len(result.tool_invocations) == 1
    assert result.tool_invocations[0].name == "resolve_entities"
    assert FakeAsyncClient.requests[1]["messages"][-1]["role"] == "tool"