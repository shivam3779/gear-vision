import os
import io
import time
import base64
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory
from ultralytics import YOLO

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'best.pt')

print(f"Loading YOLO model from {MODEL_PATH}...")
model = YOLO(MODEL_PATH)
print("Model loaded successfully. Classes:", model.names)

SAMPLE_IMAGES = [
    "Screenshot 2026-10-09 165719.png",
    "Screenshot 2026-10-09 170041.png",
    "Screenshot 2026-10-09 171232.png",
    "Screenshot 2026-10-09 171643.png"
]

@app.route('/')
def index():
    return render_template('index.html', samples=SAMPLE_IMAGES)

@app.route('/samples/<filename>')
def get_sample(filename):
    return send_from_directory(BASE_DIR, filename)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    start_time = time.time()
    
    # 1. Parse image input (either uploaded file or sample filename)
    img_bytes = None
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            img_bytes = file.read()
    elif request.is_json and 'sample_name' in request.json:
        sample_name = os.path.basename(request.json['sample_name'])
        sample_path = os.path.join(BASE_DIR, sample_name)
        if os.path.exists(sample_path):
            with open(sample_path, 'rb') as f:
                img_bytes = f.read()
    
    if not img_bytes:
        return jsonify({"error": "No valid image provided"}), 400

    # Parse confidence threshold (default: 0.15 matching image_detect.py)
    conf_thresh = 0.15
    if 'confidence' in request.form:
        try:
            conf_thresh = float(request.form['confidence'])
        except ValueError:
            conf_thresh = 0.15
    elif request.is_json and 'confidence' in request.json:
        try:
            conf_thresh = float(request.json['confidence'])
        except (ValueError, TypeError):
            conf_thresh = 0.15

    # Clamp confidence between 0.01 and 0.99
    conf_thresh = max(0.01, min(0.99, conf_thresh))

    # Decode image using OpenCV
    np_arr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({"error": "Failed to decode image"}), 400

    height, width = image.shape[:2]

    # Run inference
    results = model(image, conf=conf_thresh)
    
    defects = []
    class_counts = {name: 0 for name in model.names.values()}

    annotated_img = None
    for r in results:
        boxes = r.boxes
        for idx, box in enumerate(boxes):
            class_id = int(box.cls[0])
            class_name = model.names.get(class_id, f"defect_{class_id}")
            confidence = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
            defects.append({
                "id": idx + 1,
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(confidence * 100, 1),
                "box": [round(coord, 1) for coord in xyxy]
            })
        
        # Plot predictions on image
        annotated_img = r.plot()

    if annotated_img is None:
        annotated_img = image

    # Encode annotated image to JPEG base64
    _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    # Also encode original image for before/after view
    _, orig_buf = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    orig_b64 = "data:image/jpeg;base64," + base64.b64encode(orig_buf).decode('utf-8')

    elapsed_ms = round((time.time() - start_time) * 1000, 1)
    is_defective = len(defects) > 0

    return jsonify({
        "status": "DAMAGED GEAR" if is_defective else "PERFECT GEAR",
        "is_defective": is_defective,
        "total_defects": len(defects),
        "defects": defects,
        "class_counts": class_counts,
        "confidence_used": conf_thresh,
        "dimensions": {"width": width, "height": height},
        "annotated_image": annotated_b64,
        "original_image": orig_b64,
        "inference_ms": elapsed_ms
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Gear Defect Detection Web App starting on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
