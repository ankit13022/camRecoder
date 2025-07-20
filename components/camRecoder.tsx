"use client";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function CameraRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const chunks = useRef<Blob[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models/face-api");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models/face-api");
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };
    loadModels();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            detectFace();
          };
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (!canvasRef.current || recording) return;

    setRecording(true);
    chunks.current = [];

    const canvasStream = canvasRef.current.captureStream(30);
    mediaRecorderRef.current = new MediaRecorder(canvasStream, {
      mimeType: "video/webm",
    });

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideo(url);
    };

    mediaRecorderRef.current.start(100);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !recording) return;

    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const detect = async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const drawBoxOptions = {
          label: "Face",
          boxColor: "green",
          lineWidth: 3,
        };
        resizedDetections.forEach((det) => {
          const box = new faceapi.draw.DrawBox(
            det.detection.box,
            drawBoxOptions
          );
          box.draw(canvas);
        });

        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="rounded-lg shadow-lg w-full h-auto"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-auto pointer-events-none"
        />
      </div>

      <div className="mt-4 flex gap-4">
        {!recording ? (
          <button
            onClick={startRecording}
            className="bg-green-500 hover:bg-green-600 px-6 py-2 text-white rounded-lg transition-colors"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 px-6 py-2 text-white rounded-lg transition-colors"
          >
            Stop Recording
          </button>
        )}
      </div>

      {recordedVideo && (
        <div className="mt-6 w-full max-w-4xl">
          <h2 className="text-lg font-bold mb-2">Recorded Video:</h2>
          <video
            src={recordedVideo}
            controls
            className="w-full rounded-lg mb-2"
          />
          <a
            href={recordedVideo}
            download="face-recording.webm"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-block transition-colors"
          >
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}
