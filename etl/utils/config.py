"""Configuration management for ETL pipeline."""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """ETL configuration settings."""

    # AWS Settings
    AWS_REGION: str = os.getenv('AWS_REGION', 'us-east-1')
    S3_BUCKET_NAME: str = os.getenv('S3_BUCKET_NAME', 'dealscout-data-dev')

    # Scraper Settings
    RATE_LIMIT_SECONDS: float = float(os.getenv('RATE_LIMIT_SECONDS', '1.5'))
    MAX_RETRIES: int = int(os.getenv('MAX_RETRIES', '3'))
    TIMEOUT_SECONDS: int = int(os.getenv('TIMEOUT_SECONDS', '30'))

    # Supported Counties
    COUNTIES = ['fulton', 'gwinnett', 'cobb', 'dekalb']

    @classmethod
    def validate(cls) -> bool:
        """
        Validate configuration.

        Returns:
            True if config is valid

        Raises:
            ValueError: If required config is missing
        """
        if not cls.S3_BUCKET_NAME:
            raise ValueError("S3_BUCKET_NAME not set")

        return True


# Validate on import
Config.validate()
