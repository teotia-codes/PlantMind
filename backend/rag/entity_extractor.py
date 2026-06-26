import re


def extract_entities(text: str) -> dict:
    """
    Extract industrial entities from raw document text.

    Categories
    ----------
    equipment    — named plant assets with a known prefix (Pump, Valve, etc.)
    pressures    — numeric pressure readings with engineering units
    temperatures — numeric temperature readings (°C / °F)
    flow_rates   — volumetric / mass flow measurements
    regulations  — referenced standards and regulatory codes
    incidents    — incident-report identifiers (IR-YYYY-NNN, NCR-NNN, WO-NNN)
    maintenance  — maintenance-activity keywords found in text
    """

    # ------------------------------------------------------------------ #
    # Equipment tags                                                        #
    # Handles two common P&ID notation styles:                             #
    #   "Pump P-101"   (prefix SPACE tag)                                  #
    #   "Pump-P101"    (prefix directly attached to tag)                   #
    #   "Boiler-301"   (prefix + hyphen + number only)                     #
    # The prefix is REQUIRED to avoid noise like HR-55, AI-4, REF-9001.   #
    # ------------------------------------------------------------------ #
    _PREFIX = (
        r'(?:Pump|Motor|Valve|Boiler|Turbine|Compressor|Condenser|'
        r'Heat\s+Exchanger|Fan|Generator|Reactor|Separator|Vessel|'
        r'Drum|Column|Filter|Heater|Cooler|Exchanger|Tank|Blower|'
        r'Agitator|Centrifuge|Ejector|Evaporator|Furnace)'
    )

    equipment = re.findall(
        _PREFIX +
        r'(?:'
        r'\s+[A-Z]{1,3}-\d{1,4}[A-Z]?'   # "Pump P-101" / "Heat Exchanger HE-201"
        r'|-[A-Z]{0,3}\d{1,4}[A-Z]?'      # "Boiler-301" / "Pump-P102"
        r'|\d{1,4}[A-Z]?'                 # "Boiler301"  (no hyphen)
        r')\b',
        text,
        flags=re.IGNORECASE,
    )

    # Normalise internal whitespace (e.g. "Heat  Exchanger HE-201" → clean)
    equipment = [re.sub(r'\s+', ' ', e.strip()) for e in equipment]

    # ------------------------------------------------------------------ #
    # Pressure values                                                       #
    # ------------------------------------------------------------------ #
    pressures = re.findall(
        r'\b\d+(?:\.\d+)?\s*(?:PSI|PSIG|PSIA|BAR|KPA|MPA|kPa|MPa|bar)\b',
        text,
        flags=re.IGNORECASE,
    )

    # ------------------------------------------------------------------ #
    # Temperature values                                                    #
    # ------------------------------------------------------------------ #
    temperatures = re.findall(
        r'\b\d+(?:\.\d+)?\s*°?\s*(?:Celsius|Fahrenheit|[CF])\b',
        text,
        flags=re.IGNORECASE,
    )

    # ------------------------------------------------------------------ #
    # Flow rates                                                            #
    # ------------------------------------------------------------------ #
    flow_rates = re.findall(
        r'\b\d+(?:\.\d+)?\s*(?:LPM|GPM|M3/H|KG/H|m³/h|kg/h|l/min)\b',
        text,
        flags=re.IGNORECASE,
    )

    # ------------------------------------------------------------------ #
    # Regulatory / standards references                                     #
    # ------------------------------------------------------------------ #
    regulations = re.findall(
        r'\b(?:IS|OISD|PESO|ASME|API|BIS|ISO|IEC|NFPA|OSHA|EN)\s*[-:]?\s*\d+(?:[:\-]\d+)?\b',
        text,
        flags=re.IGNORECASE,
    )

    # ------------------------------------------------------------------ #
    # Incident / work order IDs                                            #
    # ------------------------------------------------------------------ #
    incidents = re.findall(
        r'\b(?:IR|NCR|WO|MWO|CR)-\d{2,4}-\d+\b',
        text,
        flags=re.IGNORECASE,
    )

    # ------------------------------------------------------------------ #
    # Maintenance activity keywords                                         #
    # ------------------------------------------------------------------ #
    maintenance = re.findall(
        r'\b(?:inspection|lubrication|alignment|calibration|'
        r'bearing\s+replacement|seal\s+replacement|'
        r'bearing\s+inspection|seal\s+inspection|'
        r'hydro\s+test|pressure\s+test|'
        r'preventive\s+maintenance|corrective\s+maintenance|'
        r'shutdown|overhaul|audit|maintenance)\b',
        text,
        flags=re.IGNORECASE,
    )

    def dedup(lst: list) -> list:
        return sorted(set(re.sub(r'\s+', ' ', x.strip()) for x in lst))

    return {
        "equipment":    dedup(equipment),
        "pressures":    dedup(pressures),
        "temperatures": dedup(temperatures),
        "flow_rates":   dedup(flow_rates),
        "regulations":  dedup(regulations),
        "incidents":    dedup(incidents),
        "maintenance":  dedup(maintenance),
    }
