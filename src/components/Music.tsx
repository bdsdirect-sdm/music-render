import { useEffect, useState, useRef } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import * as Tone from "tone";
import "bootstrap/dist/css/bootstrap.min.css";

const Music = () => {
  const [osmd, setOsmd] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState<number | null>(null); // Updated to null initially
  const intervalRef = useRef<any>(null);
  const synth = new Tone.Synth().toDestination();

  useEffect(() => {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const osmdContainer = document.getElementById("osmdContainer");

    if (!fileInput || !osmdContainer) return;

    const handleFileInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          renderMusicXML(e.target.result as string);
        }
      };
      reader.readAsText(file);
    };

    fileInput.addEventListener("change", handleFileInput);

    function renderMusicXML(xmlContent: string) {
      const newOsmd = new OpenSheetMusicDisplay("osmdContainer", {
        backend: "svg",
        drawTitle: false,
        drawPartNames: false,
      });

      newOsmd
        .load(xmlContent)
        .then(() => {
          newOsmd.render();
          (newOsmd.cursor as any).show();
          setOsmd(newOsmd);
          extractTempo(xmlContent);
        })
        .catch((error) => {
          console.error("Error rendering MusicXML:", error);
        });
    }

    function extractTempo(xmlContent: string) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

      // First check for explicit tempo in <sound tempo="...">
      const tempoNode = xmlDoc.querySelector("sound[tempo]");
      let extractedTempo = tempoNode
        ? parseFloat(tempoNode.getAttribute("tempo") || "120")
        : null;

      // If <sound tempo> is missing, check for metronome markings
      if (!extractedTempo) {
        const beatUnit = xmlDoc.querySelector("per-minute");
        if (beatUnit) {
          extractedTempo = parseFloat(beatUnit.textContent || "120");
        }
      }

      setTempo(extractedTempo || 120); // Default to 120 BPM if nothing found
    }

    return () => {
      fileInput.removeEventListener("change", handleFileInput);
      if (intervalRef.current) clearInterval(intervalRef.current);
      synth.dispose();
    };
  }, []);

  const playAnimation = () => {
    if (!osmd) return;

    osmd.cursor.reset();
    (osmd.cursor as any).show();
    setIsPlaying(true);

    const intervalTime = (60 / (tempo || 120)) * 1000; // Convert BPM to milliseconds per beat

    intervalRef.current = setInterval(() => {
      const cursor = osmd.cursor as any;

      if (!cursor.next) {
        cursor.reset();
        cursor.next();
        stopAnimation(); // Stop when reaching the end
      } else {
        cursor.next();
        const currentNote = cursor.currentNote as any;
        if (currentNote && !currentNote.invisible) {
          const noteToPlay = currentNote.pitch.step + currentNote.pitch.octave;
          synth.triggerAttackRelease(noteToPlay, "16n");
        }
      }
    }, intervalTime);
  };

  const stopAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    if (osmd?.cursor) (osmd.cursor as any).hide();
  };

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col text-center">
          <h1 className="display-5 fw-bold">MusicXML Sheet Music Renderer</h1>
        </div>
      </div>

      <div className="row align-items-center mt-4">
        <div className="col-md-4 text-center">
          <input
            id="fileInput"
            type="file"
            accept=".xml,.musicxml"
            className="form-control"
          />
        </div>
        <div className="col-md-8">
          <div
            id="osmdContainer"
            className="border rounded p-4 bg-white shadow"
            style={{
              width: "100vh",
              height: "300px",
              margin: "20px auto",
            }}
          ></div>
        </div>
      </div>

      <div className="row mt-3">
        <div className="col text-center">
          {tempo !== null && <p>Tempo: {tempo} BPM</p>}
          <button
            className={`btn ${
              isPlaying ? "btn-secondary" : "btn-primary"
            } mx-2`}
            onClick={isPlaying ? stopAnimation : playAnimation}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Music;
