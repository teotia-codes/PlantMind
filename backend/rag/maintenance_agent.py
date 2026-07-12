from rag.gemini_service import generate_answer


def generate_maintenance_schedule(
    context: str,
    equipment: str,
    horizon: str,
):
    """
    Generate an AI preventive maintenance plan grounded ONLY
    in the uploaded documents.
    """

    prompt = f"""
You are a Senior Reliability Engineer with 25+ years of
experience in industrial asset management.

====================================================
EQUIPMENT
====================================================

{equipment}

====================================================
PLANNING HORIZON
====================================================

{horizon}

====================================================
KNOWLEDGE BASE
====================================================

{context}

====================================================
INSTRUCTIONS
====================================================

Use ONLY the uploaded document context.

Never invent maintenance intervals.

If any information is unavailable,
explicitly write:

"Not specified in uploaded documents."

Generate a professional preventive maintenance report.

====================================================
OUTPUT FORMAT
====================================================

# Preventive Maintenance Plan

## Equipment
{equipment}

## Planning Horizon
{horizon}

## Overall Risk
(Low / Medium / High)

## AI Confidence
(0-100%)

## Next Recommended Inspection

---

## 🔴 Immediate Actions

- ...

---

## 🟠 Weekly Maintenance

- ...

---

## 🟡 Monthly Maintenance

- ...

---

## 🟢 Quarterly Maintenance

- ...

---

## 🔵 Annual Maintenance

- ...

---

## Required Spare Parts

- ...

---

## Recommended Tools

- ...

---

## PPE Required

- ...

---

## Failure Consequences

- ...

---

## Regulatory References

- ...

---

## AI Recommendations

Provide 3-5 concise recommendations
to improve equipment reliability.

====================================================

If any section has no information,
write exactly:

Not specified in uploaded documents.

Do not hallucinate.

Do not invent maintenance intervals.

Base everything ONLY on the supplied context.
"""

    return generate_answer(context, prompt)