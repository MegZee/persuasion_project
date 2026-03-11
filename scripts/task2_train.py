"""
Task 2: Domain Adaptation & Analysis — Australian Facebook Political Ads
=========================================================================
Retrains PPAsy-XLNet on the APA22 annotated subset (binary: persuasive/neutral),
classifies the full ads corpus at sentence level, and runs persuasion-pattern
analysis (demographics, regions, spending, temporal dynamics).

Usage:
    python scripts/task2_train.py
    python scripts/task2_train.py --skip-training   # analysis only (loads saved model)
"""

import os, sys, argparse, json, re, ast

# ── Keras 3 compatibility (must be set before importing TensorFlow) ───────
os.environ['TF_USE_LEGACY_KERAS'] = '1'

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import backend as K
from tensorflow.keras.layers import Input, Dense, Dropout, Layer
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, classification_report
from transformers import TFXLNetModel, XLNetTokenizer
import transformers.modeling_tf_utils as modeling_tf_utils
from tqdm.auto import tqdm

# ── Patch backend helpers for transformers + newer Keras builds ───────────
def _compat_int_shape(x):
    return tuple(x.shape.as_list()) if hasattr(x.shape, "as_list") else tuple(x.shape)

def _compat_batch_set_value(weight_value_tuples):
    for variable, value in weight_value_tuples:
        variable.assign(value)

if not hasattr(modeling_tf_utils.K, "int_shape"):
    modeling_tf_utils.K.int_shape = _compat_int_shape

if not hasattr(modeling_tf_utils.K, "batch_set_value"):
    modeling_tf_utils.K.batch_set_value = _compat_batch_set_value

# ── Project paths ──────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(PROJECT_ROOT, "data", "ads")
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "ads_model.h5")

MAX_LEN = 128
BETA    = 0.7

# ── Asymmetric BCE loss ────────────────────────────────────────────────────
def asymmetric_binary_crossentropy(beta):
    def loss(y_true, y_pred):
        y_true = K.cast(y_true, "float32")
        y_pred = K.cast(y_pred, "float32")
        bce = K.binary_crossentropy(y_true, y_pred)
        w = y_true * beta + (1 - y_true) * (1 - beta)
        return K.mean(w * bce)
    return loss

# ── Custom pooling layer ──────────────────────────────────────────────────
class MeanPooling(Layer):
    """Attention-mask-aware mean pooling over transformer hidden states."""
    def __init__(self, **kwargs):
        super(MeanPooling, self).__init__(**kwargs)

    def call(self, inputs):
        hidden, mask = inputs
        mask_f = tf.expand_dims(tf.cast(mask, tf.float32), -1)
        return tf.reduce_sum(hidden * mask_f, axis=1) / tf.maximum(tf.reduce_sum(mask_f, axis=1), 1e-9)

# ── Tokenisation helper ───────────────────────────────────────────────────
def tokenize_and_pad(texts, tokenizer, max_len=MAX_LEN):
    ids, masks = [], []
    for t in texts:
        enc = tokenizer.encode_plus(t, add_special_tokens=True, max_length=max_len,
                                     padding="max_length", truncation=True,
                                     return_attention_mask=True, return_tensors="tf")
        ids.append(enc["input_ids"][0])
        masks.append(enc["attention_mask"][0])
    return np.array(ids), np.array(masks)

# ── Build model ───────────────────────────────────────────────────────────
def build_model():
    input_ids  = Input(shape=(MAX_LEN,), dtype=tf.int32, name="input_ids")
    attn_masks = Input(shape=(MAX_LEN,), dtype=tf.int32, name="attention_masks")

    xlnet = TFXLNetModel.from_pretrained("xlnet-base-cased")
    hidden = xlnet(input_ids=input_ids, attention_mask=attn_masks).last_hidden_state
    pooled = MeanPooling()([hidden, attn_masks])
    x      = Dropout(0.1)(pooled)
    out    = Dense(1, activation="sigmoid")(x)

    model = Model(inputs=[input_ids, attn_masks], outputs=out)
    model.compile(optimizer=Adam(learning_rate=1e-4),
                  loss=asymmetric_binary_crossentropy(BETA),
                  metrics=["accuracy"])
    return model

# ── Sentence classifier ──────────────────────────────────────────────────
def classify_sentences(sentences, model, tokenizer, batch_size=8):
    classifications, scores, lengths = [], [], [len(s.split()) for s in sentences]
    for i in range(0, len(sentences), batch_size):
        batch = sentences[i:i + batch_size]
        tok = tokenizer.batch_encode_plus(batch, max_length=MAX_LEN, truncation=True,
                                           padding="max_length", return_tensors="tf")
        batch_scores = model.predict([tok["input_ids"], tok["attention_mask"]], verbose=0)[:, 0]
        classifications.extend(batch_scores > 0.5)
        scores.extend(batch_scores.tolist())
    ratio = float(np.mean(classifications)) if sentences else 0.0
    return classifications, ratio, scores, lengths

# ═══════════════════════════════════════════════════════════════════════════
#  TRAINING
# ═══════════════════════════════════════════════════════════════════════════
def train(args):
    print("[Task 2] Loading APA22 train/test data …")
    train_df = pd.read_csv(os.path.join(DATA_DIR, "train_set.csv"))
    test_df  = pd.read_csv(os.path.join(DATA_DIR, "test_set.csv"))

    tokenizer = XLNetTokenizer.from_pretrained("xlnet-base-cased")

    train_df["label"] = train_df["label"].map({"persuasive": 1, "neutral": 0}).astype(np.float32)
    test_df["label"]  = test_df["label"].map({"persuasive": 1, "neutral": 0}).astype(np.float32)

    train_ids, train_masks = tokenize_and_pad(train_df["sentence"], tokenizer)
    test_ids,  test_masks  = tokenize_and_pad(test_df["sentence"],  tokenizer)
    train_labels = train_df["label"].values
    test_labels  = test_df["label"].values

    print(f"  Train: {len(train_df)} | Test: {len(test_df)}")

    model = build_model()
    model.summary()

    # 5-fold stratified CV
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    best_acc, best_fold = 0, 1

    for fold, (tr_idx, val_idx) in enumerate(skf.split(train_ids, train_labels), 1):
        print(f"\n  Fold {fold}/5")
        ckpt = f"model_fold_{fold}.h5"
        model.fit(
            [train_ids[tr_idx], train_masks[tr_idx]], train_labels[tr_idx],
            validation_data=([train_ids[val_idx], train_masks[val_idx]], train_labels[val_idx]),
            epochs=10, batch_size=32, verbose=1,
            callbacks=[
                EarlyStopping(monitor="val_loss", patience=12, restore_best_weights=True),
                ModelCheckpoint(ckpt, save_weights_only=True, monitor="val_loss",
                                mode="min", save_best_only=True, verbose=1),
            ],
        )
        model.load_weights(ckpt)
        pred = (model.predict([test_ids, test_masks]) > 0.5).astype(int).ravel()
        acc = accuracy_score(test_labels, pred)
        print(f"  Fold {fold} test accuracy: {acc:.4f}")
        if acc > best_acc:
            best_acc, best_fold = acc, fold

    model.load_weights(f"model_fold_{best_fold}.h5")
    print(f"\n[Task 2] Best fold: {best_fold} — accuracy: {best_acc:.4f}")

    pred = (model.predict([test_ids, test_masks]) > 0.5).astype(int).ravel()
    print(classification_report(test_labels, pred, target_names=["neutral", "persuasive"]))

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model.save(MODEL_PATH)
    print(f"[Task 2] Model saved to {MODEL_PATH}")

    # Cleanup fold checkpoints
    for f in range(1, 6):
        p = f"model_fold_{f}.h5"
        if os.path.exists(p):
            os.remove(p)

# ═══════════════════════════════════════════════════════════════════════════
#  SENTENCE-LEVEL PREDICTION ON FULL CORPUS
# ═══════════════════════════════════════════════════════════════════════════
def predict_corpus():
    import spacy
    print("[Task 2] Loading saved model …")
    model = load_model(MODEL_PATH, custom_objects={
        "TFXLNetModel": TFXLNetModel,
        "MeanPooling": MeanPooling,
        "loss": asymmetric_binary_crossentropy(BETA),
    }, compile=False)
    model.compile(optimizer=Adam(learning_rate=1e-4),
                  loss=asymmetric_binary_crossentropy(BETA),
                  metrics=["accuracy"])
    tokenizer = XLNetTokenizer.from_pretrained("xlnet-base-cased")

    print("[Task 2] Loading unique ads …")
    df = pd.read_csv(os.path.join(DATA_DIR, "unique_ads_df.csv"))
    df = df[df["ad_body_language"] == "en"].copy()
    if "sentences" in df.columns:
        df.drop("sentences", axis=1, inplace=True)

    def clean(text):
        text = re.sub(r"http\S+|www\S+|https\S+", "", text)
        text = re.sub(r"\S*@\S*\s?", "", text)
        text = re.sub(r"[\U00010000-\U0010ffff]", "", text)
        return text.replace("\n", " ")

    df["ad_creative_body"] = df["ad_creative_body"].apply(clean)

    nlp = spacy.load("en_core_web_lg")
    df["sentences"] = [
        [s.text.strip() for s in doc.sents]
        for doc in nlp.pipe(df["ad_creative_body"], batch_size=50)
    ]

    print(f"[Task 2] Classifying {len(df)} ads …")
    results = [classify_sentences(sents, model, tokenizer)
               for sents in tqdm(df["sentences"], desc="Classifying")]

    df["sentence_classifications"]    = [r[0] for r in results]
    df["persuasive_ratio"]            = [r[1] for r in results]
    df["sentence_confidence_scores"]  = [r[2] for r in results]
    df["sentence_lengths"]            = [r[3] for r in results]

    out = os.path.join(DATA_DIR, "detailed_ads_df.csv")
    df.to_csv(out, index=False)
    print(f"[Task 2] Saved predictions to {out}")

# ═══════════════════════════════════════════════════════════════════════════
#  ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════
def analyse():
    print("\n[Task 2] ── Analysis ──")
    df = pd.read_csv(os.path.join(DATA_DIR, "detailed_ads_df.csv"))

    high = df[df["persuasive_ratio"] > 0.8]
    low  = df[df["persuasive_ratio"] < 0.2]

    total = len(df)
    print(f"  Total ads: {total}")
    print(f"  High persuasion (>80%): {len(high)} ({len(high)/total*100:.1f}%)")
    print(f"  Low  persuasion (<20%): {len(low)}  ({len(low)/total*100:.1f}%)")

    # Spending / impressions
    for label, subset in [("High", high), ("Low", low)]:
        subset = subset.copy()
        subset["avg_imp"] = (subset["impressions.lower_bound"] + subset["impressions.upper_bound"]) / 2
        subset["avg_spd"] = (subset["spend.lower_bound"] + subset["spend.upper_bound"]) / 2
        print(f"\n  {label} persuasion ads:")
        print(f"    Avg impressions: {subset['avg_imp'].mean():,.0f}")
        print(f"    Avg spending:    ${subset['avg_spd'].mean():,.2f}")

    # Temporal
    df["ad_delivery_start_time"] = pd.to_datetime(df["ad_delivery_start_time"])
    df["ad_delivery_stop_time"]  = pd.to_datetime(df["ad_delivery_stop_time"])
    df["ad_duration"] = (df["ad_delivery_stop_time"] - df["ad_delivery_start_time"]).dt.days

    for label, mask in [("High", df["persuasive_ratio"] > 0.8),
                        ("Low",  df["persuasive_ratio"] < 0.2)]:
        print(f"  Avg campaign duration ({label}): {df.loc[mask, 'ad_duration'].mean():.1f} days")

    # Top funding entities
    for label, subset in [("High", high), ("Low", low)]:
        top = subset["funding_entity"].value_counts().head(5)
        print(f"\n  Top funders — {label} persuasion:")
        for entity, count in top.items():
            print(f"    {entity}: {count}")

    print("\n[Task 2] Analysis complete.")

# ── CLI ────────────────────────────────────────────────────────────────────
def main(args):
    if not args.skip_training:
        train(args)
    if not args.skip_predict:
        predict_corpus()
    analyse()

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Task 2: APA22 Domain Adaptation & Analysis")
    p.add_argument("--skip-training", action="store_true", help="Skip training, use saved model")
    p.add_argument("--skip-predict",  action="store_true", help="Skip corpus prediction, run analysis only")
    main(p.parse_args())
