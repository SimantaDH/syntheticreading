# Synthetic Reading of Ruskin Bond's "The Eyes Have It"
### Sight, blindness and the conversation of concealment

This repository presents a hermeneutic-computational reading of Ruskin Bond's short story "The Eyes Have It". It follows the **synthetic reading** method of Ghosh, Shanmugapriya T and Mandal (2026), in which interpretation comes *before* computation: a partial reading produces an impression, the impression becomes a prompt, a local language model extracts phrases that are verified against the text, and the researcher counts, visualises and interprets them.

**Project website:** https://simantadh.github.io/syntheticreading/
**Repository:** https://github.com/SimantaDH/syntheticreading

**Researcher:** Simanta Nandi, MA, Digital Humanities and Social Sciences, Indian Institute of Technology (ISM) Dhanbad
**Project supervision:** [Shanmugapriya T](https://shanmugapriya.com/) and [Sourav Ghosh](https://linktr.ee/sourav.dh.litcult)
**Contact:** [25ma0013@iitism.ac.in](mailto:25ma0013@iitism.ac.in), [about.me/simantanandi](https://about.me/simantanandi)
**Licence:** [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) (see `LICENSE.md`)

## Research questions

1. What is the metaphor of sight and blindness across the full story?
2. How do linguistic markers of evasion, assumption and conversational turn-taking reveal the underlying information asymmetry and mutual deception between the narrator and the girl?

**Claims stated before the full reading** (each tested by a written rule in Step 7.2 of the notebook):
- **C1.** Imagined sight is concentrated in the middle of the story, where the narrator performs being sighted.
- **C2.** The language of pretence and concealment runs through the conversation with the girl, while the language of revelation is concentrated at the end.
- **C3.** Markers of evasion and assumption appear in the girl's speech as well as in the narrator's words, so the deception is mutual in the language and not only in the plot.
- **C4.** Turn-taking is densest while the narrator and the girl are talking, and becomes sparser after she leaves.

**Dimensions:** sight and blindness (literal sight, imagined sight, substitute senses); performance and concealment (pretence, concealment, revelation); evasion and assumption (evasion, assumption, face-work); conversational turn-taking (questions, turn markers, silence and closure).

The results, the verdicts on the claims and the interpretation essay are on the website and in `report.html`.

## Copyright

"The Eyes Have It" is © Ruskin Bond. It was first collected in *The Night Train at Deoli and Other Stories* (Penguin Books, 1988), and it is in copyright. **This repository does not redistribute the story.** The full text, the sentences of the partial reading and the passages sent to the model are kept in the researcher's private copy. Short quotations appear in the analysis for the purposes of criticism and review.

## Repository contents

All files are in one level, so that GitHub Pages can publish the website from the top of the repository.

| File | Step | What it is |
|---|---|---|
| `Synthetic_Reading_The_Eyes_Have_It.ipynb` | all | The Google Colab notebook that ran every step (outputs that print story sentences removed) |
| `partial_reading_index.json` | 1 | The partial-reading design and the sentence numbers read |
| `initial_impression.md` | 2 | Impression, positionality, research questions, claims and dimensions |
| `prompt.txt` | 4 | The prompt sent to the model, with `{{PASSAGE}}` where each chunk of the story went |
| `llm_output.json`, `llm_run_log.json` | 5 | The model's merged answer, and each chunk's answer with the model, settings and date |
| `raw_llm_output.json`, `verified_items.json`, `extraction_README.md` | 5 | Verification: what was kept, what was removed and why |
| `Theme_JSON.py` | 5 | The verified lexicon, by dimension and sub-type |
| `matches.csv`, `segment_counts.json` | 6 | Every counted occurrence with its sentence, scene, stage and voice |
| `claim_tests.csv` | 7 | The four claims, their verdicts and the evidence |
| `fig1_heatmap` … `fig6_voices` (`.jpg`, `.html`) | 6 | The six figures, as JPG images and interactive pages |
| `interpretation.md` | 7 | The interpretation essay |
| `report.html`, `visualisations.html` | 7 | Self-contained report pages |
| `index.html`, `style.css`, `site.js`, `site_data.json`, `simanta-nandi.jpg`, `.nojekyll` | site | The project website; `site_data.json` holds every number it shows |
| `LICENSE.md` | — | CC BY-NC 4.0 licence and its exclusions |

## Reproduce

Open `Synthetic_Reading_The_Eyes_Have_It.ipynb` in Google Colab, choose **Runtime → Change runtime type → T4 GPU**, and run all cells. When asked, upload the cleaned corpus (SHA-256 `375813bd45f1877460407da395735933da48d6bf42e8da9d53a1c6929abbceb4`). The notebook installs Ollama, runs the model on three chunks of the story, verifies every phrase, counts, tests the claims, draws the figures, writes the essay and prepares every file for this repository in `github_upload.zip`. Uploading those files updates the website: its code reads `site_data.json` and `interpretation.md`.

## How to cite

The website's **Cite this project** section gives the reference in MLA, APA, Chicago, Harvard, IEEE and BibTeX, with the date of access filled in. In APA 7:

Nandi, S. (2026). *Synthetic reading of Ruskin Bond’s “The eyes have it”: Sight, blindness and the conversation of concealment* [Digital humanities project]. Indian Institute of Technology (ISM) Dhanbad. https://simantadh.github.io/syntheticreading/

## Licence

© 2026 Simanta Nandi. Except where otherwise noted, this project is licensed under a [Creative Commons Attribution-NonCommercial 4.0 International Licence](https://creativecommons.org/licenses/by-nc/4.0/). "The Eyes Have It" © Ruskin Bond is not covered by this licence and is not reproduced here. See `LICENSE.md`.

## AI use statement

The extraction in Step 5 was carried out by an open-weight model run locally with Ollama, as the synthetic reading method prescribes, and every phrase was verified against the text. [TO CONFIRM: state here any other use of AI tools in this project, for example in writing code or drafting text, as your institute requires.] The research design, the annotations and the interpretation are the researcher's responsibility.

## Sources

- Ruskin Bond, "The Eyes Have It", in *The Night Train at Deoli and Other Stories* (Penguin Books, 1988). Web transcription used for the corpus: https://gauravsk98.wordpress.com/2018/02/14/the-eyes-have-it-by-ruskin-bond/
- S. Ghosh, Shanmugapriya T and S. Mandal, "Synthetic reading: Towards a hermeneutic-computational method for literary interpretation through Tagore's 'A Wife's Letter'", *International Journal of Humanities and Arts Computing* 20.2 (2026): 216–237. DOI: 10.3366/ijhac.2026.0378.
