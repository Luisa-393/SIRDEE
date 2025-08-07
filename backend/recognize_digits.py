import cv2
from ultralytics import YOLO

def detect_digits(image_or_path, model_path):
    model = YOLO(model_path)
    if isinstance(image_or_path, str):
        image = cv2.imread(image_or_path)
    else:
        image = image_or_path.copy()

    if image is None:
        return None

    results = model(image)
    digit_boxes = []

    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            digit = r.names[cls] if hasattr(r, 'names') else str(cls)
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            digit_boxes.append((x1, digit))

    digit_boxes.sort(key=lambda x: x[0])
    digits = [d[1] for d in digit_boxes]

    if digits:
        try:
            return int(''.join(digits))
        except ValueError:
            return None
    else:
        return None
