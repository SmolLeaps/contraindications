# TODO.md — Cross-System Medication Interaction Web App

## Working Title
**Fusion Med Checker**  
A patient-friendly web app for comparing Ayurvedic / TCM / Western medications at the ingredient level.

## Core Problem
Patients are spoilt for choice across Western medicine, Ayurveda, TCM, supplements, and wellness products, but cannot easily compare ingredients or check possible contraindications.

Example case from conversation:
- Product: **Nidramap**
- System: **Ayurvedic sleep formulation**
- Possible ingredients: ashwagandha, brahmi/bacopa, jatamansi, pippali/long pepper, sometimes amalaki
- Concern: daily use alongside Western psychiatric medication
- Specific safety context: lithium, intermittent mirtazapine, sedatives, mood/psychosis history

## Product Goal
Build a static GitHub Pages web app that helps users:

1. Enter medications / supplements / herbal formulas.
2. Break them down into ingredients.
3. Compare possible herb–drug interactions.
4. Display uncertainty clearly.
5. Encourage pharmacist / doctor review instead of pretending to give medical clearance.

## Important Framing
This app must **not** say:
- “Safe”
- “No contraindication”
- “Approved”
- “Guaranteed harmless”

It should say:
- “Known risk”
- “Possible risk”
- “Unclear evidence”
- “Ask clinician/pharmacist”
- “Do not mix casually”

## Key Knowledge Model

### Medication Systems
- Western medicine
- Ayurveda
- TCM
- Supplements / nutraceuticals

### Ingredient Types
- Active pharmaceutical ingredient
- Herbal extract
- Multi-herb formula
- Unknown / unstandardised ingredient

### Interaction Types
1. **Pharmacokinetic**
   - Changes absorption, liver metabolism, kidney clearance, drug levels
   - Example: CYP enzymes, renal clearance, sodium/hydration effects

2. **Pharmacodynamic**
   - Adds to or opposes drug effects
   - Example: sedative herb + sedative medication = increased drowsiness

3. **Condition-specific caution**
   - Mood disorder history
   - Liver disease
   - Kidney disease
   - Pregnancy
   - Surgery
   - Blood pressure issues

4. **Evidence uncertainty**
   - Product quality varies
   - Extract strength varies
   - Contamination / hidden pharmaceutical risk
   - Sparse human data

## Example Ingredient Record: Ashwagandha

### Known / Possible Effects
- Stress / sleep support claims
- Sedation / drowsiness
- GI upset: diarrhoea, vomiting, stomach upset
- Rare liver injury reports
- Possible thyroid effects
- Possible neuropsychiatric concerns in sensitive users

### Possible Interaction Flags
- Sedatives
- Antidepressants / sleep aids
- Anticonvulsants
- Thyroid medication
- Blood pressure medication
- Diabetes medication
- Immunosuppressants

### User-facing Warning
“Ashwagandha is biologically active. It is not a classic psychedelic, but it may affect sleep, sedation, thyroid function, liver safety, and possibly mood stability. Daily use should be checked with a clinician if you take psychiatric medication or lithium.”

## Example Product Record: Nidramap

### Category
Ayurvedic sleep formulation

### Possible Ingredients
- Ashwagandha
- Brahmi / Bacopa
- Jatamansi
- Pippali / Long pepper
- Amalaki, depending on formulation

### Risk Summary
- Multi-herb sleep product
- May cause additive sedation
- Evidence varies by formulation
- Daily use has higher uncertainty than occasional use
- Should not be treated as harmless just because it is herbal

### Specific Caution
If user takes:
- Lithium
- Mirtazapine
- Lorazepam
- Zolpidem
- Other sedatives

Then app should show:
“Do not mix casually. Ask psychiatrist/pharmacist.”

## MVP Features

### 1. Landing Page
Explain the problem:
“Different medical systems describe medicines differently. This app helps compare them at ingredient level, while clearly showing uncertainty.”

### 2. Medication Input
User can enter:
- Product name
- Medication name
- Ingredient list
- Current prescriptions
- Health context / caution flags

### 3. Ingredient Parser
For MVP, use manual entry.
Future version can support:
- OCR from product label
- Public ingredient database lookup
- Synonym mapping, e.g. ashwagandha = Withania somnifera

### 4. Interaction Checker
Static rule-based checker.

Example rules:
- If ingredient = ashwagandha AND medication category = sedative → additive sedation warning
- If user medication = lithium AND ingredient/product may affect diarrhoea/vomiting/hydration/kidney → lithium caution
- If user has bipolar/psychosis history AND ingredient has neuropsychiatric uncertainty → mood stability caution

### 5. Risk Output
Use four levels:

- **Known Risk**
- **Possible Risk**
- **Unclear / Insufficient Evidence**
- **No obvious known issue, but not clearance**

### 6. Evidence Panel
Each warning should show:
- Why this matters
- What is known
- What is uncertain
- What to ask a pharmacist/doctor

### 7. Clinician Message Generator
Generate copyable text:

“Hi, I’m considering taking [product] daily. It contains [ingredients]. I currently take [medications]. Could you check for interactions, especially sedation, liver/kidney concerns, lithium-related issues, and mood destabilisation risk?”

## GitHub Pages Architecture

### Stack
- HTML
- CSS
- Vanilla JavaScript
- Static JSON knowledge base
- No backend required

### Folder Structure
```txt
/
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── ingredients.json
│   ├── medications.json
│   ├── products.json
│   └── interaction_rules.json
└── README.md
```

## Data Schema Draft

### ingredients.json
```json
[
  {
    "id": "ashwagandha",
    "names": ["Ashwagandha", "Withania somnifera"],
    "system": "Ayurveda",
    "effects": ["sedation", "stress", "sleep", "thyroid_possible"],
    "cautions": ["liver", "sedatives", "thyroid", "mood_history"],
    "evidence_level": "mixed"
  }
]
```

### products.json
```json
[
  {
    "id": "nidramap",
    "name": "Nidramap",
    "system": "Ayurveda",
    "category": "sleep formulation",
    "ingredients": ["ashwagandha", "bacopa", "jatamansi", "pippali"],
    "notes": "Exact formulation may vary by product listing."
  }
]
```

### interaction_rules.json
```json
[
  {
    "id": "ashwagandha_sedatives",
    "if": {
      "ingredient": "ashwagandha",
      "medication_category": "sedative"
    },
    "risk_level": "Possible Risk",
    "message": "Ashwagandha may add to sedative effects. Avoid casual mixing with sleep aids or sedatives."
  },
  {
    "id": "lithium_hydration_kidney",
    "if": {
      "medication": "lithium",
      "effect_any": ["diarrhoea", "vomiting", "dehydration", "kidney"]
    },
    "risk_level": "Known / Possible Risk",
    "message": "Lithium levels can be affected by hydration, sodium balance, kidney function, diarrhoea, or vomiting. Check with clinician."
  }
]
```

## UI Flow

1. User selects or enters current Western meds.
2. User enters herbal product / ingredients.
3. User optionally adds health context:
   - mood disorder history
   - kidney issues
   - liver issues
   - pregnancy
   - surgery
   - blood thinner use
4. App generates:
   - ingredient breakdown
   - warning cards
   - uncertainty label
   - clinician question template

## Safety Copy

Display prominently:

“This app is not medical advice. It helps organise possible interaction questions. It cannot prove safety, especially for multi-herb formulas or psychiatric medication combinations.”

## Design Principles

- Ingredient-level comparison
- No false reassurance
- Show uncertainty as useful information
- Prefer clinician escalation when risk is unclear
- Use simple language
- Assume patients are overwhelmed
- Avoid anti-Ayurveda / anti-TCM framing
- Avoid pro-natural bias

## Future Features

- OCR label scan
- Barcode lookup
- PubMed / NCCIH evidence links
- Region-specific product database
- Personal medication profile
- Export PDF for doctor/pharmacist
- Risk graph visualisation
- Contraindication timeline for daily use
- “Ask your doctor” message generator

## Immediate Build TODO

- [x] Create static GitHub Pages repo
- [x] Add `index.html`
- [x] Add `styles.css`
- [x] Add `app.js`
- [x] Add `/data` folder
- [x] Seed `ingredients.json` with ashwagandha, bacopa, jatamansi, pippali
- [x] Seed `products.json` with Nidramap
- [x] Seed `medications.json` with lithium, mirtazapine, lorazepam, zolpidem
- [x] Seed `interaction_rules.json`
- [x] Build simple form UI
- [x] Build rule matcher
- [x] Render risk cards
- [x] Add clinician message generator
- [x] Add disclaimer
- [ ] Deploy via GitHub Pages

## MVP Success Criteria

- User can enter “Nidramap”
- App shows its likely herbal ingredients
- User can add “lithium” and “mirtazapine”
- App flags:
  - additive sedation concern
  - lithium hydration/kidney caution
  - mood history caution
  - formulation uncertainty
- App avoids saying “safe”
- App generates a concise pharmacist/psychiatrist question
