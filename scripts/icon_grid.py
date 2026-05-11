#!/usr/bin/env python3
"""Generate tiny UI icons from a 2D grid.

This helper is intentionally dependency-free so it can be used during
development without changing the app package. Prefer Lucide-style SVG for
interface icons; pixel SVG/PNG are available when a raster-like asset is more
convenient.

Example:

    from scripts.icon_grid import save_icon, save_lucide_grid_svg

    save_icon(
        [
            "..#..",
            ".###.",
            "#####",
            "..#..",
            "..#..",
        ],
        "src/assets/icons/arrow.svg",
        palette={".": None, "#": "#d7d7d7"},
        cell=4,
    )

    save_lucide_grid_svg(
        [
            "..#..",
            ".###.",
            "#####",
            "..#..",
            "..#..",
        ],
        "src/assets/icons/arrow-lucide.svg",
    )
"""

from __future__ import annotations

import argparse
import json
import re
import struct
import zlib
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape

ColorValue = str | tuple[int, int, int] | tuple[int, int, int, int] | None
GridRow = str | list[ColorValue]
Grid = list[GridRow]
Palette = dict[str, ColorValue]


def normalize_color(value: ColorValue, palette: Palette | None = None) -> tuple[int, int, int, int] | None:
    """Return RGBA for a color token, or None for transparent cells."""
    if value is None:
        return None
    if isinstance(value, tuple):
        if len(value) == 3:
            return (value[0], value[1], value[2], 255)
        if len(value) == 4:
            return value
        raise ValueError(f"Unsupported tuple color length: {len(value)}")

    token = value
    if palette and token in palette:
        return normalize_color(palette[token], palette=None)
    if token in {"", ".", " ", "transparent", "none", "None"}:
        return None

    hex_color = token.strip()
    if not hex_color.startswith("#"):
        raise ValueError(f"Unknown color token {token!r}; add it to the palette or use #RGB/#RRGGBB/#RRGGBBAA")

    body = hex_color[1:]
    if re.fullmatch(r"[0-9a-fA-F]{3}", body):
        r, g, b = (int(ch * 2, 16) for ch in body)
        return (r, g, b, 255)
    if re.fullmatch(r"[0-9a-fA-F]{4}", body):
        r, g, b, a = (int(ch * 2, 16) for ch in body)
        return (r, g, b, a)
    if re.fullmatch(r"[0-9a-fA-F]{6}", body):
        return (int(body[0:2], 16), int(body[2:4], 16), int(body[4:6], 16), 255)
    if re.fullmatch(r"[0-9a-fA-F]{8}", body):
        return (
            int(body[0:2], 16),
            int(body[2:4], 16),
            int(body[4:6], 16),
            int(body[6:8], 16),
        )
    raise ValueError(f"Unsupported hex color {token!r}")


def iter_cells(grid: Grid, palette: Palette | None = None) -> Iterable[tuple[int, int, tuple[int, int, int, int]]]:
    """Yield x, y, RGBA for every non-transparent cell."""
    width = validate_grid(grid)
    for y, row in enumerate(grid):
        cells: Iterable[ColorValue] = row if not isinstance(row, str) else list(row)
        for x, value in enumerate(cells):
            color = normalize_color(value, palette)
            if color is not None:
                yield x, y, color
    if width == 0:
        return


def validate_grid(grid: Grid) -> int:
    """Ensure the grid is rectangular and return its width."""
    if not grid:
        raise ValueError("Grid must contain at least one row")
    widths = [len(row) for row in grid]
    width = widths[0]
    if width == 0:
        raise ValueError("Grid rows must not be empty")
    if any(current != width for current in widths):
        raise ValueError(f"Grid must be rectangular; row widths are {widths}")
    return width


def color_to_svg(color: tuple[int, int, int, int]) -> str:
    r, g, b, a = color
    if a == 255:
        return f"#{r:02x}{g:02x}{b:02x}"
    return f"rgba({r},{g},{b},{a / 255:.3f})"


def save_svg(grid: Grid, path: str | Path, palette: Palette | None = None, cell: int = 1) -> None:
    """Save a 2D grid as an SVG icon."""
    width = validate_grid(grid)
    height = len(grid)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    rects = []
    for x, y, color in iter_cells(grid, palette):
        rects.append(
            f'<rect x="{x * cell}" y="{y * cell}" width="{cell}" height="{cell}" fill="{escape(color_to_svg(color))}" />'
        )

    svg = "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width * cell}" height="{height * cell}" viewBox="0 0 {width * cell} {height * cell}" shape-rendering="crispEdges">',
            *rects,
            "</svg>",
            "",
        ]
    )
    path.write_text(svg, encoding="utf-8")


def grid_to_mask(grid: Grid, palette: Palette | None = None) -> list[list[bool]]:
    """Return a boolean mask for non-transparent grid cells."""
    validate_grid(grid)
    mask: list[list[bool]] = []
    for row in grid:
        cells: Iterable[ColorValue] = row if not isinstance(row, str) else list(row)
        current_row: list[bool] = []
        for value in cells:
            if isinstance(value, str):
                token = value.strip()
                if palette and token in palette:
                    current_row.append(normalize_color(palette[token], palette=None) is not None)
                else:
                    current_row.append(token not in {"", ".", " ", "transparent", "none", "None"})
            else:
                current_row.append(value is not None)
        mask.append(current_row)
    return mask


def save_lucide_grid_svg(
    grid: Grid,
    path: str | Path,
    palette: Palette | None = None,
    stroke_width: float = 2,
    size: int = 24,
    padding: float = 3,
) -> None:
    """Save a 2D grid as a Lucide-compatible, stroke-only SVG.

    Non-empty cells are converted into rounded horizontal and vertical strokes.
    The result uses the same important defaults as lucide-react icons:
    24x24 viewBox, fill="none", stroke="currentColor", rounded caps/joins.
    """
    width = validate_grid(grid)
    height = len(grid)
    mask = grid_to_mask(grid, palette)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    drawing = max(width, height)
    scale = (size - padding * 2) / drawing
    offset_x = (size - width * scale) / 2
    offset_y = (size - height * scale) / 2

    def cx(x: int) -> float:
        return offset_x + (x + 0.5) * scale

    def cy(y: int) -> float:
        return offset_y + (y + 0.5) * scale

    paths: list[str] = []

    for y, row in enumerate(mask):
        x = 0
        while x < width:
            if not row[x]:
                x += 1
                continue
            start = x
            while x + 1 < width and row[x + 1]:
                x += 1
            end = x
            if start == end:
                paths.append(f"M{cx(start) - 0.01:.2f} {cy(y):.2f}H{cx(end) + 0.01:.2f}")
            else:
                paths.append(f"M{cx(start):.2f} {cy(y):.2f}H{cx(end):.2f}")
            x += 1

    for x in range(width):
        y = 0
        while y < height:
            if not mask[y][x]:
                y += 1
                continue
            start = y
            while y + 1 < height and mask[y + 1][x]:
                y += 1
            end = y
            if start != end:
                paths.append(f"M{cx(x):.2f} {cy(start):.2f}V{cy(end):.2f}")
            y += 1

    path_elements = [f'<path d="{escape(d)}" />' for d in paths]
    svg = "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none" stroke="currentColor" stroke-width="{stroke_width:g}" stroke-linecap="round" stroke-linejoin="round">',
            *path_elements,
            "</svg>",
            "",
        ]
    )
    path.write_text(svg, encoding="utf-8")


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)


def save_png(grid: Grid, path: str | Path, palette: Palette | None = None, cell: int = 1) -> None:
    """Save a 2D grid as a truecolor RGBA PNG."""
    width = validate_grid(grid)
    height = len(grid)
    out_width = width * cell
    out_height = height * cell
    pixels = bytearray([0] * out_width * out_height * 4)

    for x, y, color in iter_cells(grid, palette):
        r, g, b, a = color
        for yy in range(y * cell, (y + 1) * cell):
            for xx in range(x * cell, (x + 1) * cell):
                index = (yy * out_width + xx) * 4
                pixels[index : index + 4] = bytes((r, g, b, a))

    scanlines = bytearray()
    row_bytes = out_width * 4
    for y in range(out_height):
        scanlines.append(0)
        start = y * row_bytes
        scanlines.extend(pixels[start : start + row_bytes])

    png = b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            png_chunk(b"IHDR", struct.pack(">IIBBBBB", out_width, out_height, 8, 6, 0, 0, 0)),
            png_chunk(b"IDAT", zlib.compress(bytes(scanlines))),
            png_chunk(b"IEND", b""),
        ]
    )

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def save_icon(
    grid: Grid,
    path: str | Path,
    palette: Palette | None = None,
    cell: int = 1,
    style: str = "pixel",
    stroke_width: float = 2,
) -> None:
    """Save a grid as `.svg` or `.png` based on the output extension.

    style="pixel" keeps the original filled-cell output.
    style="lucide" outputs a stroke-only SVG compatible with lucide-react.
    """
    suffix = Path(path).suffix.lower()
    if style == "lucide":
        if suffix != ".svg":
            raise ValueError("Lucide-style icons must be saved as .svg")
        save_lucide_grid_svg(grid, path, palette=palette, stroke_width=stroke_width)
        return
    if style != "pixel":
        raise ValueError("style must be 'pixel' or 'lucide'")
    if suffix == ".svg":
        save_svg(grid, path, palette=palette, cell=cell)
        return
    if suffix == ".png":
        save_png(grid, path, palette=palette, cell=cell)
        return
    raise ValueError("Output path must end in .svg or .png")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a PNG or SVG icon from a JSON 2D grid.")
    parser.add_argument("grid_json", help="JSON grid, for example '[\".#.\",\"###\"]'")
    parser.add_argument("output", help="Output path ending in .svg or .png")
    parser.add_argument("--palette", default="{}", help='JSON palette, for example \'{"#":"#d7d7d7",".":null}\'')
    parser.add_argument("--cell", type=int, default=1, help="Output pixels per grid cell")
    parser.add_argument("--style", choices=["pixel", "lucide"], default="pixel", help="SVG style. Use lucide for currentColor stroke icons.")
    parser.add_argument("--stroke-width", type=float, default=2, help="Stroke width for --style lucide")
    args = parser.parse_args()

    grid = json.loads(args.grid_json)
    palette = json.loads(args.palette)
    save_icon(grid, args.output, palette=palette, cell=args.cell, style=args.style, stroke_width=args.stroke_width)


if __name__ == "__main__":
    main()
