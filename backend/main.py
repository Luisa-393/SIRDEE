from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import shutil
import cv2
import uuid
from recognize_digits import detect_digits

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.post("/procesar")
async def procesar_video(
    video: UploadFile = File(...),
    modelo: UploadFile = File(...),
    intervalo_ms: int = Form(...)
):
    video_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}_{video.filename}")
    model_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}_{modelo.filename}")

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    with open(model_path, "wb") as f:
        shutil.copyfileobj(modelo.file, f)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    interval_frames = int((intervalo_ms / 1000.0) * fps)

    results = []
    frame_num = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_num % interval_frames == 0:
            number = detect_digits(frame, model_path)
            results.append({
                "frame": frame_num,
                "resultado": str(number) if number is not None else "No detectado"
            })

        frame_num += 1

    cap.release()
    os.remove(video_path)
    os.remove(model_path)

    return JSONResponse(content={"resultados": results})
