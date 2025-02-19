import { useState } from "react";
import Music from "./components/Music";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Music />
    </>
  );
}

export default App;
