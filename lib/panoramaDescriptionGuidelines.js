export const panoramaLanguages = [
  "english",
  "spanish",
  "french",
  "dutch",
  "german",
];

export const panoramaDescriptionPrompt = `
Panorama description writing rules:

You must generate descriptions in 5 languages:
- English
- Spanish
- French
- Dutch
- German

For each language, generate exactly these 4 fields:
1. shortDescription
2. description
3. priceDescription
4. extraDescription

Structure:
{
  "english": {
    "shortDescription": "",
    "description": "",
    "priceDescription": "",
    "extraDescription": ""
  },
  "spanish": {},
  "french": {},
  "dutch": {},
  "german": {}
}

SHORT DESCRIPTION:
- Around 88 characters maximum.
- Sentence case.
- Format: "[Adjective], [adjective] [style] [property type] with [USP] in [Neighbourhood]"
- No price.
- No bedroom count.
- No m².
- Must end with the neighbourhood or area name.

DESCRIPTION:
- Full editorial property description.
- Around 480–500 words in English.
- For other languages, match the same structure and level of detail naturally.
- Five paragraphs.
- Flowing sophisticated prose, never bullets.
- Present tense.
- No price.
- No bedroom count.
- No m² unless exceptional.
- Use aspirational but precise real estate language.
- Use em dashes — not hyphens.
- Avoid generic wording.

Paragraph structure:
P1: Opening hook and main USP.
P2: Architecture, design, materials and arrival experience.
P3: Interior living spaces and spatial walk-through.
P4: Bedrooms, technical features, lifestyle benefits and outdoor spaces.
P5: Closing statement for the right buyer and market positioning.

PRICE DESCRIPTION:
- Only populate if there is a pricing note beyond the base price.
- Examples: furniture package, price reduction, art excluded.
- If there is no pricing note, return an empty string.

EXTRA DESCRIPTION:
- Bullet-point highlights.
- Use Panorama CMS bullet prefix: "** "
- 7–8 bullets maximum.
- Each bullet maximum 100 characters.
- No full stops at the end.
- No price.
- No bedroom count.
- Do not repeat the main USP from the short description in the first 3 bullets.
- Include the wider area/zone early if it is not already in the short description.

BANNED WORDS AND PHRASES IN ALL LANGUAGES:
- ideal
- perfect for
- boasts
- rare opportunity
- must see
- Costa del Sol lifestyle
- year-round living
- could be
- might
- possibly

Preferred English verbs:
- delivers
- showcases
- elevates
- commands
- ensures
- dissolves
- surveys

Do not invent unconfirmed property features.
If information is missing, write naturally around the available confirmed information.
`;
