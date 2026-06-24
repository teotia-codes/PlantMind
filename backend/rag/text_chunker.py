import re


def chunk_text(text, chunk_size=800, overlap=100):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) > chunk_size:
            if current:
                chunks.append(current.strip())
            current = current[-overlap:] + " " + sentence
        else:
            current += " " + sentence
    if current.strip():
        chunks.append(current.strip())
    return chunks