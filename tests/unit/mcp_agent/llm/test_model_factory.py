import pytest

from mcp_agent.core.exceptions import ModelConfigError
from mcp_agent.llm.model_factory import (
    ModelFactory,
    Provider,
    ReasoningEffort,
)
from mcp_agent.llm.providers.augmented_llm_anthropic import AnthropicAugmentedLLM
from mcp_agent.llm.providers.augmented_llm_generic import GenericAugmentedLLM
from mcp_agent.llm.providers.augmented_llm_openai import OpenAIAugmentedLLM


def test_simple_model_names():
    """Test parsing of simple model names"""
    cases = [
        ("o1-mini", Provider.OPENAI),
        ("claude-3-haiku-20240307", Provider.ANTHROPIC),
        ("claude-3-5-sonnet-20240620", Provider.ANTHROPIC),
    ]

    for model_name, expected_provider in cases:
        config = ModelFactory.parse_model_string(model_name)
        assert config.provider == expected_provider
        assert config.model_name == model_name
        assert config.reasoning_effort is None


def test_full_model_strings():
    """Test parsing of full model strings with providers"""
    cases = [
        (
            "anthropic.claude-3-haiku-20240307",
            Provider.ANTHROPIC,
            "claude-3-haiku-20240307",
            None,
        ),
        ("openai.gpt-4.1", Provider.OPENAI, "gpt-4.1", None),
        ("openai.o1.high", Provider.OPENAI, "o1", ReasoningEffort.HIGH),
    ]

    for model_str, exp_provider, exp_model, exp_effort in cases:
        config = ModelFactory.parse_model_string(model_str)
        assert config.provider == exp_provider
        assert config.model_name == exp_model
        assert config.reasoning_effort == exp_effort


def test_invalid_inputs():
    """Test handling of invalid inputs"""
    invalid_cases = [
        "unknown-model",  # Unknown simple model
        "invalid.gpt-4",  # Invalid provider
    ]

    for invalid_str in invalid_cases:
        with pytest.raises(ModelConfigError):
            ModelFactory.parse_model_string(invalid_str)


def test_llm_class_creation():
    """Test creation of LLM classes"""
    cases = [
        ("gpt-4.1", OpenAIAugmentedLLM),
        ("claude-3-haiku-20240307", AnthropicAugmentedLLM),
        ("openai.gpt-4.1", OpenAIAugmentedLLM),
    ]

    for model_str, expected_class in cases:
        factory = ModelFactory.create_factory(model_str)
        # Check that we get a callable factory function
        assert callable(factory)

        # Instantiate with minimal params to check it creates the correct class
        # Note: You may need to adjust params based on what the factory requires
        instance = factory(None)
        assert isinstance(instance, expected_class)


def test_allows_generic_model():
    """Test that generic model names are allowed"""
    generic_model = "generic.llama3.2:latest"
    factory = ModelFactory.create_factory(generic_model)
    instance = factory(None)
    assert isinstance(instance, GenericAugmentedLLM)
    assert instance._base_url() == "http://localhost:11434/v1"
