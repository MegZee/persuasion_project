"""
Task 1: Multi-Label Persuasion Detection on SemEval-2023 Task 3
================================================================
Trains PPAsy-XLNet (XLNet-base + asymmetric BCE loss) for multi-label
persuasion technique classification on the SemEval-2023 Subtask 3 dataset.

Usage:
    python scripts/task1_train.py                         # defaults
    python scripts/task1_train.py --epochs 10 --beta 0.7  # override
"""

import os, sys, argparse
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import backend as K
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Dropout, Lambda
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import accuracy_score, f1_score
from transformers import XLNetTokenizer, TFXLNetModel

# ── Project paths (relative to repo root) ──────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "semeval")

# ── Asymmetric BCE loss ────────────────────────────────────────────────────
def asymmetric_binary_crossentropy(beta):
    """Weights positive samples by beta and negatives by (1-beta)."""
    def loss(y_true, y_pred):
        y_true = K.cast(y_true, "float32")
        y_pred = K.cast(y_pred, "float32")
        bce = K.binary_crossentropy(y_true, y_pred)
        w = y_true * beta + (1 - y_true) * (1 - beta)
        return K.mean(w * bce)
    return loss

# ── Evaluation helper ──────────────────────────────────────────────────────
def calculate_scores(y_true, y_pred, threshold=0.5):
    y_pred_bool = (y_pred > threshold).astype(int)
    return {
        "accuracy":  accuracy_score(y_true, y_pred_bool),
        "f1_micro":  f1_score(y_true, y_pred_bool, average="micro"),
        "f1_macro":  f1_score(y_true, y_pred_bool, average="macro"),
    }

# ── Main ───────────────────────────────────────────────────────────────────
def main(args):
    print(f"[Task 1] Loading data from {DATA_DIR}")

    # Load cleaned CSVs
    train_df = pd.read_csv(os.path.join(DATA_DIR, "fr_cleaned_train.csv"), index_col=0)
    dev_df   = pd.read_csv(os.path.join(DATA_DIR, "spacy_cleaned_dev.csv"), index_col=0)
    test_df  = pd.read_csv(os.path.join(DATA_DIR, "spacy_cleaned_test.csv"), index_col=0)

    train_df = train_df.sample(frac=1, random_state=42).reset_index(drop=True)
    dev_df   = dev_df.sample(frac=1, random_state=42).reset_index(drop=True)
    test_df  = test_df.sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"  Train: {len(train_df)} | Dev: {len(dev_df)} | Test: {len(test_df)}")

    # ── Preprocessing ──────────────────────────────────────────────────────
    max_len = args.max_len

    # Keras tokenizer (for sequence padding)
    tok = Tokenizer(num_words=10000)
    tok.fit_on_texts(train_df["text"])

    # Multi-label binarisation
    mlb = MultiLabelBinarizer()
    train_labels = mlb.fit_transform([set(l.split(",")) for l in train_df["labels"]])
    dev_labels   = mlb.transform([set(l.split(",")) for l in dev_df["labels"]])
    num_classes  = len(mlb.classes_)
    print(f"  Classes: {num_classes}")

    # ── XLNet tokenisation ─────────────────────────────────────────────────
    xlnet_tokenizer = XLNetTokenizer.from_pretrained("xlnet-base-cased")

    train_enc = xlnet_tokenizer(train_df["text"].tolist(), padding="max_length",
                                truncation=True, max_length=max_len, return_tensors="tf")
    dev_enc   = xlnet_tokenizer(dev_df["text"].tolist(), padding="max_length",
                                truncation=True, max_length=max_len, return_tensors="tf")

    # ── Model architecture ─────────────────────────────────────────────────
    print("[Task 1] Building PPAsy-XLNet model …")
    input_ids = Input(shape=(max_len,), dtype="int32", name="xlnet_input")
    xlnet_model = TFXLNetModel.from_pretrained("xlnet-base-cased")
    xlnet_out   = xlnet_model(input_ids)[0]
    pooled      = Lambda(lambda x: tf.reduce_mean(x, axis=1))(xlnet_out)
    x           = Dropout(0.1)(pooled)
    output      = Dense(num_classes, activation="sigmoid")(x)

    model = Model(inputs=input_ids, outputs=output)
    model.compile(optimizer=Adam(learning_rate=1e-4),
                  loss=asymmetric_binary_crossentropy(args.beta),
                  metrics=["accuracy"])
    model.summary()

    # ── Training ───────────────────────────────────────────────────────────
    print(f"[Task 1] Training for {args.epochs} epochs (beta={args.beta}) …")
    model.fit(train_enc["input_ids"], train_labels,
              validation_data=(dev_enc["input_ids"], dev_labels),
              epochs=args.epochs, verbose=1)

    # ── Evaluation ─────────────────────────────────────────────────────────
    dev_pred = model.predict(dev_enc["input_ids"])
    print("\n[Task 1] Dev-set results at default threshold 0.5:")
    for k, v in calculate_scores(dev_labels, dev_pred, 0.5).items():
        print(f"  {k}: {v:.4f}")

    # Threshold sweep
    print("\n[Task 1] Threshold calibration sweep:")
    for t in np.arange(0.25, 0.80, 0.05):
        s = calculate_scores(dev_labels, dev_pred, t)
        print(f"  t={t:.2f}  F1-micro={s['f1_micro']:.4f}  F1-macro={s['f1_macro']:.4f}")

    # ── Test predictions ───────────────────────────────────────────────────
    test_df = test_df.reset_index(drop=False)
    test_enc = xlnet_tokenizer(test_df["text"].tolist(), padding="max_length",
                               truncation=True, max_length=max_len, return_tensors="tf")
    test_pred = model.predict(test_enc["input_ids"])
    test_pred_bool = (test_pred >= 0.5).astype(int)
    test_pred_labels = mlb.inverse_transform(test_pred_bool)
    test_pred_str = [",".join(labels) if labels else "" for labels in test_pred_labels]

    out_df = pd.DataFrame({"id": test_df["id"], "line": test_df["line"], "labels": test_pred_str})
    out_path = os.path.join(PROJECT_ROOT, "outputs", "task1_predictions.tsv")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out_df.to_csv(out_path, sep="\t", header=False, index=False)
    print(f"\n[Task 1] Predictions saved to {out_path}")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Task 1: SemEval Persuasion Detection")
    p.add_argument("--epochs",  type=int,   default=5,   help="Training epochs")
    p.add_argument("--beta",    type=float, default=0.7, help="Asymmetric BCE beta")
    p.add_argument("--max-len", type=int,   default=128, help="Max sequence length")
    main(p.parse_args())
