"use client";
import { useState } from "react";
import FormattedDescription, { descriptionPlainText } from "@/components/ui/FormattedDescription";
export default function ExpandableDescription({ text }: { text: string }) { const [expanded, setExpanded] = useState(false); const canExpand = descriptionPlainText(text).length > 420; return <div><div className={!expanded && canExpand ? "max-h-52 overflow-hidden" : undefined}><FormattedDescription text={text} /></div>{canExpand && <button type="button" onClick={() => setExpanded((current) => !current)} className="mt-4 text-sm font-bold text-[#006B2C] underline-offset-4 hover:underline dark:text-[#00C83A]" aria-expanded={expanded}>{expanded ? "Read less" : "Read more"}</button>}</div>; }
