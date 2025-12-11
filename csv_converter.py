import csv
import json
from typing import List, Dict, Any, Optional
import os

# --- Configuration ---
# The input CSV file path (change if your location changes)
INPUT_CSV_FILE = r"C:\Users\Andre\Downloads\Real_Estate_Sales_2001-2023_GL (1).csv"
# The base directory for all output JSON files
DOWNLOADS_DIR = r"C:\Users\Andre\Downloads"

# --- Column Names & PROJECTION ---
# **CRITICAL**: Update these variables if your CSV headers are different!
COL_YEAR = 'List Year'
COL_TOWN = 'Town'
COL_TYPE = 'Property Type'

# FIELDS REQUIRED BY THE REACT COMPONENTS
PROJECTION_FIELDS = [
    'Serial Number',  # serial_number
    COL_YEAR,         # list_year
    COL_TOWN,         # town
    COL_TYPE,         # property_type
    'Assessed Value', # assessed_value
    'Sale Amount',    # sale_amount
    'Sales Ratio',    # sales_ratio
    'Address',        # address
]


def get_output_path(base_name: str) -> str:
    """Constructs the full path for an output file in the Downloads directory."""
    return os.path.join(DOWNLOADS_DIR, f"{base_name}.json")


def check_csv_headers(file_path: str):
    """Reads and prints the header row of the CSV file for verification."""
    print("--- Verifying CSV Headers ---")
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            print("CSV Headers Found:", headers)
            print(f"**CRITICAL**: The script relies on these fields (case-sensitive) for filtering:")
            print(f"Year: '{COL_YEAR}', Town: '{COL_TOWN}', Type: '{COL_TYPE}'")
            print("----------------------------------------\n")
    except FileNotFoundError:
        print(f"File not found during header check: {file_path}")
    except Exception as e:
        print(f"Error reading headers: {e}")


def convert_csv_to_json(
        csv_file_path: str,
        json_file_path: str,
        filter_start_year: Optional[int] = None,
        filter_end_year: Optional[int] = None,
        filter_town: Optional[str] = None,
        filter_property_type: Optional[str] = None
) -> None:
    """
    Converts a CSV file to a JSON file, applies filters, and performs projection.
    """
    data: List[Dict[str, Any]] = []

    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                # --- Filtering Logic ---

                # 1. Filter by Year Range
                if filter_start_year is not None or filter_end_year is not None:
                    try:
                        row_year = int(row.get(COL_YEAR, 0))
                        if filter_start_year is not None and row_year < filter_start_year:
                            continue
                        if filter_end_year is not None and row_year > filter_end_year:
                            continue
                    except ValueError:
                        continue

                        # 2. Filter by Town (case-insensitive)
                if filter_town is not None:
                    row_town = row.get(COL_TOWN, '').lower()
                    if row_town != filter_town.lower():
                        continue

                # 3. Filter by Property Type (case-insensitive)
                if filter_property_type is not None:
                    row_type = row.get(COL_TYPE, '').lower()
                    if row_type != filter_property_type.lower():
                        continue

                # --- PROJECTION & KEY RENAMING ---
                projected_row = {}
                for key in PROJECTION_FIELDS:
                    # Rename keys to snake_case for JavaScript/TypeScript
                    new_key = key.lower().replace(' ', '_')
                    projected_row[new_key] = row.get(key, None)

                # --- TYPE CONVERSION (Numbers) ---
                for key in ['assessed_value', 'sale_amount', 'sales_ratio', 'list_year']:
                    field = projected_row.get(key)
                    if field is not None:
                        try:
                            # Convert to float/int
                            projected_row[key] = float(field) if '.' in str(field) or key == 'sales_ratio' else int(field)
                        except (ValueError, TypeError):
                            projected_row[key] = None

                data.append(projected_row)

        # Write the filtered data to the JSON file
        with open(json_file_path, mode='w', encoding='utf-8') as jsonfile:
            json.dump(data, jsonfile, indent=4)

        print(f"\n Success! Filtered and Projected {len(data)} records saved to:\n{json_file_path}")

    except FileNotFoundError:
        print(f"\n Error: The file '{csv_file_path}' was not found. Please check the path.")
    except Exception as e:
        print(f"\n An error occurred during conversion: {e}")


# ----------------------------------------------------------------------
# --- INTERACTIVE USER INPUT FUNCTION ---
# ----------------------------------------------------------------------

def get_user_input():
    """Prompts the user for filtering parameters and executes the conversion."""

    print("\n" + "="*50)
    print("      Real Estate CSV to JSON Converter")
    print("="*50)

    # --- 1. Year Range ---
    while True:
        start_year_input = input(f"Enter Start Year (e.g., 2018) or leave blank: ").strip()
        end_year_input = input(f"Enter End Year (e.g., 2023) or leave blank: ").strip()

        start_year = int(start_year_input) if start_year_input.isdigit() else None
        end_year = int(end_year_input) if end_year_input.isdigit() else None

        if start_year is not None and end_year is not None and start_year > end_year:
            print("Warning: Start Year cannot be greater than End Year. Please re-enter.")
        else:
            break

    # --- 2. Town ---
    town = input(f"Enter Town Name (e.g., Avon) or leave blank for all towns: ").strip()
    town = town if town else None

    # --- 3. Property Type ---
    prop_type = input(f"Enter Property Type (e.g., Residential) or leave blank for all types: ").strip()
    prop_type = prop_type if prop_type else None

    # --- 4. Output File Name ---
    default_name = "filtered_data"
    if town:
        default_name += f"_{town.lower().replace(' ', '_')}"
    if start_year or end_year:
        start_str = str(start_year) if start_year else "min"
        end_str = str(end_year) if end_year else "max"
        default_name += f"_{start_str}_{end_str}"

    output_name_input = input(f"Enter Output File Name (default: {default_name}.json): ").strip()
    output_file_name = output_name_input if output_name_input else default_name


    # --- Execute Conversion ---
    print("\n--- Conversion Started ---")
    convert_csv_to_json(
        csv_file_path=INPUT_CSV_FILE,
        json_file_path=get_output_path(output_file_name),
        filter_start_year=start_year,
        filter_end_year=end_year,
        filter_town=town,
        filter_property_type=prop_type
    )

if __name__ == "__main__":
    check_csv_headers(INPUT_CSV_FILE)
    get_user_input()