"""Manual transformation script for local development."""

import argparse
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from transformers.bronze_to_silver import BronzeToSilverTransformer
from utils.s3_client import S3Client
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger(__name__)


def main():
    """Run manual transformation."""
    parser = argparse.ArgumentParser(description='Transform bronze data to silver')
    parser.add_argument(
        '--county',
        required=True,
        choices=Config.COUNTIES,
        help='County to transform'
    )
    parser.add_argument(
        '--date',
        required=True,
        help='Date to transform (YYYY-MM-DD)'
    )

    args = parser.parse_args()

    logger.info(f"Starting transformation: {args.county} on {args.date}")

    try:
        # Read bronze data
        s3_client = S3Client(Config.S3_BUCKET_NAME)
        raw_data = s3_client.read_bronze(args.county, args.date)

        logger.info(f"Read {len(raw_data)} raw records from bronze layer")

        # Transform to silver
        transformer = BronzeToSilverTransformer()
        properties_df = transformer.transform_properties(raw_data, args.county)

        # Validate and quarantine
        valid_df, quarantine_df = transformer.validate_and_quarantine(
            properties_df,
            required_fields=['property_id', 'address']
        )

        logger.info(f"Valid records: {len(valid_df)}, Quarantined: {len(quarantine_df)}")

        # Write to S3
        s3_path = s3_client.write_silver('properties', valid_df)

        logger.info(f"Silver data written to: {s3_path}")

        # Write quarantined records if any
        if len(quarantine_df) > 0:
            for idx, row in quarantine_df.iterrows():
                s3_client.write_quarantine(
                    args.county,
                    row.get('property_id', 'unknown'),
                    'Missing required fields',
                    row.to_dict()
                )

    except Exception as e:
        logger.error(f"Transformation failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
