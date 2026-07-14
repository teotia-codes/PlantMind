from pathlib import Path

import numpy as np
from PIL import Image
from pdf2image import convert_from_path
from pypdf import PdfReader

# --------------------------------------------------
# Lazy EasyOCR Loader
# --------------------------------------------------

reader = None


def get_reader():
    """
    Load EasyOCR only when OCR is actually needed.
    This prevents Render from downloading models during startup.
    """

    global reader

    if reader is None:
        print("[OCR] Initializing EasyOCR...")

        import easyocr

        reader = easyocr.Reader(
            ["en"],
            gpu=False
        )

        print("[OCR] EasyOCR Ready.")

    return reader


# --------------------------------------------------
# PDF Extraction
# --------------------------------------------------

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF.

    1. Try normal PDF extraction.
    2. If little text is found, treat it as a scanned PDF.
    3. Perform OCR.
    """

    text = ""

    try:
        pdf = PdfReader(pdf_path)

        for page in pdf.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    except Exception as e:
        print("PDF extraction error:", e)

    # --------------------------------------------------
    # Normal searchable PDF
    # --------------------------------------------------

    if len(text.strip()) > 100:
        return text

    print("[OCR] Scanned PDF detected. Running OCR...")

    # --------------------------------------------------
    # Convert pages to images
    # --------------------------------------------------

    import os

    if os.name == "nt":
        pages = convert_from_path(
            pdf_path,
            poppler_path=r"C:\poppler\poppler-26.02.0\Library\bin"
        )
    else:
        pages = convert_from_path(pdf_path)

    # Load OCR only here
    ocr_reader = get_reader()

    ocr_text = []

    for page in pages:

        image = np.array(page)

        result = ocr_reader.readtext(
            image,
            detail=0,
            paragraph=True,
        )

        ocr_text.append("\n".join(result))

    return "\n\n".join(ocr_text)


# --------------------------------------------------
# Image OCR
# --------------------------------------------------

def extract_text_from_image(image_path: str) -> str:

    image = Image.open(image_path)

    image = np.array(image)

    ocr_reader = get_reader()

    result = ocr_reader.readtext(
        image,
        detail=0,
        paragraph=True,
    )

    return "\n".join(result)


# --------------------------------------------------
# Universal Extractor
# --------------------------------------------------

def extract_text(file_path: str) -> str:

    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_path)

    if ext in [
        ".png",
        ".jpg",
        ".jpeg",
        ".bmp",
        ".tiff",
        ".tif",
    ]:
        return extract_text_from_image(file_path)

    raise ValueError(
        f"Unsupported file type: {ext}"
    )