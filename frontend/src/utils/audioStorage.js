/**
 * src/utils/audioStorage.js
 * In-memory storage utility for emergency audio recordings to prevent localStorage crash.
 * Generates temporary shareable reference IDs for SMS payloads.
 */

const recordings = [];
const audioBlobs = new Map();

export function getRecordings() {
  return recordings;
}

export function getAudioBlob(refId) {
  return audioBlobs.get(refId);
}

export function saveRecording(recording) {
  const refId = "ref-" + Math.random().toString(36).substring(2, 11);
  const newRecording = {
    id: refId,
    timestamp: new Date().toISOString(),
    audio_blob_url: recording.audio_blob_url,
    transcript: recording.transcript || "",
    risk_level: recording.risk_level || "HIGH"
  };
  
  if (recording.blob) {
    audioBlobs.set(refId, recording.blob);
  }
  
  recordings.push(newRecording);
  console.log("Audio recording saved successfully in memory with ref ID:", refId);
  return newRecording;
}
