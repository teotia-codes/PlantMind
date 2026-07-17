import re


def _deduplicate(items):
    seen = set()
    result = []

    for item in items:
        item = re.sub(r"\s+", " ", item.strip())

        if item and item.lower() not in seen:
            seen.add(item.lower())
            result.append(item)

    return result


def extract_entities(text: str):

    # --------------------------------------------------------
    # Equipment
    # --------------------------------------------------------

    equipment_pattern = (
        r"(?<!-)(?<!\w)"  # not glued onto a preceding hyphen or word char
        r"(?:Pump|Motor|Valve|Boiler|Turbine|Compressor|"
        r"Condenser|Heat\s+Exchanger|Fan|Generator|"
        r"Reactor|Separator|Vessel|Tank|Column|"
        r"Cooler|Heater|Blower|Filter|Drum)"
        r"(?:\s+[A-Z]{1,4}-?\d{1,4}[A-Z]?|-?[A-Z]{0,4}\d{1,4}[A-Z]?)"
    )

    equipment = re.findall(
        equipment_pattern,
        text,
        flags=re.IGNORECASE,
    )

    equipment = _deduplicate(equipment)

    # --------------------------------------------------------
    # Pressure
    # --------------------------------------------------------

    pressures = re.findall(
        r"\b\d+(?:\.\d+)?\s*(?:PSI|PSIG|PSIA|BAR|KPA|MPA)\b",
        text,
        flags=re.IGNORECASE,
    )

    pressures = _deduplicate(pressures)

    # --------------------------------------------------------
    # Temperature
    # --------------------------------------------------------

    temperatures = re.findall(
        r"\b\d+(?:\.\d+)?\s*°?\s*(?:C|F|CELSIUS|FAHRENHEIT)\b",
        text,
        flags=re.IGNORECASE,
    )

    temperatures = _deduplicate(temperatures)

    # --------------------------------------------------------
    # Flow
    # --------------------------------------------------------

    flow_rates = re.findall(
        r"\b\d+(?:\.\d+)?\s*(?:LPM|GPM|M3/H|M³/H|KG/H|kg/h|m3/h)\b",
        text,
        flags=re.IGNORECASE,
    )

    flow_rates = _deduplicate(flow_rates)

    # --------------------------------------------------------
    # RPM
    # --------------------------------------------------------

    rpm = re.findall(
        r"\b\d+(?:\.\d+)?\s*RPM\b",
        text,
        flags=re.IGNORECASE,
    )

    rpm = _deduplicate(rpm)

    # --------------------------------------------------------
    # Voltage
    # --------------------------------------------------------

    voltages = re.findall(
        r"\b\d+(?:\.\d+)?\s*(?:V|KV|VAC|VDC)\b",
        text,
        flags=re.IGNORECASE,
    )

    voltages = _deduplicate(voltages)

    # --------------------------------------------------------
    # Regulations
    # --------------------------------------------------------

    regulations = re.findall(
        r"\b(?:API|ASME|ISO|IEC|NFPA|OSHA|OISD|PESO|IS|BIS)"
        r"\s*[-:]?\s*\d+(?:[:\-]\d+)?\b",
        text,
        flags=re.IGNORECASE,
    )

    regulations = _deduplicate(regulations)

    # --------------------------------------------------------
    # Incident IDs
    # --------------------------------------------------------

    incidents = re.findall(
        r"\b(?:IR|NCR|WO|MWO|CR)-\d{2,4}-\d+\b",
        text,
        flags=re.IGNORECASE,
    )

    incidents = _deduplicate(incidents)

    # --------------------------------------------------------
    # Maintenance Keywords
    # --------------------------------------------------------

    maintenance = re.findall(
        r"\b(?:inspection|lubrication|alignment|"
        r"bearing replacement|bearing inspection|"
        r"seal replacement|seal inspection|"
        r"preventive maintenance|corrective maintenance|"
        r"shutdown|overhaul|calibration|audit|"
        r"greasing|cleaning|testing|pressure test|"
        r"hydro test|vibration monitoring)\b",
        text,
        flags=re.IGNORECASE,
    )

    maintenance = _deduplicate(maintenance)

    # --------------------------------------------------------
    # Maintenance Frequency
    # --------------------------------------------------------

    frequencies = re.findall(
        r"\b(?:daily|weekly|monthly|quarterly|yearly|annual|annually)\b",
        text,
        flags=re.IGNORECASE,
    )

    frequencies = _deduplicate(frequencies)

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    relationships = []

    # Each side of the verb must itself be a full equipment mention
    # (e.g. "Pump P-101", "Heat Exchanger E-201") rather than a single
    # loose word, otherwise multi-word tags get truncated to their last
    # or first token (e.g. "P-101" -> "Heat" instead of the full names).
    relation_patterns = [

        (
            rf"({equipment_pattern})\s+(?:supplies|feeds|delivers)\s+({equipment_pattern})",
            "SUPPLIES",
        ),

        (
            rf"({equipment_pattern})\s+(?:connects to|connected to)\s+({equipment_pattern})",
            "CONNECTED_TO",
        ),

        (
            rf"({equipment_pattern})\s+(?:protects)\s+({equipment_pattern})",
            "PROTECTS",
        ),

        (
            rf"({equipment_pattern})\s+(?:monitors)\s+({equipment_pattern})",
            "MONITORS",
        ),

        (
            rf"({equipment_pattern})\s+(?:controls)\s+({equipment_pattern})",
            "CONTROLS",
        ),

    ]

    for pattern, relation in relation_patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        for src, tgt in matches:

            src = re.sub(r"\s+", " ", src.strip())
            tgt = re.sub(r"\s+", " ", tgt.strip())

            relationships.append(
                {
                    "source": src,
                    "target": tgt,
                    "relation": relation,
                }
            )

    # --------------------------------------------------------
    # Auto-connect adjacent equipment
    # --------------------------------------------------------

    if len(equipment) >= 2:

        for i in range(len(equipment) - 1):

            relationships.append(
                {
                    "source": equipment[i],
                    "target": equipment[i + 1],
                    "relation": "CONNECTED_TO",
                }
            )

    # Remove duplicate relationships
    unique = {}
    for rel in relationships:
        key = (
            rel["source"].lower(),
            rel["target"].lower(),
            rel["relation"],
        )
        unique[key] = rel

    relationships = list(unique.values())

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return {
        "equipment": equipment,
        "pressures": pressures,
        "temperatures": temperatures,
        "flow_rates": flow_rates,
        "rpm": rpm,
        "voltages": voltages,
        "regulations": regulations,
        "incidents": incidents,
        "maintenance": maintenance,
        "frequencies": frequencies,
        "relationships": relationships,
    }