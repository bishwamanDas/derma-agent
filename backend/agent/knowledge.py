from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

CLINICAL_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "MEL": {
        "name": "Melanoma",
        "category": "Malignant Melanocytic Neoplasm",
        "urgency_default": "urgent",
        "dermoscopy_hallmarks": [
            "Atypical pigment network with thickened lines and irregular holes",
            "Asymmetric distribution of color and structure",
            "Blue-white veil overlying heavily pigmented areas",
            "Irregular streaks, pseudopods, or radial streaming at periphery",
            "Multiple colors (brown, black, blue, red, white) in one lesion",
        ],
        "differential_diagnoses": [
            "Dysplastic / Atypical Nevus (resembles early melanoma)",
            "Pigmented Basal Cell Carcinoma",
            "Seborrheic Keratosis (can mimic melanoma when irritated)",
            "Thrombosed Angioma or Pyogenic Granuloma",
        ],
        "biopsy_recommendation": (
            "Complete narrow excisional biopsy with 1–2 mm margins and full-thickness "
            "subcutaneous fat is standard of care. Shave or partial incisional biopsy "
            "should generally be avoided if melanoma is strongly suspected."
        ),
        "guideline_citation": "American Academy of Dermatology (AAD) / NCCN Cutaneous Melanoma Guidelines",
        "clinical_pearl": (
            "The 'ugly duckling sign' — a mole that stands out as visibly different from "
            "all the patient's other moles — is one of the most sensitive clinical indicators."
        ),
    },
    "BCC": {
        "name": "Basal Cell Carcinoma",
        "category": "Malignant Non-Melanoma Skin Cancer (Keratinocytic)",
        "urgency_default": "soon",
        "dermoscopy_hallmarks": [
            "Arborizing (tree-branching) telangiectatic vessels",
            "Ulceration and crusting with translucent border",
            "Blue-grey ovoid nests and blue-grey globules",
            "Shiny white lines and crystalline structures under polarized light",
            "Pearly rolled borders (often with central depression)",
        ],
        "differential_diagnoses": [
            "Intradermal Nevus",
            "Sebaceous Hyperplasia (umbilicated, yellowish papules)",
            "Squamous Cell Carcinoma",
            "Amelanotic Melanoma",
        ],
        "biopsy_recommendation": (
            "Shave biopsy or punch biopsy is usually diagnostic. Definitive treatment options "
            "include standard surgical excision, Mohs micrographic surgery (especially on face/ears), "
            "or electrodessication & curettage for low-risk superficial variants."
        ),
        "guideline_citation": "NCCN Clinical Practice Guidelines in Oncology: Basal Cell Skin Cancer",
        "clinical_pearl": (
            "BCC accounts for ~80% of all non-melanoma skin cancers. While metastatic spread "
            "is exceedingly rare (<0.1%), local tissue destruction can be extensive if left untreated."
        ),
    },
    "SCC": {
        "name": "Squamous Cell Carcinoma",
        "category": "Malignant Non-Melanoma Skin Cancer (Keratinocytic)",
        "urgency_default": "urgent",
        "dermoscopy_hallmarks": [
            "Keratin scale and central hyperkeratotic crust",
            "Hairpin, looped or dotted glomerular vessels surrounded by white halos",
            "Targetoid appearance or rosettes under polarized dermoscopy",
            "Rapidly enlarging tender, firm, erythematous nodule",
        ],
        "differential_diagnoses": [
            "Keratoacanthoma (rapidly growing variant of SCC)",
            "Hypertrophic Actinic Keratosis (SCC precursor)",
            "Basal Cell Carcinoma (nodular variant)",
            "Verruca vulgaris (common viral wart)",
        ],
        "biopsy_recommendation": (
            "Deep saucerization shave biopsy or punch biopsy including reticular dermis to "
            "assess depth of invasion. Wide local excision or Mohs surgery for high-risk sites."
        ),
        "guideline_citation": "American Academy of Dermatology (AAD) Squamous Cell Carcinoma Guidelines",
        "clinical_pearl": (
            "High-risk anatomic locations for recurrence and nodal metastasis include the lip, "
            "ear, scalp, and sites of previous chronic scars or radiation."
        ),
    },
    "AK": {
        "name": "Actinic Keratosis",
        "category": "Precancerous Keratinocytic Dysplasia",
        "urgency_default": "soon",
        "dermoscopy_hallmarks": [
            "Strawberry pattern (erythematous pseudo-network around follicular openings)",
            "Yellowish-white surface scale and keratotic follicular plugs",
            "Rosettes (four white dots in a clover pattern under polarized light)",
        ],
        "differential_diagnoses": [
            "Early Invasive Squamous Cell Carcinoma",
            "Discoid Lupus Erythematosus",
            "Seborrheic Keratosis",
            "Superficial Basal Cell Carcinoma",
        ],
        "biopsy_recommendation": (
            "Clinical diagnosis is usually sufficient. Shave biopsy recommended if indurated, "
            "tender, ulcerated, or refractory to cryotherapy (to rule out invasive SCC)."
        ),
        "guideline_citation": "British Association of Dermatologists (BAD) Actinic Keratosis Guidelines",
        "clinical_pearl": (
            "Approximately 0.1% to 1% of actinic keratoses per year may progress into invasive "
            "squamous cell carcinoma. Field therapies include 5-fluorouracil, imiquimod, or cryotherapy."
        ),
    },
    "BKL": {
        "name": "Benign Keratosis (Seborrheic / Lichenoid)",
        "category": "Benign Epidermal Tumor",
        "urgency_default": "routine",
        "dermoscopy_hallmarks": [
            "Milia-like cysts (small bright white round dots)",
            "Comedo-like openings (crypts and keratin-filled plugs)",
            "Cerebriform pattern ('brain-like' ridges and fissures)",
            "Moth-eaten or sharply demarcated borders ('stuck-on' appearance)",
        ],
        "differential_diagnoses": [
            "Melanoma (when deeply pigmented or traumatized)",
            "Pigmented Basal Cell Carcinoma",
            "Verruca (viral wart)",
        ],
        "biopsy_recommendation": (
            "Biopsy only necessary when clinical appearance or dermoscopy is ambiguous and "
            "cannot exclude melanoma. Shave removal is curative."
        ),
        "guideline_citation": "DermNet NZ Clinical Reference on Seborrhoeic Keratoses",
        "clinical_pearl": (
            "Completely benign and extremely common with aging ('wisdom spots'). Harmless unless "
            "irritated by clothing or showing rapid atypical asymmetric growth."
        ),
    },
    "NV": {
        "name": "Nevus (Common / Dysplastic Mole)",
        "category": "Benign Melanocytic Neoplasm",
        "urgency_default": "routine",
        "dermoscopy_hallmarks": [
            "Delicate, regular, homogeneous pigment network thinning towards the edge",
            "Symmetric distribution of pigment and globules",
            "Central hyperpigmentation or regular cobblestone / globular pattern",
        ],
        "differential_diagnoses": [
            "Early Superficial Spreading Melanoma",
            "Dermatofibroma",
            "Seborrheic Keratosis",
        ],
        "biopsy_recommendation": (
            "Reassurance and routine skin monitoring. Biopsy indicated if changing in ABCDE "
            "features, itching, bleeding, or showing an 'ugly duckling' presentation."
        ),
        "guideline_citation": "Consensus Net on Dermoscopy / International Dermoscopy Society",
        "clinical_pearl": (
            "Most adults have 10–40 nevi. Adults over 30 developing new, rapidly enlarging moles "
            "warrant dermatological evaluation."
        ),
    },
    "DF": {
        "name": "Dermatofibroma",
        "category": "Benign Fibrohistiocytic Dermal Nodule",
        "urgency_default": "routine",
        "dermoscopy_hallmarks": [
            "Central white scar-like patch",
            "Delicate peripheral faint pigment network",
            "Positive 'dimple sign' (pinching around the lesion causes inward retraction)",
        ],
        "differential_diagnoses": [
            "Dermatofibrosarcoma Protuberans (rare malignancy)",
            "Melanocytic Nevus",
            "Kaposi Sarcoma",
        ],
        "biopsy_recommendation": (
            "Clinical diagnosis with dermoscopy and dimple sign is usually definitive. "
            "Excision is elective for cosmetic or irritation reasons."
        ),
        "guideline_citation": "British Association of Dermatologists Guidelines",
        "clinical_pearl": (
            "Often arises on lower legs of young to middle-aged adults, commonly triggered by "
            "minor trauma like an insect bite or shaving nick."
        ),
    },
    "VASC": {
        "name": "Vascular Lesion (Hemangioma / Angioma)",
        "category": "Benign Endothelial Vascular Proliferation",
        "urgency_default": "routine",
        "dermoscopy_hallmarks": [
            "Red, purple, or blue-black round to oval vascular lacunae (lagons)",
            "Absence of pigment network and absence of streaks",
            "Blanches partially under glass slide pressure (diascopy)",
        ],
        "differential_diagnoses": [
            "Nodular Melanoma (can appear blue-black or red)",
            "Pigmented Basal Cell Carcinoma",
            "Pyogenic Granuloma (rapidly growing, easily bleeding)",
        ],
        "biopsy_recommendation": (
            "Clinical diagnosis is usually straightforward. If bleeding persistently or "
            "atypical dark color raises concern for nodular melanoma, excision is indicated."
        ),
        "guideline_citation": "DermNet NZ Clinical Reference on Vascular Lesions",
        "clinical_pearl": (
            "Cherry angiomas are harmless benign capillary proliferations that increase with age. "
            "Painless and non-cancerous."
        ),
    },
}

GENERAL_TOPICS = {
    "biopsy": (
        "**Skin Biopsy Overview**:\n"
        "- **Shave Biopsy**: Removes superficial layers. Useful for suspected BCC, SCC, or keratoses.\n"
        "- **Punch Biopsy**: Uses a circular blade (3–4mm) to sample full-thickness dermis and fat.\n"
        "- **Excisional Biopsy**: Completely removes the lesion with a small safety margin. Preferred whenever melanoma is suspected, as accurate Breslow thickness staging requires the entire lesion."
    ),
    "mohs": (
        "**Mohs Micrographic Surgery**:\n"
        "A specialized surgical technique where tissue margins are microscopically examined 100% in real-time during excision. Offers the highest cure rate (up to 99%) while sparing the maximum amount of healthy tissue. Indicated for BCC and SCC on cosmetically or functionally critical areas (nose, eyelids, lips, ears, fingers)."
    ),
    "sunscreen": (
        "**Dermatological Sun Protection Guidelines**:\n"
        "- Use **Broad Spectrum (UVA/UVB)** sunscreen with **SPF 30 or higher** daily.\n"
        "- Apply 1 ounce (shot glass full) 15–20 minutes before UV exposure.\n"
        "- Reapply every **2 hours**, or immediately after swimming or heavy sweating.\n"
        "- Remember physical barriers: UV-protective clothing, wide-brimmed hats (3+ inch brim), and UV400 sunglasses."
    ),
    "abcde": (
        "**The ABCDE Rules for Melanoma Detection**:\n"
        "- **A - Asymmetry**: One half does not mirror the other.\n"
        "- **B - Border**: Margins are scalloped, notched, blurry, or ragged.\n"
        "- **C - Color**: Multiple shades (tan, brown, black, white, red, or blue).\n"
        "- **D - Diameter**: Larger than 6mm (approx. pencil eraser), though melanomas can be smaller.\n"
        "- **E - Evolving**: Any noticeable change in size, shape, color, elevation, or new symptoms (itching, bleeding)."
    ),
    "red_flags": (
        "**Urgent Clinical Red Flags (See a Dermatologist Promptly)**:\n"
        "1. A new or existing mole that is rapidly growing, changing color, or becoming asymmetric.\n"
        "2. Any lesion that bleeds spontaneously, oozes, or fails to heal over 3–4 weeks.\n"
        "3. An 'Ugly Duckling' mole that looks markedly different from all other spots on your body.\n"
        "4. A firm, red, tender nodule that enlarges over several weeks."
    ),
}


def search_knowledge(query: str, condition: Optional[str] = None) -> Dict[str, Any]:
    query_lower = query.lower().strip()
    
    cond_code = None
    if condition and condition.upper() in CLINICAL_KNOWLEDGE:
        cond_code = condition.upper()
    else:
        for code, data in CLINICAL_KNOWLEDGE.items():
            if code.lower() in query_lower or data["name"].lower() in query_lower:
                cond_code = code
                break

    if cond_code:
        data = CLINICAL_KNOWLEDGE[cond_code]
        return {
            "type": "condition",
            "code": cond_code,
            "name": data["name"],
            "category": data["category"],
            "hallmarks": data["dermoscopy_hallmarks"],
            "differentials": data["differential_diagnoses"],
            "biopsy": data["biopsy_recommendation"],
            "citation": data["guideline_citation"],
            "clinical_pearl": data["clinical_pearl"],
            "summary": (
                f"**{data['name']}** ({data['category']}):\n"
                f"• Dermoscopy: {'; '.join(data['dermoscopy_hallmarks'][:2])}\n"
                f"• Biopsy: {data['biopsy_recommendation']}\n"
                f"• Clinical Pearl: {data['clinical_pearl']}"
            ),
        }

    for topic_key, content in GENERAL_TOPICS.items():
        if topic_key in query_lower or any(word in query_lower for word in topic_key.split("_")):
            return {
                "type": "topic",
                "topic": topic_key,
                "content": content,
                "summary": content,
            }

    return {
        "type": "general",
        "summary": (
            "Dermatology Clinical Guidance: Clinical screening aids use dermoscopy ABCDE "
            "criteria (Asymmetry, Border, Color, Diameter, Evolution) combined with CNN "
            "deep-learning feature recognition. Always consult a board-certified dermatologist "
            "for definitive diagnosis and biopsy."
        ),
    }


def parse_symptoms(text: str) -> Dict[str, Any]:
    lower = text.lower()
    flags: List[str] = []
    score = 0

    if re.search(r"\b(bleed|bleeding|blood|ooz|crust)\b", lower):
        flags.append("Bleeding or oozing (high clinical red flag)")
        score += 35

    if re.search(r"\b(grow|grew|growing|enlarg|bigger|spread|evolv)\b", lower):
        flags.append("Recent growth / size change")
        score += 25

    if re.search(r"\b(itch|itching|itchy|prurit)\b", lower):
        flags.append("Pruritus / active itching")
        score += 15

    if re.search(r"\b(pain|painful|hurt|tender|sore)\b", lower):
        flags.append("Pain or localized tenderness")
        score += 15

    if re.search(r"\b(dark|black|color chang|multicolor)\b", lower):
        flags.append("Pigment change or dark coloration")
        score += 20

    if re.search(r"\b(scab|ulcer|peel|rough|scaly)\b", lower):
        flags.append("Surface ulceration, scaling or crusting")
        score += 15

    score = min(score, 100)
    urgency_boost = "urgent" if score >= 40 else "soon" if score >= 20 else "routine"

    return {
        "symptoms_detected": flags,
        "symptom_red_flag_score": score,
        "urgency_boost": urgency_boost,
        "summary": (
            f"Detected {len(flags)} clinical symptom flag(s) (Red-flag score: {score}/100): "
            f"{', '.join(flags)}." if flags else "No acute red-flag symptoms reported in text."
        ),
    }


def build_doctor_questions(condition_code: str, urgency: str, symptoms: List[str]) -> List[str]:
    code = condition_code.upper()
    questions: List[str] = [
        "What specific dermatoscopic features are visible on this lesion?",
    ]

    if code in ("MEL", "BCC", "SCC") or urgency in ("urgent", "soon"):
        questions.append("Do you recommend a biopsy (e.g. excisional or punch) to rule out malignancy?")
        questions.append("Should we perform digital mole mapping to track my other spots?")
    else:
        questions.append("Is this lesion completely benign, or should I monitor it for changes over the next 3–6 months?")

    if "Bleeding or oozing (high clinical red flag)" in symptoms or "Recent growth / size change" in symptoms:
        questions.append("Does the recent bleeding or size change warrant urgent histopathological evaluation?")

    questions.append("Given my skin phototype and history, what routine skin check interval do you suggest for me?")
    return questions
