import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";

const KEY = "entrelinha-lamp";

export function Lamp() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.dataset.lamp === "night");
  }, []);

  function toggle() {
    const next = night ? "day" : "night";
    document.documentElement.dataset.lamp = next;
    localStorage.setItem(KEY, next);
    setNight(next === "night");
  }

  return (
    <button
      type="button"
      className="lamp-btn"
      onClick={toggle}
      aria-pressed={night}
      aria-label={night ? "Voltar pra luz do dia" : "Acender a lamparina"}
    >
      {night ? <SunMedium className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
