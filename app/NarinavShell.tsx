"use client";

import React, { useEffect, useState } from "react";
import { NarinavHeader, loadOptions } from "./NarinavHeader";
import NarinavClient from "./NarinavClient";
import {
  defaultNarinavOptions,
  type NarinavOptions,
} from "./NarinavOptionsPanel";

export default function NarinavShell() {
  const [options, setOptions] = useState<NarinavOptions>(defaultNarinavOptions);

  useEffect(() => {
    setOptions(loadOptions());
  }, []);

  return (
    <>
      <NarinavHeader options={options} onOptionsChange={setOptions} />
      <NarinavClient options={options} />
    </>
  );
}
