# GearVision AI

[![Python](https://img.shields.io/badge/Python-3.10%2B-amber?style=for-the-badge&logo=python&logoColor=white)](https://python.org) [![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-red?style=for-the-badge&logo=yolo&logoColor=white)](https://ultralytics.com) ![[Flask](https://img.shields.io/badge/Flask-2.x-emerald?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)

An intelligent, real-time industrial gear defect detection system powered by YOLOv8 and Flask.

---

## Key Features

- **Defect Classes Detected**:
  - `break`: Tooth fractures, root cracks, rim breakage.
  - `lack`: Missing teeth, casting voids, machining underfill.
  - `scratch`: Abrasive wear, scoring, surface grooves.
- **Sensitivity Control**: Adjustable confidence slider (5% – 90%, default 15%).
- **Interactive Theme**: One-click toggle between Industrial Dark Mode and High-Contrast Light Mode (strictly zero blue colors).
- **Comparison Modes**: Analyzed bounding boxes, Side-by-Side split comparison, and Original view.
- **Telemetry & Reporting**: Automated defect count, per-class breakdown, confidence ratings, and pixel coordinates.
- **Export**: One-click download of annotated gear images.

---

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/shivam3779/gear-vision.git
fcd gear-vision

# 2. Install dependencies
pip install flask ultralytics opencv-python numpy

# 3. Start dashboard
python app.py
```

Access at http://127.0.0.1:5000

---

## Model Details

| Parameter | Value |
|---|---|
| Architecture | YOLOv8 (Ultralytics) |
| Weights | `best.pt` (5.46 MB) |
|Classes | `break`, `lack`, `scratch` |
| Default Confidence | 0.15 |

---

## License

Open-source under the MIT License.