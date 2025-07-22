import CameraRecorder from "../components/camRecoder";

export default function Home() {
  return (
    <main className="flex min-h-screen p-10 flex-col items-center justify-center bg-gray-800">
      <h1 className="text-3xl font-bold mb-6">Face Tracking Recorder</h1>
      <p className="text-lg mb-4">
        Record your face with real-time tracking and download your video.
      </p>

      <CameraRecorder />
    </main>
  );
}
