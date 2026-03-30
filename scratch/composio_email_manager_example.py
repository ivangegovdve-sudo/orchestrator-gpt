"""Composio + OpenAI Agents Gmail example.

This script is based on a user-provided snippet and removes hard-coded secrets so it can be
safely committed and reused.
"""

import asyncio
import os
from argparse import ArgumentParser

from agents import Agent, Runner
from composio import Composio
from composio_openai_agents import OpenAIAgentsProvider

DEFAULT_SUBJECT = "Hello from Composio"
DEFAULT_BODY = "This is a test email!"


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        msg = f"Missing required environment variable: {name}"
        raise RuntimeError(msg)
    return value


def _build_parser() -> ArgumentParser:
    parser = ArgumentParser(
        description="Send a test Gmail message through Composio tools."
    )
    parser.add_argument(
        "--recipient", help="Recipient email; defaults to COMPOSIO_TEST_RECIPIENT."
    )
    parser.add_argument(
        "--subject", default=DEFAULT_SUBJECT, help="Email subject line."
    )
    parser.add_argument("--body", default=DEFAULT_BODY, help="Email body text.")
    return parser


async def main() -> None:
    args = _build_parser().parse_args()
    composio_api_key = _require_env("COMPOSIO_API_KEY")
    external_user_id = _require_env("COMPOSIO_EXTERNAL_USER_ID")
    recipient_email = args.recipient or _require_env("COMPOSIO_TEST_RECIPIENT")

    composio = Composio(
        api_key=composio_api_key,
        provider=OpenAIAgentsProvider(),
    )

    session = composio.create(user_id=external_user_id)
    tools = session.tools()

    agent = Agent(
        name="Email Manager",
        instructions="You are a helpful assistant that helps users manage their Gmail accounts.",
        tools=tools,
    )

    prompt = (
        f"Send an email to {recipient_email} with the subject '{args.subject}' "
        f"and the body '{args.body}'"
    )

    result = await Runner.run(
        starting_agent=agent,
        input=prompt,
    )
    print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())
