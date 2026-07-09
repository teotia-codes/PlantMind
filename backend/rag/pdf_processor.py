from pathlib import Path

import easyocr
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
from pypdf import PdfReader

# Create OCR reader only once
reader = easyocr.Reader(["en"], gpu=False)


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF.

    1. Try normal PDF extraction.
    2. If very little text is found, assume the PDF is scanned.
    3. Perform OCR on every page.
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

    # Searchable PDF
    if len(text.strip()) > 100:
        return text

    print("[OCR] Scanned PDF detected. Running OCR...")

    pages = convert_from_path(
    pdf_path,
    poppler_path=r"C:\poppler\poppler-26.02.0\Library\bin"
)

    ocr_text = []

    for page in pages:

        image = np.array(page)

        result = reader.readtext(
            image,
            detail=0,
            paragraph=True
        )

        ocr_text.append("\n".join(result))

    return "\n\n".join(ocr_text)


def extract_text_from_image(image_path: str) -> str:
    """
    OCR for images.
    """

    image = Image.open(image_path)

    image = np.array(image)

    result = reader.readtext(
        image,
        detail=0,
        paragraph=True
    )

    return "\n".join(result)


def extract_text(file_path: str) -> str:
    """
    Universal text extraction.

    Supports:
    - PDF
    - PNG
    - JPG
    - JPEG
    - BMP
    - TIFF
    """

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