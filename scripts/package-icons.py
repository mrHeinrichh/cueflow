"""Package a native-rendered PNG into macOS ICNS and Windows ICO assets.

Run on macOS after generate-icons.swift. Uses only Python's standard library
and macOS sips/iconutil. Generated assets are committed for Windows CI.
"""
from pathlib import Path
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
SOURCE = BUILD / "icon.png"


def resize(destination: Path, size: int):
    subprocess.run(
        ["sips", "-z", str(size), str(size), str(SOURCE), "--out", str(destination)],
        check=True, stdout=subprocess.DEVNULL,
    )


with tempfile.TemporaryDirectory(prefix="cueflow-icons-") as directory:
    temporary = Path(directory)
    iconset = temporary / "CueFlow.iconset"
    iconset.mkdir()
    for size in (16, 32, 128, 256, 512):
        resize(iconset / f"icon_{size}x{size}.png", size)
        resize(iconset / f"icon_{size}x{size}@2x.png", size * 2)
    subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(BUILD / "icon.icns")], check=True)

    sizes = (16, 24, 32, 48, 64, 128, 256)
    entries = []
    payloads = []
    offset = 6 + 16 * len(sizes)
    for size in sizes:
        png = temporary / f"win-{size}.png"
        resize(png, size)
        payload = png.read_bytes()
        entries.append(struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(payload), offset))
        payloads.append(payload)
        offset += len(payload)
    (BUILD / "icon.ico").write_bytes(struct.pack("<HHH", 0, 1, len(sizes)) + b"".join(entries) + b"".join(payloads))

print("Created build/icon.icns and build/icon.ico")
