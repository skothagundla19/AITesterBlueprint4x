"""Convert a generated markdown test-case table into an Excel workbook."""
import io

import pandas as pd


def parse_markdown_table(text: str) -> pd.DataFrame | None:
    """Extract the first pipe-delimited markdown table found in text, if any."""
    lines = [line.strip() for line in text.splitlines() if line.strip().startswith("|")]
    if len(lines) < 2:
        return None

    rows = [
        [cell.strip() for cell in line.strip("|").split("|")]
        for line in lines
        if not set(line.replace("|", "").replace("-", "").strip()) == set()
    ]
    if len(rows) < 2:
        return None

    header, *data_rows = rows
    data_rows = [row for row in data_rows if any(cell for cell in row)]
    if not data_rows:
        return None

    width = len(header)
    data_rows = [row[:width] + [""] * (width - len(row)) for row in data_rows]
    return pd.DataFrame(data_rows, columns=header)


def dataframe_to_excel_bytes(df: pd.DataFrame) -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Test Cases")
    return buffer.getvalue()
