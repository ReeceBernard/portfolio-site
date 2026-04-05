"""S3 client utilities for reading and writing data."""

import json
from datetime import datetime
from typing import Any, Dict, List
import boto3
from botocore.exceptions import ClientError
import pandas as pd


class S3Client:
    """Client for interacting with S3 data lake."""

    def __init__(self, bucket_name: str, region: str = 'us-east-1'):
        """
        Initialize S3 client.

        Args:
            bucket_name: S3 bucket name
            region: AWS region
        """
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3', region_name=region)

    def write_bronze(self, source: str, county: str, data: List[Dict], date: str = None) -> str:
        """
        Write raw data to bronze layer.

        Args:
            source: Data source (property_sales, foreclosures, etc.)
            county: County name
            data: List of records
            date: Date string (YYYY-MM-DD), defaults to today

        Returns:
            S3 key of written file
        """
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        key = f"bronze/{source}/{county}/{date}.json"

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=json.dumps(data, indent=2, default=str),
            ContentType='application/json'
        )

        return f"s3://{self.bucket_name}/{key}"

    def read_bronze(self, source: str, county: str, date: str) -> List[Dict]:
        """
        Read raw data from bronze layer.

        Args:
            source: Data source (property_sales, foreclosures, etc.)
            county: County name
            date: Date string (YYYY-MM-DD)

        Returns:
            List of records
        """
        key = f"bronze/{source}/{county}/{date}.json"

        response = self.s3_client.get_object(
            Bucket=self.bucket_name,
            Key=key
        )

        return json.loads(response['Body'].read().decode('utf-8'))

    def write_silver(self, table_name: str, df: pd.DataFrame) -> str:
        """
        Write cleaned data to silver layer as parquet.

        Args:
            table_name: Table name (properties, sales_history, etc.)
            df: Pandas DataFrame

        Returns:
            S3 key of written file
        """
        key = f"silver/{table_name}.parquet"

        # Write to parquet in memory, then upload
        parquet_buffer = df.to_parquet(index=False)

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=parquet_buffer,
            ContentType='application/octet-stream'
        )

        return f"s3://{self.bucket_name}/{key}"

    def read_silver(self, table_name: str) -> pd.DataFrame:
        """
        Read cleaned data from silver layer.

        Args:
            table_name: Table name

        Returns:
            Pandas DataFrame
        """
        key = f"silver/{table_name}.parquet"
        s3_path = f"s3://{self.bucket_name}/{key}"

        return pd.read_parquet(s3_path)

    def write_quarantine(self, county: str, parcel_id: str, error: str, raw_data: Dict) -> str:
        """
        Write failed records to quarantine.

        Args:
            county: County name
            parcel_id: Parcel ID that failed
            error: Error message
            raw_data: Raw data that failed processing

        Returns:
            S3 key of quarantine file
        """
        quarantine_record = {
            'quarantine_id': f"{county}_{parcel_id}_{datetime.now().isoformat()}",
            'county': county,
            'parcel_id': parcel_id,
            'error_message': error,
            'error_timestamp': datetime.now().isoformat(),
            'retry_count': 0,
            'max_retries': 3,
            'raw_data': raw_data
        }

        key = f"silver/quarantine/{county}/{parcel_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=json.dumps(quarantine_record, indent=2, default=str),
            ContentType='application/json'
        )

        return f"s3://{self.bucket_name}/{key}"
