from app.engine.pipeline import run_pipeline


def process_batch(source_features, target_features):
    return run_pipeline(source_features, target_features)
