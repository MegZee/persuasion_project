# Persuasion Detection in Political Ads

Detection and analysis of persuasion techniques in political advertising using transformer-based NLP. The project applies **PPAsy-XLNet** (XLNet-base with asymmetric binary cross-entropy loss) across two complementary tasks.

## 📊 Live Interactive Dashboard

Want to see the results in action? **[View the Live Demo Dashboard here!](https://megzee.github.io/facebook_ads_react/)** 

*Note for Reviewers/Interviewers:* The dashboard is highly interactive! Feel free to tap or click on the different charts, demographic elements, and regions in the dashboard to uncover more detailed information and dynamically explore the Facebook political ads data.

## Tasks

### Task 1 — Multi-Label Persuasion Technique Detection
Trains on **SemEval-2023 Task 3** data to classify 23 persuasion techniques (e.g., Loaded Language, Appeal to Fear, Flag Waving) at the paragraph level. Uses multi-label binarisation with a threshold calibration sweep for optimal F1.

### Task 2 — Domain Adaptation to Australian Facebook Ads
Retrains the model on the **APA22** annotated subset (binary: persuasive vs neutral), then classifies the full Australian political ads corpus at sentence level. Includes analysis of persuasion patterns across demographics, regions, funding entities, spending, and temporal dynamics.

## Project Structure

```
persuasion_project/
├── README.md
├── requirements.txt
├── Task1_Persuasion_Detection.ipynb   # Colab notebook (Task 1)
├── Task2_FB_Ads_Analysis.ipynb        # Colab notebook (Task 2)
├── scripts/
│   ├── task1_train.py                 # Standalone training script (Task 1)
│   ├── task2_train.py                 # Training + analysis script (Task 2)
│   └── predict.py                     # Lightweight inference CLI
├── data/
│   ├── semeval/                        # SemEval-2023 Task 3 dataset
│   │   ├── fr_cleaned_train.csv
│   │   ├── spacy_cleaned_dev.csv
│   │   └── spacy_cleaned_test.csv
│   └── ads/                            # Australian political ads dataset
│       ├── train_set.csv
│       ├── test_set.csv
│       ├── unique_ads_df.csv
│       └── detailed_ads_df.csv
├── models/
│   └── ads_model.h5                    # Saved Task 2 model (~1.4 GB)
└── outputs/
    └── task1_predictions.tsv           # Task 1 test predictions
```

## Setup

### Requirements

- **Python** 3.10+
- **GPU**: NVIDIA A100 40 GB (or equivalent with ≥16 GB VRAM)
- **RAM**: 80 GB recommended (Colab High-RAM runtime)
- **CUDA**: 12.x

### Install

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

> **Keras 3 compatibility note:** TensorFlow ≥ 2.16 ships with Keras 3, which is incompatible with HuggingFace TF models. The fix is already handled by `tf-keras` in `requirements.txt`, but you **must** set the environment variable before importing TensorFlow:
>
> ```bash
> export TF_USE_LEGACY_KERAS=1
> ```

## Usage

### Scripts (recommended for reproducibility)

```bash
# Task 1 — Train multi-label model on SemEval data
python scripts/task1_train.py --epochs 5 --beta 0.7

# Task 2 — Train binary model, predict full corpus, run analysis
python scripts/task2_train.py

# Task 2 — Skip training, run analysis only (uses saved model)
python scripts/task2_train.py --skip-training

# Inference — Classify a single text
python scripts/predict.py --text "Vote for change now!"

# Inference — Batch classify from file
python scripts/predict.py --input texts.txt --output predictions.csv

# Inference — Use Task 1 multi-label model
python scripts/predict.py --task 1 --text "This is propaganda"
```

### Notebooks (Google Colab)

1. Upload the project folder to Google Drive
2. Open `Task1_Persuasion_Detection.ipynb` or `Task2_FB_Ads_Analysis.ipynb` in Colab
3. Set runtime to **GPU (A100)** with **High-RAM**
4. Run the install cell, then **restart the runtime**
5. Run all remaining cells

## Model Architecture

**PPAsy-XLNet** consists of:

1. **XLNet-base** (110M parameters) as the text encoder
2. **Mean pooling** over hidden states (attention-mask-aware)
3. **Dropout** (p = 0.1)
4. **Dense output** with sigmoid activation
5. **Asymmetric BCE loss** (β = 0.7) to handle class imbalance — positive samples are weighted by β and negatives by (1 − β)

Task 1 uses a multi-label output (23 units), Task 2 uses a single binary output.

## Key Results

- **Task 1**: Multi-label F1-micro and F1-macro reported across threshold sweep (0.25–0.75)
- **Task 2**: 5-fold stratified cross-validation on APA22; best fold accuracy reported on held-out test set; full corpus analysis covers persuasion ratio distributions, spending correlations, and temporal patterns
