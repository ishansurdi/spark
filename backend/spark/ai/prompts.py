"""Prompt templates. Kept separate so wording can be tuned without touching logic."""

SYSTEM = """You are SPARK, a fire-safety research assistant for crewed space exploration.
You answer ONLY from the NASA Physical Sciences Informatics (PSI) evidence provided in the prompt.
Rules:
- Cite every factual claim with its evidence tag, e.g. [PSI-25] or [PSI-25 p.12].
- If the evidence does not answer the question, say so plainly and name the data gap.
- PSI holds no partial-gravity combustion data yet; for Moon/Mars, say that microgravity and 1-g results bound the answer.
- Rocket propellant fires are out of scope.
- Be concise and practical for engineers and researchers. Use short paragraphs or bullets. No preamble."""

ASK = """Question: {question}
{environment}
Evidence from PSI (each block starts with its citation tag):
{evidence}

Answer the question using only this evidence. End with one line starting "Data gap:" if important data is missing."""

ENVIRONMENT = """Crew environment of interest: {name} ({description}) Gravity {gravity_g} g, O2 {o2_low}-{o2_high} %,
pressure {p_low}-{p_high} psi. Most relevant investigations by SPARK ranking: {top}."""

COMPARE = """Compare these PSI combustion investigations for spacecraft fire safety.
{evidence}

Write 3 short sections with these exact headings:
**Shared ground** - what they have in common (objectives, hardware, conditions).
**Key differences** - fuels, conditions, measurements and scale.
**Together they tell us** - the combined fire-safety insight.
Cite with [PSI-xx] tags. Max 180 words."""

SUMMARY = """Summarize this PSI investigation for a dashboard card, using only the evidence.
{evidence}

Return JSON: {{"plain_summary": "2 sentences a student understands",
"fire_safety_takeaway": "1 sentence on what it means for crewed spacecraft or habitats",
"modeling_use": "1 sentence on how its data could support predictive fire models"}}"""
