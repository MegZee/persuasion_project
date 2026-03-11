"""
Lightweight Inference Script — Persuasion Detection
====================================================
Loads the fine-tuned PPAsy-XLNet model and classifies input text at
sentence level (Task 2 binary model) or paragraph level (Task 1 multi-label).

Usage:
    # Single text via CLI
    python scripts/predict.py --text "Vote for change now!"

    # File input (one text per line)
    python scripts/predict.py --input texts.txt --output predictions.csv

    # Choose task (default: task2 binary)
    python scripts/predict.py --task 1 --text "This is propaganda"
"""

import os, sys, argparse, json
import numpy as np
import tensorflow as tf
from tensorflow.keras import backend as K
from tensorflow.keras.layers import Layer
from tensorflow.keras.models import load_model
from transformers import TFXLNetModel, XLNetTokenizer

# ── Project paths ─────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR    = os.path.join(PROJECT_ROOT, "models")

MAX_LEN = 128
BETA    = 0.7

# ── Task 1 label set (SemEval-2023 Task 3 persuasion techniques) ─────────
TASK1_LABELS = [
    "Appeal_to_Authority", "Appeal_to_Fear-Prejudice",
    "Appeal_to_Hypocrisy", "Appeal_to_Popularity",
    "Appeal_to_Time", "Appeal_to_Values",
    "Causal_Oversimplification", "Consequential_Oversimplification",
    "Conversation_Killer", "Doubt", "Exaggeration-Minimisation",
    "False_Dilemma-No_Choice", "Flag_Waving", "Guilt_by_Association",
    "Loaded_Language", "Name_Calling-Labeling",
    "Obfuscation-Vagueness-Confusion", "Questioning_the_Reputation",
    "Red_Herring", "Repetition", "Slogans",
    "Straw_Man", "Whataboutism",
]

# ── Asymmetric BCE (needed for model loading) ────────────────────────────
def asymmetric_binary_crossentropy(beta):
    def loss(y_true, y_pred):
        y_true = K.cast(y_true, "float32")
        y_pred = K.cast(y_pred, "float32")
        bce = K.binary_crossentropy(y_true, y_pred)
        w = y_true * beta + (1 - y_true) * (1 - beta)
        return K.mean(w * bce)
    return loss

# ── Custom pooling layer (needed for Task 2 model loading) ───────────────
class MeanPooling(Layer):
    """Attention-mask-aware mean pooling over transformer hidden states."""
    def call(self, inputs):
        hidden, mask = inputs
        mask_f = tf.expand_dims(tf.cast(mask, tf.float32), -1)
        return tf.reduce_sum(hidden * mask_f, axis=1) / tf.maximum(
            tf.reduce_sum(mask_f, axis=1), 1e-9
        )

# ── Load model ───────────────────────────────────────────────────────────
def load_task_model(task: int):
    """Load the saved .h5 model for the given task."""
    if task == 2:
        path = os.path.join(MODEL_DIR, "ads_model.h5")
    else:
        path = os.path.join(MODEL_DIR, "task1_model.h5")

    if not os.path.exists(path):
        sys.exit(f"[predict] Model not found: {path}\n"
                 f"  Run scripts/task{task}_train.py first.")

    print(f"[predict] Loading model from {path} …")
    model = load_model(path, custom_objects={
        "TFXLNetModel": TFXLNetModel,
        "MeanPooling": MeanPooling,
        "loss": asymmetric_binary_crossentropy(BETA),
    })
    return model

# ── Prediction helpers ───────────────────────────────────────────────────
def predict_task2(texts, model, tokenizer):
    """Binary persuasion classification (Task 2)."""
    enc = tokenizer(texts, max_length=MAX_LEN, truncation=True,
                    padding="max_length", return_tensors="tf")
    scores = model.predict([enc["input_ids"], enc["attention_mask"]], verbose=0)[:, 0]
    labels = ["persuasive" if s > 0.5 else "neutral" for s in scores]
    return labels, scores.tolist()

def predict_task1(texts, model, tokenizer, threshold=0.5):
    """Multi-label persuasion technique detection (Task 1)."""
    enc = tokenizer(texts, max_length=MAX_LEN, truncation=True,
                    padding="max_length", return_tensors="tf")
    probs = model.predict(enc["input_ids"], verbose=0)
    results = []
    for row in probs:
        techniques = [TASK1_LABELS[i] for i, p in enumerate(row) if p > threshold]
        results.append(techniques if techniques else ["none"])
    return results, probs.tolist()

# ── CLI ──────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Persuasion Detection — Inference")
    parser.add_argument("--task", type=int, default=2, choices=[1, 2],
                        help="Task number: 1 = multi-label techniques, 2 = binary persuasive/neutral")
    parser.add_argument("--text", type=str, default=None,
                        help="Single text to classify")
    parser.add_argument("--input", type=str, default=None,
                        help="Path to input file (one text per line)")
    parser.add_argument("--output", type=str, default=None,
                        help="Path to save predictions CSV")
    parser.add_argument("--threshold", type=float, default=0.5,
                        help="Classification threshold (default 0.5)")
    args = parser.parse_args()

    if args.text is None and args.input is None:
        parser.error("Provide either --text or --input")

    # Load model & tokenizer
    model = load_task_model(args.task)
    tokenizer = XLNetTokenizer.from_pretrained("xlnet-base-cased")

    # Gather texts
    if args.text:
        texts = [args.text]
    else:
        with open(args.input) as f:
            texts = [line.strip() for line in f if line.strip()]

    print(f"[predict] Classifying {len(texts)} text(s) with Task {args.task} model …\n")

    # Run inference
    if args.task == 2:
        labels, scores = predict_task2(texts, model, tokenizer)
        for txt, lbl, sc in zip(texts, labels, scores):
            print(f"  [{lbl:>10}]  (score={sc:.3f})  {txt[:80]}")
    else:
        results, probs = predict_task1(texts, model, tokenizer, args.threshold)
        for txt, techniques in zip(texts, results):
            print(f"  {', '.join(techniques):50s}  {txt[:60]}")

    # Save to file
    if args.output:
        import pandas as pd
        if args.task == 2:
            df = pd.DataFrame({"text": texts, "label": labels, "score": scores})
        else:
            df = pd.DataFrame({"text": texts, "techniques": [",".join(t) for t in results]})
        df.to_csv(args.output, index=False)
        print(f"\n[predict] Saved to {args.output}")


if __name__ == "__main__":
    main()
