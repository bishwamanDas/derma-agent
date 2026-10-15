DISEASES = {
    "AK": {
        "name": "Actinic Keratosis",
        "severity": "moderate",
        "description": (
            "A rough, scaly patch caused by years of sun exposure. It is "
            "precancerous — a small percentage can progress to squamous cell "
            "carcinoma if left untreated."
        ),
        "tips": [
            "Use sunscreen with SPF 30+ every day.",
            "Avoid sun exposure during peak hours (10am–4pm).",
            "Consult a dermatologist — cryotherapy or topical treatment may be advised.",
        ],
    },
    "BCC": {
        "name": "Basal Cell Carcinoma",
        "severity": "high",
        "description": (
            "The most common form of skin cancer, arising from basal cells. It "
            "rarely spreads but grows locally and should be removed."
        ),
        "tips": [
            "Consult a dermatologist promptly.",
            "Mohs surgery or excision are common, highly effective removal options.",
            "Protect skin with hats, clothing and sunscreen to prevent new lesions.",
        ],
    },
    "BKL": {
        "name": "Benign Keratosis",
        "severity": "low",
        "description": (
            "A common benign growth (seborrheic / pigmented benign keratosis). "
            "These 'barnacles of ageing' are harmless and not contagious."
        ),
        "tips": [
            "No treatment needed if asymptomatic.",
            "Removal can be considered for cosmetic reasons or if irritated.",
            "Avoid picking or scratching the area.",
        ],
    },
    "DF": {
        "name": "Dermatofibroma",
        "severity": "low",
        "description": (
            "A small, firm, benign nodule that often appears on the legs after "
            "minor trauma such as an insect bite."
        ),
        "tips": [
            "Monitor for changes in size or color.",
            "Avoid trauma to the area.",
            "See a doctor if it becomes painful or grows.",
        ],
    },
    "MEL": {
        "name": "Melanoma",
        "severity": "high",
        "description": (
            "The most dangerous form of skin cancer, arising from pigment "
            "cells. Highly curable when detected early — early evaluation is "
            "critical."
        ),
        "tips": [
            "Seek medical evaluation immediately.",
            "Monitor the ABCDE signs: Asymmetry, Border, Color, Diameter, Evolving.",
            "Avoid tanning beds and unprotected UV exposure.",
        ],
    },
    "NV": {
        "name": "Nevus (Mole)",
        "severity": "low",
        "description": (
            "A common, benign pigmented mole. Most adults have 10–40 of them. "
            "They are harmless unless they change."
        ),
        "tips": [
            "Watch for asymmetry, border irregularity or color changes.",
            "Photograph moles periodically to track changes.",
            "Have a dermatologist biopsy any mole that changes or looks unusual.",
        ],
    },
    "SCC": {
        "name": "Squamous Cell Carcinoma",
        "severity": "high",
        "description": (
            "The second most common skin cancer. It can spread if untreated, "
            "but is highly curable when caught early."
        ),
        "tips": [
            "Seek early treatment from a dermatologist.",
            "Surgical removal (excision or Mohs) may be required.",
            "Use sun protection to prevent recurrence.",
        ],
    },
    "VASC": {
        "name": "Vascular Lesion",
        "severity": "low",
        "description": (
            "Benign lesions made of blood or lymph vessels (e.g. cherry "
            "angiomas, pyogenic granulomas). Usually harmless."
        ),
        "tips": [
            "Consider laser therapy if removal is desired.",
            "Consult a dermatologist to confirm the diagnosis.",
            "Avoid trauma to the affected area — these can bleed.",
        ],
    },
}

SEVERITY_META = {
    "low": {
        "label": "Low concern",
        "color": "#10b981",
        "advice": "Likely benign. Keep monitoring it during your regular skin self-checks.",
    },
    "moderate": {
        "label": "Moderate concern",
        "color": "#f59e0b",
        "advice": "Worth a non-urgent dermatology appointment for confirmation.",
    },
    "high": {
        "label": "High concern",
        "color": "#ef4444",
        "advice": "Please book an appointment with a dermatologist as soon as possible.",
    },
}
