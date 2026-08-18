import os
import logging
from typing import Optional

from openai import OpenAI
# openai.error may not be present in every SDK variant; provide a safe fallback
try:
    from openai.error import OpenAIError
except Exception:  # pragma: no cover - defensive import
    class OpenAIError(Exception):
        pass

from config import CONFIG

logger = logging.getLogger(__name__)


class AIService:
    """Thin service layer around the OpenAI client.

    Responsibilities:
    - Read configuration from environment/config
    - Initialize the OpenAI client without exposing secrets
    - Provide a single method to get a plain text response for a user message
    """

    def __init__(self):
        self.api_key: Optional[str] = os.getenv('OPENAI_API_KEY') or CONFIG.OPENAI_API_KEY
        self.model: str = os.getenv('OPENAI_MODEL') or CONFIG.OPENAI_MODEL

        if not self.api_key:
            # Fail fast during service initialization so the application can handle it gracefully
            raise ValueError('OpenAI API key is not configured.')

        # Initialize official OpenAI client using the configured API key
        self.client = OpenAI(api_key=self.api_key)

    def generate_response(self, user_message: str) -> str:
        """Send user_message to OpenAI and return the assistant's reply as plain text.

        Raises:
            ValueError: for invalid input
            RuntimeError: for API or network errors
        """
        if not user_message or not str(user_message).strip():
            raise ValueError('Message cannot be empty.')

        try:
            # Create a chat completion request using the configured model
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        'role': 'system',
                        'content': (
                            'You are JARVIS, a premium AI assistant focused on helpful, concise, and professional guidance.'
                        ),
                    },
                    {'role': 'user', 'content': user_message},
                ],
                temperature=0.7,
                max_tokens=500,
            )

            # Extract and return the assistant message text
            return completion.choices[0].message.content.strip()

        except OpenAIError as exc:
            # Known OpenAI client errors (API, invalid request, rate limits, etc.)
            logger.exception('OpenAI API error')
            raise RuntimeError('OpenAI API error') from exc
        except Exception as exc:
            # Network or unexpected errors
            logger.exception('Unexpected error while calling OpenAI')
            raise RuntimeError('OpenAI request failed') from exc


# Reusable module-level instance for importers to call
try:
    ai_service = AIService()
except Exception:
    # Defer raising until used so the app can start and report health; callers should handle missing configuration
    ai_service = None


def get_ai_response(message: str) -> str:
    """Convenience function that returns AI response for the given message.

    Raises ValueError for invalid input and RuntimeError for service/API failures.
    """
    if not ai_service:
        raise RuntimeError('OpenAI client is not configured.')

    return ai_service.generate_response(message)
