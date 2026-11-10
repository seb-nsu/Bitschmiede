// Startbildschirm (S10): Schwierigkeit, Gründer, Seed, Erweitert; Spiel laden.
import { useState } from "react";
import type { Area, DecisionDensity, EndMode, GuideMode, PressRandom, SpaceSetting } from "../../sim/model/types";
import type { NewGameSettings } from "../../sim/game";
import type { T } from "../texts";
import type { ScenarioInfo } from "../useSim";

const AREAS: Area[] = ["gameplay", "grafik", "sound", "story", "technik"];


function randomSeed(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function StartScreen({ onStart, onLoad, presets, goals, scenarios, startYears, t }: {
  onStart: (s: NewGameSettings, seed: string) => void; onLoad: () => void; presets: string[]; goals: string[]; scenarios: ScenarioInfo[]; t: T;
  startYears: { range: [number, number]; quick: number[] };
}) {
  const [seed, setSeed] = useState(randomSeed);
  // Etappe 6c.11: Einstiegsart; geführt zeigt nur das Nötigste und spielt auf „Leicht“.
  const [guide, setGuide] = useState<GuideMode>("gefuehrt");
  const [founder, setFounder] = useState<Area>("gameplay");
  const [preset, setPreset] = useState("normal");
  const [pressRandom, setPressRandom] = useState<PressRandom>("normal");
  const [density, setDensity] = useState<DecisionDensity>("normal");
  const [ironman, setIronman] = useState(false);
  const [space, setSpace] = useState<SpaceSetting>("normal");
  const valid = /^[0-9a-f]{16}$/.test(seed);
  const [goal, setGoal] = useState("");
  const [endMode, setEndMode] = useState<EndMode>("endjahr");
  const [endYear, setEndYear] = useState(2040);
  const [scenario, setScenario] = useState("");
  // S13 AUS-R43: Startprofil Publisher.
  const [profile, setProfile] = useState<"studio" | "publisher">("studio");
  // Etappe 6c.10: freies Startjahr (Garage); Szenarien bringen ihr eigenes Jahr mit, der geführte Start beginnt 1980.
  const [startYear, setStartYear] = useState(startYears.range[0]);
  const chosen = scenarios.find((x) => x.id === scenario) ?? null;
  const yearValid = Number.isInteger(startYear) && startYear >= startYears.range[0] && startYear <= startYears.range[1];
  const endYearValid = Number.isInteger(endYear) && endYear >= 2000 && endYear <= 2100 && endYear > startYear;
  const guided = guide === "gefuehrt";
  const onStartClick = () => onStart(guided
    ? { preset: "leicht", pressRandom: "normal", decisionDensity: "ruhig", founderFocus: founder, ironman: false, space: "normal", longTermGoal: null, endMode: "endjahr", endYear: 2040, scenario: null, guide }
    : { preset, pressRandom, decisionDensity: density, founderFocus: founder, ironman, space, longTermGoal: goal || null, endMode, endYear, scenario: scenario || null, guide, ...(scenario ? {} : { startYear, profile }) }, seed);
  return (
    <section className="panel start">
      <p>{t("app.intro")}</p>
      <fieldset className="presets">
        <legend>{t("start.guide")}</legend>
        {(["gefuehrt", "klassisch", "frei"] as const).map((g) => (
          <label key={g} className={`preset ${guide === g ? "preset-on" : ""}`}>
            <input type="radio" name="guide" checked={guide === g} onChange={() => setGuide(g)} />
            <strong>{t(`start.guide.${g}`)}</strong>
            <span className="small muted">{t(`start.guide.${g}.text`)}</span>
          </label>
        ))}
      </fieldset>
      <label>
        {t("app.founder")}
        <select value={founder} onChange={(e) => setFounder(e.target.value as Area)}>
          {AREAS.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
        </select>
      </label>
      {guided && <p className="small muted">{t("start.guide.easy")}</p>}
      {!guided && <>
      <fieldset className="presets">
        <legend>{t("start.preset")}</legend>
        {presets.map((p) => (
          <label key={p} className={`preset ${preset === p ? "preset-on" : ""}`}>
            <input type="radio" name="preset" checked={preset === p} onChange={() => setPreset(p)} />
            <strong>{t(`preset.${p}`)}</strong>
            <span className="small muted">{t(`preset.${p}.text`)}</span>
          </label>
        ))}
      </fieldset>
      <label title={t("start.scenario.hint")}>
        {t("start.scenario")}
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="">{t("start.scenario.none")}</option>
          {scenarios.map((x) => <option key={x.id} value={x.id}>{t(`scenario.${x.id}`)} ({x.startYear}–{x.deadlineYear})</option>)}
        </select>
      </label>
      {!chosen && (
        <label>
          {t("start.profile")}{" "}
          <select value={profile} onChange={(e) => setProfile(e.target.value as "studio" | "publisher")}>
            <option value="studio">{t("start.profile.studio")}</option>
            <option value="publisher">{t("start.profile.publisher")}</option>
          </select>
        </label>
      )}
      {!chosen && (
        <fieldset className="start-year">
          <legend>{t("start.year")}</legend>
          <input type="number" min={startYears.range[0]} max={startYears.range[1]} value={startYear} aria-invalid={!yearValid}
            onChange={(e) => setStartYear(Number(e.target.value))} />{" "}
          {startYears.quick.map((y) => (
            <button key={y} type="button" className={startYear === y ? "on" : ""} aria-pressed={startYear === y} onClick={() => setStartYear(y)}>{y}</button>
          ))}
          <p className="small muted">{t("start.year.hint", { from: startYears.range[0], to: startYears.range[1] })}</p>
        </fieldset>
      )}
      {chosen ? <p className="small scenario-brief">{t(`scenario.${chosen.id}.text`)} <strong>{t(`scenario.${chosen.id}.goal`, { year: chosen.deadlineYear })}</strong></p> : (
        <label title={goal ? t(`goal.${goal}.hint`) : t("start.goal.hint")}>
          {t("start.goal")}
          <select value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">{t("start.goal.none")}</option>
            {goals.map((g) => <option key={g} value={g}>{t(`goal.${g}`)}</option>)}
          </select>
        </label>
      )}
      <label>
        {t("app.seed")}
        <input value={seed} onChange={(e) => setSeed(e.target.value.toLowerCase())} maxLength={16} className="mono" aria-invalid={!valid} />
      </label>
      <details className="advanced">
        <summary>{t("start.advanced")}</summary>
        <label>
          {t("start.pressRandom")}
          <select value={pressRandom} onChange={(e) => setPressRandom(e.target.value as PressRandom)}>
            {(["aus", "gering", "normal"] as const).map((v) => <option key={v} value={v}>{t(`start.pressRandom.${v}`)}</option>)}
          </select>
        </label>
        <label>
          {t("start.density")}
          <select value={density} onChange={(e) => setDensity(e.target.value as DecisionDensity)}>
            {(["ruhig", "normal", "dicht"] as const).map((v) => <option key={v} value={v}>{t(`start.density.${v}`)}</option>)}
          </select>
        </label>
        <label title={t("start.space.hint")}>
          {t("start.space")}
          <select value={space} onChange={(e) => setSpace(e.target.value as SpaceSetting)}>
            {(["grosszuegig", "normal", "knapp"] as const).map((v) => <option key={v} value={v}>{t(`start.space.${v}`)}</option>)}
          </select>
        </label>
        {!chosen && <label title={t("start.endMode.hint")}>
          {t("start.endMode")}
          <select value={endMode} onChange={(e) => setEndMode(e.target.value as EndMode)}>
            {(["endjahr", "zielbedingung", "offen"] as const).map((v) => <option key={v} value={v}>{t(`start.endMode.${v}`)}</option>)}
          </select>
        </label>}
        {!chosen && endMode === "endjahr" && (
          <label>
            {t("start.endYear")}
            <input type="number" min={2000} max={2100} value={endYear} onChange={(e) => setEndYear(Number(e.target.value))} aria-invalid={!endYearValid} />
          </label>
        )}
        <p className="small muted">{t("start.noLock")}</p>
        <label className="check">
          <input type="checkbox" checked={ironman} onChange={(e) => setIronman(e.target.checked)} />
          {t("start.ironman")}
        </label>
        <p className="small muted">{t("start.ironman.text")}</p>
      </details>
      </>}
      <div className="start-actions">
        <button type="button" className="primary" disabled={!valid || (!guided && (!endYearValid || (!chosen && !yearValid)))} onClick={onStartClick}>{t("app.start")}</button>
        <button type="button" onClick={onLoad}>{t("save.openLoad")}</button>
      </div>
    </section>
  );
}
