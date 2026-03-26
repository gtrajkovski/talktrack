export interface Recording {
  id: string;
  sessionId: string;
  talkId: string;
  slideId: string;
  slideIndex: number;
  audioBlob: Blob;
  mimeType: string;
  duration: number;
  createdAt: number;
}
