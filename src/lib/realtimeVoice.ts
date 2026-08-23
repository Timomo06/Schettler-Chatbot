export type RealtimeVoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export type RealtimeServerEvent = {
  type?: string;
  [key: string]: unknown;
};

export type RealtimeAudioSource = "user" | "assistant";

type RealtimeVoiceClientOptions = {
  tenant?: string;
  onStatusChange?: (status: RealtimeVoiceStatus) => void;
  onEvent?: (event: RealtimeServerEvent) => void;
  onAudioLevel?: (level: number, source: RealtimeAudioSource) => void;
  onError?: (error: Error) => void;
};

export class RealtimeVoiceClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;

  private inputAudioContext: AudioContext | null = null;
  private inputAudioSource: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private inputAnimationFrame: number | null = null;

  private outputAudioContext: AudioContext | null = null;
  private outputAudioSource: MediaStreamAudioSourceNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private outputAnimationFrame: number | null = null;

  private options: RealtimeVoiceClientOptions;

  constructor(options: RealtimeVoiceClientOptions = {}) {
    this.options = options;
  }

  private setStatus(status: RealtimeVoiceStatus) {
    this.options.onStatusChange?.(status);
  }

  private handleError(error: unknown) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error("Unbekannter Fehler bei der Realtime-Verbindung.");

    console.error("Realtime Voice Fehler:", normalizedError);

    this.setStatus("error");
    this.options.onError?.(normalizedError);
  }

  private startAudioLevelMonitor(
    stream: MediaStream,
    audioSource: RealtimeAudioSource,
  ) {
    if (!this.options.onAudioLevel) return;

    this.stopAudioLevelMonitor(audioSource);

    const context = new AudioContext();
    const sourceNode = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    sourceNode.connect(analyser);

    const timeData = new Uint8Array(analyser.fftSize);
    let smoothedLevel = 0.04;
    let lastEmission = 0;

    if (audioSource === "user") {
      this.inputAudioContext = context;
      this.inputAudioSource = sourceNode;
      this.inputAnalyser = analyser;
    } else {
      this.outputAudioContext = context;
      this.outputAudioSource = sourceNode;
      this.outputAnalyser = analyser;
    }

    void context.resume().catch(() => undefined);

    const draw = (now: number) => {
      if (context.state === "closed") return;

      analyser.getByteTimeDomainData(timeData);

      let sum = 0;

      for (let index = 0; index < timeData.length; index += 1) {
        const sample = (timeData[index] - 128) / 128;
        sum += sample * sample;
      }

      const rms = Math.sqrt(sum / timeData.length);
      const withoutNoise = Math.max(0, rms - 0.012);
      const emphasized = Math.pow(Math.min(1, withoutNoise * 15), 0.72);
      const targetLevel = Math.max(0.025, Math.min(1, emphasized));
      const smoothing = targetLevel > smoothedLevel ? 0.34 : 0.12;

      smoothedLevel += (targetLevel - smoothedLevel) * smoothing;

      // Rund 30 Updates pro Sekunde reichen fuer eine fluessige Darstellung
      // und belasten React beziehungsweise den Browser nicht unnoetig.
      if (now - lastEmission >= 32) {
        lastEmission = now;
        this.options.onAudioLevel?.(smoothedLevel, audioSource);
      }

      const frame = window.requestAnimationFrame(draw);

      if (audioSource === "user") {
        this.inputAnimationFrame = frame;
      } else {
        this.outputAnimationFrame = frame;
      }
    };

    const firstFrame = window.requestAnimationFrame(draw);

    if (audioSource === "user") {
      this.inputAnimationFrame = firstFrame;
    } else {
      this.outputAnimationFrame = firstFrame;
    }
  }

  private stopAudioLevelMonitor(audioSource: RealtimeAudioSource) {
    const isUser = audioSource === "user";
    const animationFrame = isUser
      ? this.inputAnimationFrame
      : this.outputAnimationFrame;
    const sourceNode = isUser
      ? this.inputAudioSource
      : this.outputAudioSource;
    const context = isUser
      ? this.inputAudioContext
      : this.outputAudioContext;

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
    }

    try {
      sourceNode?.disconnect();
    } catch {
      // Der Audio-Knoten kann bereits getrennt worden sein.
    }

    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }

    this.options.onAudioLevel?.(0.025, audioSource);

    if (isUser) {
      this.inputAnimationFrame = null;
      this.inputAnalyser = null;
      this.inputAudioSource = null;
      this.inputAudioContext = null;
    } else {
      this.outputAnimationFrame = null;
      this.outputAnalyser = null;
      this.outputAudioSource = null;
      this.outputAudioContext = null;
    }
  }

  private stopAllAudioLevelMonitors() {
    this.stopAudioLevelMonitor("user");
    this.stopAudioLevelMonitor("assistant");
  }

  async connect() {
    try {
      this.disconnect(false);

      this.setStatus("connecting");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Dieser Browser unterstützt keinen Mikrofonzugriff.");
      }

      const peerConnection = new RTCPeerConnection();
      this.peerConnection = peerConnection;

      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      remoteAudio.setAttribute("playsinline", "true");
      this.remoteAudio = remoteAudio;

      peerConnection.ontrack = async (event) => {
        const remoteStream =
          event.streams[0] || new MediaStream([event.track]);

        remoteAudio.srcObject = remoteStream;
        this.startAudioLevelMonitor(remoteStream, "assistant");

        try {
          await remoteAudio.play();
        } catch (error) {
          console.warn(
            "Automatische Audio-Wiedergabe wurde blockiert:",
            error,
          );
        }
      };

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      this.localStream = localStream;
      this.startAudioLevelMonitor(localStream, "user");

      const audioTrack = localStream.getAudioTracks()[0];

      if (!audioTrack) {
        throw new Error("Es wurde keine Mikrofon-Audiospur gefunden.");
      }

      peerConnection.addTrack(audioTrack, localStream);

      const dataChannel = peerConnection.createDataChannel("oai-events");
      this.dataChannel = dataChannel;

      dataChannel.onopen = () => {
        console.log("✅ Realtime DataChannel verbunden.");
        this.setStatus("connected");
      };

      dataChannel.onmessage = (messageEvent) => {
        try {
          const event = JSON.parse(messageEvent.data) as RealtimeServerEvent;

          console.log("Realtime Event:", event.type, event);
          this.options.onEvent?.(event);
        } catch (error) {
          console.warn("Realtime Event konnte nicht gelesen werden:", error);
        }
      };

      dataChannel.onerror = () => {
        this.handleError(new Error("Fehler im Realtime DataChannel."));
      };

      dataChannel.onclose = () => {
        console.log("Realtime DataChannel geschlossen.");
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;

        console.log("WebRTC Status:", state);

        if (state === "connected") {
          console.log("✅ WebRTC vollständig verbunden.");
        }

        if (state === "failed") {
          this.handleError(
            new Error("Die WebRTC-Verbindung ist fehlgeschlagen."),
          );
        }

        if (state === "closed") {
          this.setStatus("closed");
        }
      };

      const offer = await peerConnection.createOffer();

      if (!offer.sdp) {
        throw new Error("Der Browser konnte kein SDP Offer erzeugen.");
      }

      await peerConnection.setLocalDescription(offer);

      console.log("🎙️ Browser SDP Offer:", {
        length: offer.sdp.length,
        beginning: offer.sdp.slice(0, 40),
      });

      const tenant = this.options.tenant?.trim() || "demo";
      const realtimeUrl = `/api/realtime?tenant=${encodeURIComponent(tenant)}`;

      const response = await fetch(realtimeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          "X-Tenant": tenant,
        },
        body: offer.sdp,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Realtime Session konnte nicht gestartet werden: ${responseText}`,
        );
      }

      if (!responseText.trimStart().startsWith("v=0")) {
        throw new Error("Der Server hat kein gültiges SDP Answer geliefert.");
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: responseText,
      });

      console.log("✅ Realtime WebRTC Verbindung gestartet.");
    } catch (error) {
      this.disconnect(false);
      this.handleError(error);
      throw error;
    }
  }

  send(event: Record<string, unknown>) {
    const dataChannel = this.dataChannel;

    if (!dataChannel || dataChannel.readyState !== "open") {
      console.warn(
        "Realtime Event konnte nicht gesendet werden: DataChannel nicht offen.",
      );

      return false;
    }

    dataChannel.send(JSON.stringify(event));
    return true;
  }

  disconnect(updateStatus = true) {
    this.stopAllAudioLevelMonitors();

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }

      this.localStream = null;
    }

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // Der DataChannel kann bereits geschlossen sein.
      }

      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // Die PeerConnection kann bereits geschlossen sein.
      }

      this.peerConnection = null;
    }

    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }

    if (updateStatus) {
      this.setStatus("closed");
    }
  }
}
