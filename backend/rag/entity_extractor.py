import re


def extract_entities(text):

    # --------------------------------
    # Equipment Tags
    # --------------------------------

    equipment = re.findall(
        r'\b(?:Pump|Motor|Valve|Boiler|Turbine|Compressor|Condenser|Heat\s*Exchanger)?\s*[A-Z]{1,5}-?\d{1,4}[A-Z]?\b',
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------
    # Pressure Values
    # --------------------------------

    pressures = re.findall(
        r'\b\d+(?:\.\d+)?\s*(?:PSI|BAR|KPA|MPA)\b',
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------
    # Temperatures
    # --------------------------------

    temperatures = re.findall(
        r'\b\d+(?:\.\d+)?\s*°?\s*(?:C|F)\b',
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------
    # Flow Rates
    # --------------------------------

    flow_rates = re.findall(
        r'\b\d+(?:\.\d+)?\s*(?:LPM|GPM|M3/H|KG/H)\b',
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------
    # Regulations / Standards
    # --------------------------------

    regulations = re.findall(
        r'\b(?:IS|OISD|PESO|ASME|API|BIS|ISO)\s*[-:]?\s*\d+\b',
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------
    # Incident Reports
    # --------------------------------

    incidents = re.findall(
        r'\bIR-\d{4}-\d+\b',
        text,
        flags=re.IGNORECASE
    )

    # --------------------------------
    # Maintenance Activities
    # --------------------------------

    maintenance = re.findall(
        r'\b(?:inspection|lubrication|alignment|bearing inspection|seal inspection|audit|maintenance)\b',
        text,
        flags=re.IGNORECASE
    )

    return {

        "equipment":
        sorted(
            list(
                set(
                    map(str.strip, equipment)
                )
            )
        ),

        "pressures":
        sorted(
            list(
                set(
                    map(str.strip, pressures)
                )
            )
        ),

        "temperatures":
        sorted(
            list(
                set(
                    map(str.strip, temperatures)
                )
            )
        ),

        "flow_rates":
        sorted(
            list(
                set(
                    map(str.strip, flow_rates)
                )
            )
        ),

        "regulations":
        sorted(
            list(
                set(
                    map(str.strip, regulations)
                )
            )
        ),

        "incidents":
        sorted(
            list(
                set(
                    map(str.strip, incidents)
                )
            )
        ),

        "maintenance":
        sorted(
            list(
                set(
                    map(str.strip, maintenance)
                )
            )
        )
    }