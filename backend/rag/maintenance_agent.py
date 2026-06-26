from rag.gemini_service import generate_answer


def generate_maintenance_schedule(
    context: str,
    equipment: str,
    horizon: str,
):
    """
    Generate a preventive maintenance schedule grounded
    ONLY in the uploaded documents.
    """

    prompt = f"""
You are a Senior Reliability Engineer with 25 years of industrial maintenance experience.

Equipment:
{equipment}

Planning Horizon:
{horizon}

Knowledge Base Context:
{context}

Your task is to generate a preventive maintenance schedule.

Rules:

- Use ONLY information available in the context.
- Never invent maintenance intervals.
- If a frequency is missing, explicitly write:
  "Frequency not specified in uploaded documents."

Return the report in EXACTLY this format.

# Maintenance Schedule

## Equipment
{equipment}

## Planning Horizon
{horizon}

## Daily Tasks
- ...

## Weekly Tasks
- ...

## Monthly Tasks
- ...

## Quarterly Tasks
- ...

## Annual Tasks
- ...

## Required Spare Parts
- ...

## Safety Precautions
- ...

## Recommended Tools
- ...

## Additional Notes
- ...

If an entire section has no information,
write:

No information available in uploaded documents.
"""

    return generate_answer(context, prompt)