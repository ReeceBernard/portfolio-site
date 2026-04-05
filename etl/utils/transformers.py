"""Transformation utilities for data normalization."""

import re
from typing import Optional
import hashlib


def normalize_entity_name(name: Optional[str]) -> Optional[str]:
    """
    Normalize buyer/seller names for entity matching.

    Rules:
    - Lowercase
    - Remove punctuation (commas, periods, ampersands, etc.)
    - Remove common words like "and", "the"
    - Collapse multiple spaces
    - Strip whitespace

    Args:
        name: Raw name string

    Returns:
        Normalized name string

    Examples:
        "SMITH JOHN & JANE" -> "smith john jane"
        "ABC Properties, LLC." -> "abc properties llc"
        "The XYZ Trust" -> "xyz trust"
    """
    if not name or not isinstance(name, str):
        return None

    # Lowercase
    normalized = name.lower()

    # Remove punctuation
    normalized = re.sub(r'[,\.&]', ' ', normalized)

    # Remove common words
    common_words = ['and', 'the']
    for word in common_words:
        normalized = re.sub(rf'\b{word}\b', ' ', normalized)

    # Collapse multiple spaces and strip
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized if normalized else None


def generate_entity_id(normalized_name: str) -> str:
    """
    Generate unique entity ID from normalized name.

    Args:
        normalized_name: Normalized entity name

    Returns:
        Hash-based entity ID (first 16 chars of SHA256)
    """
    if not normalized_name or not isinstance(normalized_name, str):
        return None

    hash_obj = hashlib.sha256(normalized_name.encode('utf-8'))
    return hash_obj.hexdigest()[:16]


def infer_entity_type(name: str) -> str:
    """
    Infer entity type from name.

    Args:
        name: Raw or normalized name

    Returns:
        Entity type: 'llc', 'trust', 'company', 'individual'
    """
    if not name:
        return 'unknown'

    name_lower = name.lower()

    # LLC patterns
    if any(pattern in name_lower for pattern in ['llc', 'l.l.c', 'limited liability']):
        return 'llc'

    # Trust patterns
    if any(pattern in name_lower for pattern in ['trust', 'trustee']):
        return 'trust'

    # Company patterns
    if any(pattern in name_lower for pattern in [
        'inc', 'corp', 'corporation', 'company', 'properties',
        'investments', 'partners', 'group', 'holdings'
    ]):
        return 'company'

    # Default to individual
    return 'individual'


def map_property_type(parcel_class: Optional[str]) -> tuple[str, str]:
    """
    Map parcel_class to standardized property type.

    Args:
        parcel_class: Raw parcel class from qPublic

    Returns:
        Tuple of (standardized_type, original_parcel_class)
    """
    if not parcel_class:
        return ('unknown', parcel_class)

    parcel_lower = parcel_class.lower()

    # Mobile Home (check first as it's specific)
    if any(pattern in parcel_lower for pattern in ['mobile', 'manufactured']):
        return ('mobile_home', parcel_class)

    # Mixed use
    if 'mixed' in parcel_lower:
        return ('mixed_use', parcel_class)

    # Condo (check before general commercial/office)
    if 'condo' in parcel_lower:
        return ('condo', parcel_class)

    # Townhome
    if 'townhome' in parcel_lower or 'townhouse' in parcel_lower or 'town home' in parcel_lower:
        return ('townhome', parcel_class)

    # Multi-family
    if any(pattern in parcel_lower for pattern in [
        'multi-family', 'multifamily', 'duplex', 'triplex', 'quadruplex',
        '2 family', '3 family', '4 family', 'apartment'
    ]):
        return ('multi_family', parcel_class)

    # Land/Lots/Vacant (check before general residential)
    if any(pattern in parcel_lower for pattern in ['vacant', 'lot', 'tract', 'land']):
        return ('land', parcel_class)

    # Single Family (including Gwinnett's "101 - Residential SFR")
    if any(pattern in parcel_lower for pattern in [
        'single family', 'single-family', 'sfr', 'residential dwelling'
    ]):
        return ('sfh', parcel_class)

    # Commercial/Office/Industrial (including Gwinnett codes)
    if any(pattern in parcel_lower for pattern in [
        'commercial', 'retail', 'office', 'industrial', 'warehouse', 'charity', 'hospital',
        'restaurant', 'fast food', 'nursing home', 'manufacturing', 'processing',
        'medical office'
    ]):
        return ('commercial', parcel_class)

    # Catch-all for "residential" without other qualifiers
    # This includes things like "Residential Small Tracts", "Res Percentaged Dwelling",
    # "Auxiliary Improvement(Res)", etc.
    if 'residential' in parcel_lower or 'res ' in parcel_lower or 'res)' in parcel_lower:
        return ('other_residential', parcel_class)

    # Unknown
    return ('other', parcel_class)


def extract_zip_code(address: Optional[str]) -> Optional[str]:
    """
    Try to extract zip code from address string.

    Args:
        address: Full address string

    Returns:
        5-digit zip code if found, None otherwise
    """
    if not address:
        return None

    # Look for 5-digit zip code
    # Pattern: optional GA/GEORGIA, then 5 digits, possibly followed by -4 digits
    match = re.search(r'\b(\d{5})(?:-\d{4})?\b', address)

    if match:
        zip_code = match.group(1)
        # Validate it's in Georgia range (30000-31999)
        if zip_code.startswith('30') or zip_code.startswith('31'):
            return zip_code

    return None


def normalize_address(address: Optional[str]) -> Optional[str]:
    """
    Normalize address for matching.

    Args:
        address: Raw address string

    Returns:
        Normalized address
    """
    if not address:
        return None

    normalized = address.upper().strip()

    # Common abbreviations
    abbreviations = {
        ' STREET': ' ST',
        ' AVENUE': ' AVE',
        ' DRIVE': ' DR',
        ' ROAD': ' RD',
        ' LANE': ' LN',
        ' COURT': ' CT',
        ' CIRCLE': ' CIR',
        ' BOULEVARD': ' BLVD',
        ' PLACE': ' PL',
        ' NORTH': ' N',
        ' SOUTH': ' S',
        ' EAST': ' E',
        ' WEST': ' W',
        ' NORTHEAST': ' NE',
        ' NORTHWEST': ' NW',
        ' SOUTHEAST': ' SE',
        ' SOUTHWEST': ' SW',
    }

    for full, abbr in abbreviations.items():
        normalized = normalized.replace(full, abbr)

    # Remove extra spaces
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized
