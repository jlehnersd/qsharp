// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { QscEventTarget, VSDiagnostic } from "qsharp-lang";

function formatComplex(real: number, imag: number) {
  // Format -0 as 0
  // Also using Unicode Minus Sign instead of ASCII Hyphen-Minus
  // and Unicode Mathematical Italic Small I instead of ASCII i.
  const r = `${real <= -0.00005 ? "−" : " "}${Math.abs(real).toFixed(4)}`;
  const i = `${imag <= -0.00005 ? "−" : "+"}${Math.abs(imag).toFixed(4)}𝑖`;
  return `${r}${i}`;
}

export function createDebugConsoleEventTarget(
  out: (message: string) => void,
  captureEvents: boolean = false,
) {
  const eventTarget = new QscEventTarget(captureEvents);

  eventTarget.addEventListener("Message", (evt) => {
    out(evt.detail + "\n");
  });

  eventTarget.addEventListener("DumpMachine", (evt) => {
    function formatProbabilityPercent(real: number, imag: number) {
      const probabilityPercent = (real * real + imag * imag) * 100;
      return `${probabilityPercent.toFixed(4)}%`;
    }

    function formatPhase(real: number, imag: number) {
      const phase = Math.atan2(imag, real);
      return phase.toFixed(4);
    }

    const stateTable = evt.detail.state;
    const qubitCount = evt.detail.qubitCount;
    const basisStates = Object.keys(stateTable);
    const basisColumnWidth = Math.max(
      basisStates[0]?.length ?? 0,
      "Basis".length,
    );
    const basis = "Basis".padEnd(basisColumnWidth);

    let out_str = "";
    out_str += ` ${basis} | Amplitude      | Probability | Phase\n`;
    out_str +=
      " ".padEnd(basisColumnWidth, "-") +
      "-------------------------------------------\n";

    if (qubitCount === 0) {
      out_str += " No qubits allocated\n";
    } else {
      for (const row of basisStates) {
        const [real, imag] = stateTable[row];
        const basis = row.padStart(basisColumnWidth);
        const amplitude = formatComplex(real, imag).padStart(16);
        const probability = formatProbabilityPercent(real, imag).padStart(11);
        const phase = formatPhase(real, imag).padStart(8);

        out_str += ` ${basis} | ${amplitude} | ${probability} | ${phase}\n`;
      }
    }
    out(out_str);
  });

  eventTarget.addEventListener("Matrix", (evt) => {
    const out_str = evt.detail.matrix
      .map((row) =>
        row.map((entry) => formatComplex(entry[0], entry[1])).join(", "),
      )
      .join("\n");

    out(out_str + "\n");
  });

  eventTarget.addEventListener("Result", (evt) => {
    // sometimes these are VS Diagnostics
    if ((evt.detail.value as VSDiagnostic).message !== undefined) {
      out(`${(evt.detail.value as VSDiagnostic).message}`);
    } else {
      out(`${evt.detail.value}`);
    }
  });

  return eventTarget;
}
