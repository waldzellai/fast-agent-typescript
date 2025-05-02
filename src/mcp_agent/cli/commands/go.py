"""Run an interactive agent directly from the command line."""

import asyncio
import sys
from typing import List, Optional

import typer

from mcp_agent.core.fastagent import FastAgent

app = typer.Typer(
    help="Run an interactive agent directly from the command line without creating an agent.py file"
)

async def _run_agent(
    name: str = "FastAgent CLI",
    instruction: str = "You are a helpful AI Agent.",
    config_path: Optional[str] = None,
    server_list: Optional[List[str]] = None,
    model: Optional[str] = None,
) -> None:
    """Async implementation to run an interactive agent."""

    # Create the FastAgent instance with CLI arg parsing enabled
    # It will automatically parse args like --model, --quiet, etc.
    fast_kwargs = {
        "name": name,
        "config_path": config_path,
        "ignore_unknown_args": True,
    }
    
    fast = FastAgent(**fast_kwargs)

    # Define the agent with specified parameters
    agent_kwargs = {"instruction": instruction}
    if server_list:
        agent_kwargs["servers"] = server_list
    if model:
        agent_kwargs["model"] = model
    
    @fast.agent(**agent_kwargs)
    async def cli_agent():
        async with fast.run() as agent:
            await agent.interactive()

    # Run the agent
    await cli_agent()

def run_async_agent(
    name: str, 
    instruction: str, 
    config_path: Optional[str] = None, 
    servers: Optional[str] = None,
    model: Optional[str] = None
):
    """Run the async agent function with proper loop handling."""
    server_list = servers.split(',') if servers else None
    
    # Check if we're already in an event loop
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside a running event loop, so we can't use asyncio.run
            # Instead, create a new loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        # No event loop exists, so we'll create one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(_run_agent(
            name=name, 
            instruction=instruction, 
            config_path=config_path, 
            server_list=server_list,
            model=model
        ))
    finally:
        try:
            # Clean up the loop
            tasks = asyncio.all_tasks(loop)
            for task in tasks:
                task.cancel()
            
            # Run the event loop until all tasks are done
            if sys.version_info >= (3, 7):
                loop.run_until_complete(asyncio.gather(*tasks, return_exceptions=True))
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
        except Exception:
            pass

@app.callback(invoke_without_command=True)
def go(
    ctx: typer.Context,
    name: str = typer.Option("FastAgent CLI", "--name", help="Name for the agent"),
    instruction: str = typer.Option(
        "You are a helpful AI Agent.", "--instruction", "-i", help="Instruction for the agent"
    ),
    config_path: Optional[str] = typer.Option(
        None, "--config-path", "-c", help="Path to config file"
    ),
    servers: Optional[str] = typer.Option(
        None, "--servers", help="Comma-separated list of server names to enable from config"
    ),
    model: Optional[str] = typer.Option(
        None, "--model", help="Override the default model (e.g., haiku, sonnet, gpt-4)"
    ),
) -> None:
    """
    Run an interactive agent directly from the command line.

    Example:
        fast-agent go --model=haiku --instruction="You are a coding assistant" --servers=fetch,filesystem

    This will start an interactive session with the agent, using the specified model
    and instruction. It will use the default configuration from fastagent.config.yaml
    unless --config-path is specified.

    Common options:
        --model: Override the default model (e.g., --model=haiku)
        --quiet: Disable progress display and logging
        --servers: Comma-separated list of server names to enable from config
    """
    run_async_agent(
        name=name, 
        instruction=instruction, 
        config_path=config_path, 
        servers=servers,
        model=model
    )